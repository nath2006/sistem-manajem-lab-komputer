import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {createPresenceRouter} from '../../backend/router/presenceRoutes.js';
import {createPresenceRegistry} from '../../backend/services/presenceRegistry.js';
import {startPresence} from '../../frontend/src/utils/presence.js';

const until=async predicate=>{for(let i=0;i<200;i++){if(predicate())return;await new Promise(r=>setTimeout(r,5));}assert.fail('presence fixture did not settle');};

test('real fetch stream with ephemeral DB-mocked API: two actors update immediately; one tab close never marks the other tab offline',async t=>{
 const registry=createPresenceRegistry();
 // Only this fixture handles synthetic identities. No database driver or credentials.
 const db={query:async(_sql,[id])=>[[{user_id:id,role:'Guru'}]]};
 const auth=(req,res,next)=>{const id={'Bearer actor-one':1,'Bearer actor-two':2}[req.headers.authorization];if(!id)return res.sendStatus(401);req.user={id,role:'Guru',exp:Math.floor(Date.now()/1000)+300};next();};
 const app=express();app.use(express.json());app.use('/school/api/presence',createPresenceRouter(db,auth,{registry}));
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 const baseURL=`http://127.0.0.1:${server.address().port}/school/api`,stops=[],views={};
 const actor=(key,token)=>{const stop=startPresence({token,baseURL,eventTarget:new EventTarget(),onState:s=>{views[key]=s;}});stops.push(stop);return stop;};
 t.after(async()=>{for(const stop of stops)stop();registry.dispose();await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});});
 actor('observer','actor-one');await until(()=>views.observer?.ready);assert.deepEqual(views.observer.onlineUserIds,[1]);
 const closeTabA=actor('second-a','actor-two');await until(()=>views.observer.onlineUserIds.includes(2));
 const closeTabB=actor('second-b','actor-two');await until(()=>views['second-b']?.ready);assert.deepEqual(views.observer.onlineUserIds,[1,2]);
 closeTabA();await until(()=>registry.snapshot().revision>=4);assert.deepEqual(views.observer.onlineUserIds,[1,2]);
 closeTabB();await until(()=>views.observer.onlineUserIds.length===1);assert.deepEqual(views.observer.onlineUserIds,[1]);
});


test('expired initial ACK recovers before old stream EOF, including online and persisted pageshow', async t => {
 let now=1000, releaseAck, ackStarted=false, firstStatus, streams=0, heldEOF=false, view;
 const ackGate=new Promise(resolve=>{releaseAck=resolve;});
 const registry=createPresenceRegistry({now:()=>now,schedule:()=>0,cancel(){}});
 const db={query:async()=>[[{user_id:1,role:'Guru'}]]};
 const auth=(req,res,next)=>{req.user={id:1,role:'Guru',exp:300};next();};
 const app=express();app.use(express.json());app.use('/api/presence',createPresenceRouter(db,auth,{registry,now:()=>now}));
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 const events=new EventTarget();let stop;
 t.after(async()=>{releaseAck();stop?.();registry.dispose();await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});});
 const fetchImpl=async(url,options)=>{
  if(url.endsWith('/heartbeat')&&!ackStarted){
   ackStarted=true;await ackGate;
   const response=await fetch(url,options);await until(()=>heldEOF);firstStatus=response.status;return response;
  }
  const response=await fetch(url,options);
  if(url.endsWith('/stream')&&++streams===1){
   const reader=response.body.getReader();
   // Keep EOF from racing the heartbeat rejection: only cancellation releases it.
   let releaseEOF;
   const body=new ReadableStream({async pull(controller){
    const chunk=await reader.read();
    if(chunk.done){heldEOF=true;await new Promise(resolve=>{releaseEOF=resolve;});return;}
    controller.enqueue(chunk.value);
   },cancel(){releaseEOF?.();return reader.cancel();}});
   return new Response(body,{status:response.status,headers:response.headers});
  }
  return response;
 };
 stop=startPresence({token:'fixture',baseURL:`http://127.0.0.1:${server.address().port}/api`,eventTarget:events,fetchImpl,onState:s=>{view=s;}});
 await until(()=>ackStarted&&view?.ready);
 now=46001;releaseAck();
 await until(()=>firstStatus!==undefined&&!view.ready);
 assert.equal(heldEOF,true,'old EOF is held rather than driving reconnection');
 events.dispatchEvent(new Event('online'));
 await until(()=>view.ready);
 assert.equal(firstStatus,409);
 assert.deepEqual(view.onlineUserIds,[1]);assert.equal(streams,2);
 events.dispatchEvent(new Event('pagehide'));assert.equal(view.ready,false);
 const show=new Event('pageshow');Object.defineProperty(show,'persisted',{value:true});events.dispatchEvent(show);
 await until(()=>view.ready&&streams===3);assert.deepEqual(view.onlineUserIds,[1]);
});
