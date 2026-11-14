import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import React from 'react';
import { create, act } from 'react-test-renderer';
const require = createRequire(import.meta.url);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const uuid = 'cbd402ef-c02e-42a3-b090-26311c541d14';
async function harness(publicId, state) {
  const auth = React.createContext();
  const requests = [], pending = [];
  const adapter = { AuthContext: auth, useParams: () => ({ publicId }), Link: 'a', get: (path) => { requests.push(path); return new Promise(resolve => pending.push(resolve)); } };
  globalThis.__qrSecurity = adapter;
  const bundle = await build({entryPoints:['src/features/AsetIT/AssetVerification.jsx'],bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',external:['react','react/jsx-runtime'],define:{'import.meta.env':'{}'},plugins:[{name:'boundaries',setup(b){b.onResolve({filter:/(AuthContext|utils\/api|react-router-dom)$/},()=>({path:'adapter',namespace:'security'}));b.onLoad({filter:/.*/,namespace:'security'},()=>({contents:'export const {AuthContext,useParams,Link,get}=globalThis.__qrSecurity;'}));}}]});
  const module = {exports:{}};
  new Function('require','module','exports',bundle.outputFiles[0].text)(require,module,module.exports);
  delete globalThis.__qrSecurity;
  const original = globalThis.fetch;
  globalThis.fetch = async path => { requests.push(path); return {ok:true,json:async()=>({data:{nama_perangkat:'Public asset'}})}; };
  let root;
  const render = next => React.createElement(auth.Provider,{value:{state:next}},React.createElement(module.exports.default));
  await act(async()=>{root=create(render(state));});
  return {requests,pending,root,async update(next){await act(async()=>root.update(render(next)));},async close(){await act(async()=>root.unmount());globalThis.fetch=original;}};
}
test('mounted private data is session-owned and delayed obsolete responses never render',async()=>{
  const initial={isAuthenticated:true,isLoading:false,userId:7,token:'synthetic-session-a'};
  for(const next of [{...initial,token:'synthetic-session-b'},{...initial,userId:8},{...initial}]) {
    const h=await harness(uuid,initial);
    try {
      await act(async()=>h.pending[0]({data:{sumber_dana:'OLD PRIVATE'}}));
      assert.match(JSON.stringify(h.root.toJSON()),/OLD PRIVATE/);
      if(next.token===initial.token && next.userId===initial.userId) await h.update({isAuthenticated:false,isLoading:false});
      await h.update(next);
      assert.doesNotMatch(JSON.stringify(h.root.toJSON()),/OLD PRIVATE/);
      assert.equal(h.pending.length,2);
      await h.update({...next,token:'synthetic-session-c'});
      await act(async()=>h.pending[1]({data:{sumber_dana:'DELAYED PRIVATE'}}));
      assert.doesNotMatch(JSON.stringify(h.root.toJSON()),/DELAYED PRIVATE|OLD PRIVATE/);
      await act(async()=>h.pending[2]({data:{sumber_dana:'CURRENT PRIVATE'}}));
      assert.match(JSON.stringify(h.root.toJSON()),/CURRENT PRIVATE/);
    } finally {await h.close();}
  }
});
const loggedIn = {isAuthenticated:true,isLoading:false,userId:7,token:'synthetic-session-a'};
test('mounted malformed decoded QR routes make zero public or authenticated requests',async()=>{
  for(const id of ['../assets?x=','../assets','%2f..%2fassets','%252fassets','/assets','..\\assets','bad',uuid+'%2fprivate']) {
    const h=await harness(id,loggedIn);
    try {assert.deepEqual(h.requests,[],id);assert.match(JSON.stringify(h.root.toJSON()),/QR tidak valid/);}finally{await h.close();}
  }
});
