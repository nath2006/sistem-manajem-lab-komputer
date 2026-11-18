import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import express from 'express';
import http from 'node:http';

 test('SSE transport pushes full snapshots and validates owned heartbeat leases with read-only DB', async () => {
  assert.ok(existsSync(new URL('../../backend/router/presenceRoutes.js', import.meta.url)), 'missing SSE router');
  const { createPresenceRouter } = await import('../../backend/router/presenceRoutes.js');
  const { createPresenceRegistry } = await import('../../backend/services/presenceRegistry.js');
  let now = 1000; const users = new Map([[1,'Admin'],[2,'Teknisi']]);
  const registry = createPresenceRegistry({ now: () => now, schedule: () => 0, cancel() {} });
  const db = { async query(sql, [id]) { assert.match(sql, /^SELECT/); return [users.has(id) ? [{ user_id:id, role:users.get(id) }] : []]; } };
  const app = express(); app.use(express.json());
  app.use('/api/presence', createPresenceRouter(db, (req,res,next) => {
    req.user = { id:Number(req.headers.authorization?.split(' ')[1]), exp:100 }; next();
  }, { registry, now: () => now }));
  let auditWrites=0;
  app.use('/api', (req,res,next)=>{auditWrites++;next();});
  const server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening',r));
  const base = `http://127.0.0.1:${server.address().port}/api/presence`;
  const streams = [];
  async function stream(id) {
    return new Promise((resolve,reject) => {
      const request = http.get(`${base}/stream`, { headers:{Authorization:`Bearer ${id}`} }, response => {
        try {
          assert.match(response.headers['content-type'],/^text\/event-stream(?:;|$)/);
          assert.equal(response.headers['cache-control'],'private, no-store');
          assert.equal(response.headers['x-accel-buffering'],'no');
        } catch (err) { request.destroy(); reject(err); return; }
        let text = ''; const events = []; const waiters = [];
        response.on('data', chunk => { text += chunk; let end;
          while ((end = text.indexOf('\n\n')) >= 0) { const frame=text.slice(0,end);text=text.slice(end+2);
            const event=frame.match(/event: (.*)/)?.[1];const data=JSON.parse(frame.match(/data: (.*)/)[1]);events.push({event,data});
            for (const w of [...waiters]) if (w.p(events)) { waiters.splice(waiters.indexOf(w),1); w.r(events); }
          }
        });
        streams.push(request);
        resolve({events, wait(p) { if(p(events))return Promise.resolve(events);return new Promise((r,j)=>{const t=setTimeout(()=>j(new Error('SSE timeout')),2000);waiters.push({p,r:x=>{clearTimeout(t);r(x);}});}); }});
      });request.on('error',reject);
    });
  }
  const post = (id, body) => fetch(`${base}/heartbeat`, {method:'POST',headers:{Authorization:`Bearer ${id}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  try {
    const a=await stream(1);await a.wait(e=>e.some(x=>x.event==='connected'));
    const connection_id=a.events[0].data.connection_id;
    const b=await stream(2);await b.wait(e=>e.some(x=>x.event==='presence'&&x.data.online_user_ids.length===2));
    await a.wait(e=>e.some(x=>x.event==='presence'&&x.data.online_user_ids.length===2));
    assert.equal((await post(1,{connection_id})).status,204);
    const denied=await post(2,{connection_id});assert.equal(denied.status,409);
    const unavailable={code:'PRESENCE_LEASE_UNAVAILABLE',message:'Presence connection unavailable; reconnect'};
    assert.deepEqual(await denied.json(),unavailable);
    assert.equal((await post(1,{connection_id})).status,204,'wrong owner cannot disrupt the owned lease');
    const missing=await post(1,{connection_id:'00000000-0000-4000-8000-000000000000'});
    assert.equal(missing.status,409);assert.deepEqual(await missing.json(),unavailable);
    assert.equal((await post(1,{connection_id,user_id:2})).status,400);
    assert.equal((await fetch(`${base}/stream?token=1`)).status,401);
    const tab=await stream(1);await tab.wait(e=>e.some(x=>x.event==='connected'));
    streams[0].destroy();
    await new Promise(r=>setTimeout(r,25)); assert.equal(registry.isOnline(1),true);
    streams[2].destroy();
    await b.wait(e=>e.some(x=>x.event==='presence'&&x.data.online_user_ids.length===1));
    assert.equal(registry.isOnline(1),false);
    const fresh=await stream(1);await fresh.wait(e=>e.some(x=>x.event==='connected'));
    users.delete(1);assert.equal((await post(1,{connection_id})).status,403);
    assert.deepEqual(registry.snapshot().online_user_ids,[2]);
    now=100000;registry.sweep();assert.deepEqual(registry.snapshot().online_user_ids,[]);
    assert.equal(auditWrites,0);
  } finally { streams.forEach(s=>s.destroy());registry.dispose();server.closeAllConnections();await new Promise(r=>server.close(r)); }
});

test('invalid verified identities and revoked roles cannot connect or renew', async () => {
  const { createPresenceRouter }=await import('../../backend/router/presenceRoutes.js');
  let actor, reads=0;
  const app=express();app.use(express.json());
  const registry={disconnectUser(){},heartbeat(){assert.fail('invalid lease renewed');}};
  const db={async query(){reads++;return [[{user_id:1,role:'Guru'}]];}};
  app.use('/api/presence',createPresenceRouter(db,(req,res,next)=>{req.user=actor;next();},{registry,now:()=>1000}));
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${server.address().port}/api/presence`;
  try {
    for(actor of [null,{}, {id:'1',exp:100},{id:-1,exp:100},{id:1},{id:1,exp:1},{id:1,exp:Infinity}]) {
      for(const path of ['/stream','/heartbeat'])assert.equal((await fetch(base+path,{method:path==='/stream'?'GET':'POST',headers:{Authorization:'Bearer fixture'}})).status,401);
    }
    assert.equal(reads,0);
    actor={id:1,exp:100,role:'Admin'};
    for(const path of ['/stream','/heartbeat'])assert.equal((await fetch(base+path,{method:path==='/stream'?'GET':'POST',headers:{Authorization:'Bearer fixture'}})).status,403);
  } finally {server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('expiry, ACK renewal, bounded connections and failed backpressure clean up', async () => {
  const { createPresenceRegistry } = await import('../../backend/services/presenceRegistry.js');
  let now=0, tick, cancelled=false, closes=0;
  const r=createPresenceRegistry({now:()=>now,schedule:(fn,ms)=>{tick=fn;assert.equal(ms,15000);return 1;},cancel:()=>{cancelled=true;},maxConnections:2,maxPerUser:1});
  const events=[];
  const a=r.connect({userId:1,expiresAt:20000,send:(e,d)=>{events.push([e,d]);return true;},close:()=>closes++});
  assert.throws(()=>r.connect({userId:1,expiresAt:50000,send(){},close(){}}),e=>e.status===429);
  now=15000;tick();assert.equal(events.at(-1)[0],'ping');assert.equal(r.heartbeat(a,1),true);
  now=20000;tick();assert.equal(r.isOnline(1),false);assert.equal(closes,1);
  const b=r.connect({userId:2,expiresAt:200000,send:()=>true,close:()=>closes++});
  now=60000;assert.equal(r.heartbeat(b,2),true);
  now=104999;assert.equal(r.isOnline(2),true);
  now=105000;tick();assert.equal(r.isOnline(2),false);
  r.connect({userId:3,expiresAt:200000,send:()=>false,close:()=>closes++});assert.equal(r.isOnline(3),false);
  r.dispose();assert.equal(cancelled,true);assert.equal(closes,3);
});

test('process-local presence registry exists rather than persisted login flags', async () => {
  assert.ok(existsSync(new URL('../../backend/services/presenceRegistry.js', import.meta.url)), 'missing authoritative connection registry');
  const { createPresenceRegistry } = await import('../../backend/services/presenceRegistry.js');
  let now = 1000;
  const r = createPresenceRegistry({ now: () => now, schedule: () => ({ unref() {} }), cancel: () => {} });
  const events = [];
  const a = r.connect({ userId: 1, expiresAt: 100000, send: (e,d) => { events.push([e,d]); return true; }, close() {} });
  const b = r.connect({ userId: 1, expiresAt: 100000, send: () => true, close() {} });
  const c = r.connect({ userId: 2, expiresAt: 100000, send: () => true, close() {} });
  assert.deepEqual(r.snapshot().online_user_ids, [1,2]);
  assert.equal(events[0][0], 'connected');
  assert.equal(events[0][1].heartbeat_interval_ms, 15000);
  assert.equal(r.heartbeat(a, 2), false);
  r.disconnect(a); assert.equal(r.isOnline(1), true);
  r.disconnect(b); assert.equal(r.isOnline(1), false);
  now = 46000; r.sweep(); assert.deepEqual(r.snapshot().online_user_ids, []);
  assert.equal(r.heartbeat(c,2), false);
  r.dispose();
});
