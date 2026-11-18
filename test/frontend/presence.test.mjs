import test from 'node:test';
import assert from 'node:assert/strict';
const tick=()=>new Promise(r=>setImmediate(r));
const connection={connection_id:'12345678-1234-4234-8234-123456789abc',heartbeat_interval_ms:15000,lease_timeout_ms:45000};
async function fixture(t,fetchOverride){
 const {startPresence}=await import(new URL('../../frontend/src/utils/presence.js',import.meta.url));
 const target=new EventTarget(),requests=[],states=[],timers=new Map();
 const oldSet=globalThis.setTimeout,oldClear=globalThis.clearTimeout;
 globalThis.setTimeout=(fn,ms)=>{const key=Symbol();timers.set(key,{fn,ms});return key;};globalThis.clearTimeout=key=>timers.delete(key);
 const fetchImpl=fetchOverride|| (async(url,options)=>{if(url.endsWith('/heartbeat')){requests.push({url,options});return new Response(null,{status:204});}let controller;const stream=new ReadableStream({start(c){controller=c;}});requests.push({url,options,controller});return new Response(stream,{headers:{'content-type':'text/event-stream'}});});
 const stop=startPresence({token:'synthetic',baseURL:'/prefix/api',eventTarget:target,fetchImpl,onState:s=>states.push(s),online:()=>true});
 t.after(()=>{stop();globalThis.setTimeout=oldSet;globalThis.clearTimeout=oldClear;});await tick();
 return {requests,states,timers,target,stop,send:async(event,payload)=>{requests.findLast(r=>r.controller).controller.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));await tick();}};
}
test('disconnect becomes unknown; offline cancels ACK and reader, online reconnect restores full snapshot',async t=>{
 const h=await fixture(t);await h.send('connected',connection);await h.send('presence',{online_user_ids:[1,2],revision:1});
 h.target.dispatchEvent(new Event('offline'));assert.equal(h.states.at(-1).ready,false);assert.equal(h.requests[0].options.signal.aborted,true);
 h.target.dispatchEvent(new Event('online'));await tick();await h.send('connected',connection);await h.send('presence',{online_user_ids:[2],revision:2});assert.deepEqual(h.states.at(-1).onlineUserIds,[2]);
 h.target.dispatchEvent(new Event('pagehide'));assert.equal(h.states.at(-1).ready,false);assert.equal(h.timers.size,0);
 const hiddenConnections=h.requests.filter(r=>r.controller).length;h.target.dispatchEvent(new Event('online'));await tick();assert.equal(h.requests.filter(r=>r.controller).length,hiddenConnections,'pagehide must remain suspended until pageshow');
 const event=new Event('pageshow');event.persisted=true;h.target.dispatchEvent(event);await tick();assert.equal(h.requests.filter(r=>r.controller).length,3);h.stop();assert.equal(h.timers.size,0);
});
for (const status of [401,403]) test(`terminal ${status} authorization refusal never reconnects on online or pageshow`,async t=>{
 let calls=0;const h=await fixture(t,async()=>{calls++;return new Response(null,{status});});assert.equal(calls,1);assert.equal(h.timers.size,0);h.target.dispatchEvent(new Event('online'));await tick();assert.equal(calls,1);assert.equal(h.states.at(-1).ready,false);
});
test('invalid UUIDs and malformed snapshots cannot establish authoritative online status',async t=>{
 const h=await fixture(t);await h.send('connected',{...connection,connection_id:'invalid'});await h.send('presence',{online_user_ids:[1],revision:1});assert.equal(h.states.at(-1).ready,false);
 await h.send('connected',connection);for(const payload of [null,{online_user_ids:['1'],revision:1},{online_user_ids:[-1],revision:1},{online_user_ids:[1],revision:'1'}])await h.send('presence',payload);assert.equal(h.states.at(-1).ready,false);
 await h.send('presence',{online_user_ids:[1],revision:2});await h.send('presence',{online_user_ids:[2],revision:1});assert.deepEqual(h.states.at(-1).onlineUserIds,[1]);
});
test('network retries use bounded exponential backoff and stop removes the retry',async t=>{
 let calls=0;const h=await fixture(t,async()=>{calls++;throw new Error('synthetic network loss');});
 for(const delay of [1000,2000,4000,8000,16000,30000,30000]){const entry=[...h.timers.entries()].find(([,v])=>v.ms===delay);assert.ok(entry,`retry ${delay}`);h.timers.delete(entry[0]);entry[1].fn();await tick();}
 assert.equal(calls,8);h.stop();assert.equal(h.timers.size,0);
});
test('oversized incomplete SSE frames are bounded and reconnect as unknown',async t=>{
 const h=await fixture(t);await h.send('connected',connection);await h.send('presence',{online_user_ids:[1],revision:1});h.requests.find(r=>r.controller).controller.enqueue(new TextEncoder().encode('data: '+ 'x'.repeat(262145)));await tick();assert.equal(h.states.at(-1).ready,false);assert.equal(h.requests[0].options.signal.aborted,true);
});
test('server ping triggers another ACK with only its connection ID, and cleanup aborts ACK requests',async t=>{
 const h=await fixture(t);await h.send('connected',connection);assert.equal(h.requests.filter(r=>r.url.endsWith('/heartbeat')).length,1);await h.send('ping',{});const acks=h.requests.filter(r=>r.url.endsWith('/heartbeat'));assert.equal(acks.length,2);assert.deepEqual(JSON.parse(acks[1].options.body),{connection_id:connection.connection_id});h.stop();assert.ok(acks.every(r=>r.options.signal.aborted));
});
test('reconnecting immediately invalidates the last snapshot until the new stream is ready',async t=>{
 const h=await fixture(t);await h.send('connected',connection);await h.send('presence',{online_user_ids:[1],revision:1});h.target.dispatchEvent(new Event('online'));assert.equal(h.states.at(-1).ready,false);assert.deepEqual(h.states.at(-1).onlineUserIds,[]);
});
test('negative revisions and non-v4 connection identities cannot authorize a snapshot',async t=>{
 const h=await fixture(t);await h.send('connected',{...connection,connection_id:'12345678-1234-1234-1234-123456789abc'});await h.send('presence',{online_user_ids:[1],revision:1});assert.equal(h.states.at(-1).ready,false);
 await h.send('connected',connection);await h.send('presence',{online_user_ids:[1],revision:-1});assert.equal(h.states.at(-1).ready,false);
});
test('silent half-open connection expires to unknown with a bounded reconnect instead of stale online state',async t=>{
 const h=await fixture(t);await h.send('connected',connection);await h.send('presence',{online_user_ids:[1],revision:1});const lease=[...h.timers.values()].find(v=>v.ms===45000);assert.ok(lease,'server lease watchdog must exist');lease.fn();await tick();assert.equal(h.states.at(-1).ready,false);assert.equal(h.requests[0].options.signal.aborted,true);assert.ok([...h.timers.values()].some(v=>v.ms===1000));
});


