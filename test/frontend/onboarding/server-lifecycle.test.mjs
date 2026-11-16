import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const React = require('react');
const {act, create} = require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.requestAnimationFrame = fn => setTimeout(fn, 0);
globalThis.cancelAnimationFrame = clearTimeout;
async function harness() {
  const calls = {get:0, claim:0, tours:0, stops:0};
  let seen = false;
  const api = {get:async()=>{calls.get++; return {data:{seen}};}, post:async()=>{calls.claim++; const winner=!seen; seen=true; return {data:{data:{should_show:winner}}};}};
  const tour = {ready:true,startTour:options=>{let stopped=false; const begin=async()=>{if (!stopped && (!options.authorize || await options.authorize()) && !stopped) calls.tours++;}; if(tour.ready) Promise.resolve().then(begin); else tour.begin=begin;return ()=>{stopped=true;calls.stops++;};}};
  globalThis.__onboardingHarness = {api,tour};
  const result=await build({stdin:{contents:"export {default} from './src/Components/Onboarding/Onboarding.jsx'",resolveDir:process.cwd(),loader:'jsx'},bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',external:['react'],plugins:[{name:'adapters',setup(b){b.onLoad({filter:/utils[\\/]api\.js$/},()=>({contents:'export const get=(...args)=>globalThis.__onboardingHarness.api.get(...args); export const post=(...args)=>globalThis.__onboardingHarness.api.post(...args)',loader:'js'}));b.onLoad({filter:/driverTour\.js$/},()=>({contents:'export const startTour=(...args)=>globalThis.__onboardingHarness.tour.startTour(...args)',loader:'js'}));b.onLoad({filter:/SettingsContext\.jsx$/},()=>({contents:'export const useSettings=()=>({settings:{school_name:"Sekolah"}})',loader:'js'}));}}]});
  const mod={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,mod,mod.exports);
  return {Component:mod.exports.default,calls,api,tour};
}
const flush=()=>act(async()=>{await new Promise(resolve=>setTimeout(resolve,0));});
test('GET failure fails closed but manual replay needs no database request',async()=>{
 const {Component,calls,api}=await harness(); api.get=async()=>{throw new Error('offline');};const ref=React.createRef();let root;
 await act(async()=>{root=create(React.createElement(Component,{ref,identity:'A',role:'Guru'}));});await flush();
 assert.equal(calls.tours,0);assert.equal(calls.claim,0);
 await act(async()=>ref.current.replay());await flush();assert.equal(calls.tours,1);assert.equal(calls.claim,0);await act(async()=>root.unmount());
});
test('claim waits for target readiness and an obsolete account cannot start from a delayed GET',async()=>{
 const {Component,calls,api,tour}=await harness();let resolveGet;api.get=()=>new Promise(resolve=>{resolveGet=resolve;});let root;
 await act(async()=>{root=create(React.createElement(Component,{identity:'A',role:'Guru',token:'one'}));});
 const old=resolveGet;
 await act(async()=>root.update(React.createElement(Component,{identity:'B',role:'Guru',token:'two'})));
 await act(async()=>old({data:{seen:false}}));await flush();assert.equal(calls.tours,0);assert.equal(calls.claim,0);
 tour.ready=false;await act(async()=>resolveGet({data:{seen:false}}));await flush();assert.equal(calls.claim,0);
 await act(async()=>tour.begin());assert.equal(calls.claim,1);assert.equal(calls.tours,1);await act(async()=>root.unmount());
});
test('token replacement during an in flight claim never starts the old session',async()=>{
 const {Component,calls,api}=await harness();let resolveClaim;api.post=()=>new Promise(resolve=>{resolveClaim=resolve;});let root;
 await act(async()=>{root=create(React.createElement(Component,{identity:'A',role:'Guru',token:'old'}));});await flush();const old=resolveClaim;
 api.get=async()=>({data:{seen:true}});
 await act(async()=>root.update(React.createElement(Component,{identity:'A',role:'Guru',token:'new'})));
 await act(async()=>old({data:{data:{should_show:true}}}));await flush();assert.equal(calls.tours,0);await act(async()=>root.unmount());
});
test('legacy completion in another role quietly claims without showing',async()=>{
 const {Component,calls}=await harness();globalThis.localStorage={getItem:key=>key.endsWith(':Admin')?'done':null};let root;
 try {await act(async()=>{root=create(React.createElement(Component,{identity:'lab:onboarding:v3:12:Guru',role:'Guru'}));});await flush();assert.equal(calls.claim,1);assert.equal(calls.tours,0);}finally{delete globalThis.localStorage;await act(async()=>root.unmount());}
});
test('mounted StrictMode claims once and server state prevents auto replay after remount while manual replay repeats',async()=>{
 const {Component,calls}=await harness();const ref=React.createRef();let root;
 await act(async()=>{root=create(React.createElement(React.StrictMode,null,React.createElement(Component,{ref,identity:'account A',role:'Guru',token:'one'})));});await flush();
 assert.equal(calls.get,1);assert.equal(calls.claim,1);assert.equal(calls.tours,1);
 await act(async()=>root.unmount());
 await act(async()=>{root=create(React.createElement(Component,{ref,identity:'account A',role:'Guru',token:'two'}));});await flush();
 assert.equal(calls.tours,1);
 await act(async()=>ref.current.replay());await flush();await act(async()=>ref.current.replay());await flush();
 assert.equal(calls.tours,3);assert.equal(calls.claim,1);await act(async()=>root.unmount());
});
