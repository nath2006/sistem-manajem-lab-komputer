import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url), React=require('react'), {act,create}=require('react-test-renderer');
async function components(){
 const result=await build({stdin:{contents:"export {PresenceProvider,usePresence} from './src/Context/PresenceContext.jsx'; export {AuthContext} from './src/Context/AuthContext.jsx';",resolveDir:new URL('../../frontend/',import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1'),loader:'jsx'},bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',external:['react','react/jsx-runtime'],define:{'import.meta.env':'{}'},plugins:[{name:'api',setup(b){b.onResolve({filter:/utils\/api$/},()=>({path:'api',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export default {defaults:{baseURL:"/school/api"}};'}));}}]});
 const m={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,m,m.exports);return m.exports;
}
const uuid='12345678-1234-4234-8234-123456789abc';

test('StrictMode keeps only one active global connection and ignores late old stream responses after account replacement',async t=>{
 const {PresenceProvider,usePresence,AuthContext}=await components();
 const oldFetch=globalThis.fetch,oldWindow=globalThis.window;
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.window=new EventTarget();
 const requests=[];globalThis.fetch=(url,options)=>{if(url.endsWith('/heartbeat'))return Promise.resolve(new Response(null,{status:204}));return new Promise(resolve=>requests.push({options,resolve}));};
 let view,renderer;function Probe(){view=usePresence();return null;}
 const element=state=>React.createElement(React.StrictMode,null,React.createElement(AuthContext.Provider,{value:{state}},React.createElement(PresenceProvider,null,React.createElement(Probe))));
 t.after(async()=>{if(renderer)await act(async()=>renderer.unmount());globalThis.fetch=oldFetch;globalThis.window=oldWindow;delete globalThis.IS_REACT_ACT_ENVIRONMENT;});
 await act(async()=>{renderer=create(element({isAuthenticated:true,userId:1,token:'synthetic-one'}));});
 assert.equal(requests.filter(r=>!r.options.signal.aborted).length,1);
 const old=requests.at(-1);
 await act(async()=>renderer.update(element({isAuthenticated:true,userId:2,token:'synthetic-two'})));
 assert.equal(old.options.signal.aborted,true);assert.equal(view.ready,false);
 let cancelled=false;
 await act(async()=>old.resolve(new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(`event: connected\ndata: ${JSON.stringify({connection_id:uuid,heartbeat_interval_ms:15000,lease_timeout_ms:45000})}\n\nevent: presence\ndata: {"online_user_ids":[1],"revision":1}\n\n`));},cancel(){cancelled=true;}}),{headers:{'content-type':'text/event-stream'}})));
 assert.equal(cancelled,true);assert.equal(view.ready,false);assert.deepEqual(view.onlineUserIds,[]);
 await act(async()=>renderer.unmount());const total=requests.length;window.dispatchEvent(new Event('online'));assert.equal(requests.length,total);assert.ok(requests.every(r=>r.options.signal.aborted));renderer=null;
});

test('mounted global provider applies full snapshots without fetching a roster and rejects old auth frames; logout aborts',async t=>{
 const {PresenceProvider,usePresence,AuthContext}=await components();
 const oldFetch=globalThis.fetch, oldWindow=globalThis.window;
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.window=new EventTarget();
 const requests=[];globalThis.fetch=async(url,options)=>{if(url.endsWith('/heartbeat'))return new Response(null,{status:204});let controller;const stream=new ReadableStream({start(c){controller=c;}});requests.push({url,options,controller});return new Response(stream,{headers:{'content-type':'text/event-stream'}});};
 let view, renderer;function Probe(){view=usePresence();return null;}
 const auth={isAuthenticated:true,userId:1,token:'synthetic-a'};
 const element=state=>React.createElement(AuthContext.Provider,{value:{state}},React.createElement(PresenceProvider,null,React.createElement(Probe)));
 t.after(async()=>{if(renderer)await act(async()=>renderer.unmount());globalThis.fetch=oldFetch;globalThis.window=oldWindow;delete globalThis.IS_REACT_ACT_ENVIRONMENT;});
 await act(async()=>{renderer=create(element(auth));});
 const send=async(index,event,payload)=>act(async()=>{requests[index].controller.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));});
 await send(0,'connected',{connection_id:uuid,heartbeat_interval_ms:15000,lease_timeout_ms:45000});
 await send(0,'presence',{online_user_ids:[1,2],revision:1});assert.deepEqual(view.onlineUserIds,[1,2]);assert.equal(view.ready,true);
 await send(0,'presence',{online_user_ids:[2],revision:2});assert.deepEqual(view.onlineUserIds,[2]);assert.equal(requests.length,1);
 await act(async()=>renderer.update(element({...auth,token:'synthetic-b'})));assert.equal(view.ready,false);assert.deepEqual(view.onlineUserIds,[]);assert.equal(requests[0].options.signal.aborted,true);
 await send(1,'connected',{connection_id:uuid,heartbeat_interval_ms:15000,lease_timeout_ms:45000});await send(1,'presence',{online_user_ids:[1],revision:3});assert.deepEqual(view.onlineUserIds,[1]);
 await act(async()=>renderer.update(element({isAuthenticated:false})));assert.equal(view.ready,false);assert.equal(requests[1].options.signal.aborted,true);
});