test('presence transport parses chunked CRLF multiline snapshots and ACKs server pings using header auth', async t => {
 const { startPresence } = await import(new URL('../../frontend/src/utils/presence.js', import.meta.url));
 let controller; const calls=[]; const states=[];
 const stream=new ReadableStream({start(c){controller=c;}});
 const stop=startPresence({token:'synthetic',baseURL:'/school/api/',fetchImpl:async(url,options)=>{calls.push({url,options});return url.endsWith('/stream')?new Response(stream,{headers:{'content-type':'text/event-stream'}}):new Response(null,{status:204});},onState:s=>states.push(s),eventTarget:new EventTarget()});
 t.after(stop);
 await new Promise(r=>setTimeout(r,0));
 const emit=s=>controller.enqueue(new TextEncoder().encode(s));
 emit('event: connected\r\ndata: {"connection_id":"12345678-1234-4234-8234-123456789abc","heartbeat_interval_ms":15000,"lease_timeout_ms":45000}\r\n\r\nevent: pres');
 emit('ence\r\ndata: {"online_user_ids":[1,2],\r\ndata: "revision":1}\r\n\r\n: comment\r\n\r\nevent: ping\r\ndata: {}\r\n\r\n');
 await new Promise(r=>setTimeout(r,10));
 assert.deepEqual(states.at(-1),{connected:true,ready:true,onlineUserIds:[1,2]});
 assert.equal(calls[0].url,'/school/api/presence/stream');
 assert.equal(calls[0].options.headers.Authorization,'Bearer synthetic');
 assert.equal(calls[0].options.credentials,'omit');
 assert.ok(calls.some(c=>c.url.endsWith('/heartbeat')&&JSON.parse(c.options.body).connection_id==='12345678-1234-4234-8234-123456789abc'));
 stop(); assert.equal(calls[0].options.signal.aborted,true);
});
