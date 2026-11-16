import test from 'node:test';
import assert from 'node:assert/strict';
import { renderUI } from '../helpers/renderUI.js';

const load = () => renderUI(`import {startTour} from './src/Components/Onboarding/driverTour.js'; module.exports=startTour;`);
function environment() {
  const frames = new Map(); let id = 0; const events = [], writes = [], focus = [];
  const target = {isConnected:true,focus:()=>focus.push('original')};
  const sidebar = {isConnected:true,scrollTop:37};
  Object.assign(globalThis, {
    document: {activeElement:target,querySelectorAll:()=>[sidebar],dispatchEvent:event=>events.push(event.detail),querySelector:()=>null},
    window: {scrollX:0,scrollY:123,scrollTo:(...args)=>events.push(args)},
    requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},
    cancelAnimationFrame:key=>frames.delete(key),
    CustomEvent:class {constructor(type,{detail}){this.type=type;this.detail=detail;}},
    localStorage: {setItem:(...args)=>writes.push(args)},
  });
  return {frames,events,writes,focus,sidebar};
}
test('disconnected replay control restores focus to connected profile trigger', async () => {
  const startTour=await load(); const env=environment();
  globalThis.document.activeElement.isConnected=false;
  globalThis.document.querySelector=()=>({isConnected:true,focus:()=>env.focus.push('profile')});
  try {
    startTour({identity:'account-A',role:'Guru'})();
    assert.deepEqual(env.focus,['profile']);
    assert.deepEqual(env.writes,[]);
  } finally {restore();}
});

test('non-focusable body falls back to profile after an automatic tour', async () => {
  const startTour=await load(); const env=environment();
  globalThis.document.activeElement.tagName='BODY';
  globalThis.document.querySelector=()=>({isConnected:true,focus:()=>env.focus.push('profile')});
  try {
    startTour({identity:'account-A',role:'Guru'})();
    assert.deepEqual(env.focus,['profile']);
  } finally {restore();}
});

test('missing targets never authorize or move focus or scroll', async () => {
  const startTour=await load(); const env=environment(); let claims=0;
  try {
    startTour({identity:'A',role:'Guru',authorize:async()=>{claims++;return true;}});
    while(env.frames.size) {const entries=[...env.frames];env.frames.clear(); for(const [,fn] of entries) fn();}
    assert.equal(claims,0);
    assert.deepEqual(env.focus,[]);
    assert.equal(env.events.some(Array.isArray),false);
  } finally {restore();}
});

test('lost or rejected claims never open Driver or move focus and scroll', async () => {
  for (const rejected of [false, true]) {
    const startTour=await load(); const env=environment(); let claims=0;
    globalThis.getComputedStyle=()=>({visibility:'visible',display:'block'});
    globalThis.document.querySelector=()=>({closest:()=>null,getClientRects:()=>[{}]});
    try {
      startTour({identity:'A',role:'Guru',authorize:async()=>{claims++;if(rejected)throw new Error('offline');return false;}});
      while(env.frames.size) {const entries=[...env.frames];env.frames.clear();for(const [,fn] of entries)fn();await Promise.resolve();}
      await Promise.resolve();
      assert.equal(claims,1);assert.deepEqual(env.focus,[]);assert.deepEqual(env.writes,[]);assert.equal(env.events.some(Array.isArray),false);
    } finally {delete globalThis.getComputedStyle;restore();}
  }
});

const restore = () => {for(const key of ['document','window','requestAnimationFrame','cancelAnimationFrame','CustomEvent','localStorage']) delete globalThis[key];};

test('cleanup before delayed startup cancels every frame, restores scroll/focus and never completes', async () => {
  const startTour=await load(); const env=environment();
  try {
    const stop=startTour({identity:'account-A',role:'Guru',schoolName:'Uji'});
    assert.equal(env.frames.size,1);
    env.sidebar.scrollTop=99; stop(); stop();
    assert.equal(env.frames.size,0);
    assert.equal(env.sidebar.scrollTop,37);
    assert.deepEqual(env.focus,['original']);
    assert.deepEqual(env.writes,[]);
    assert.deepEqual(env.events.at(-1),[0,123]);
  } finally {restore();}
});

test('account replacement releases previous ownership without recording completion', async () => {
  const startTour=await load(); const env=environment();
  try {
    const old=startTour({identity:'account-A',role:'Guru'});
    const current=startTour({identity:'account-B',role:'Teknisi'});
    assert.equal(env.frames.size,1);
    old(); assert.equal(env.frames.size,1);
    current(); assert.equal(env.frames.size,0);
    assert.deepEqual(env.writes,[]);
    assert.equal(env.events.filter(x=>x===null).length,2);
  } finally {restore();}
});
