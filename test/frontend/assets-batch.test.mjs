import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import React from 'react';
import { create, act } from 'react-test-renderer';
const require = createRequire(import.meta.url);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
async function mount(asset) {
  const calls = [];
  const bundle = await build({entryPoints:['src/features/AsetIT/AssetForm.jsx'],bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',external:['react','react/jsx-runtime','react-dom'],plugins:[{name:'form-boundary',setup(b){b.onResolve({filter:/Components\/FormContainer$/},()=>({path:'form',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({loader:'jsx',contents:'export default function Form({children,onSubmit,error}){return <form onSubmit={onSubmit}>{children}{error && <p role="alert">{error}</p>}</form>}'}));}}]});
  const module={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(require,module,module.exports);
  let root;const h={calls,fail:false,pending:null};
  await act(async()=>{root=create(React.createElement(module.exports.default,{asset,onSave:async body=>{calls.push(body);if(h.fail)throw Error('synthetic conflict');if(h.pending)await h.pending;},onCancel(){}}));});
  h.root=root;h.change=async(name,value)=>act(async()=>root.root.findByProps({name}).props.onChange({target:{name,value}}));
  h.submit=()=>root.root.findByType('form').props.onSubmit({preventDefault(){}});
  h.close=()=>act(async()=>root.unmount());return h;
}
test('mounted create form batches three independent units with exact per-unit price and prefix preview',async()=>{
 const h=await mount();try{
 assert.equal(h.root.root.findByProps({name:'jumlah'}).props.value,1);
 await h.change('jumlah','3');await h.change('nomor_inventaris','SYNTH');await h.change('harga_beli','9999999999999.99');
 const prefix=h.root.root.findByProps({name:'nomor_inventaris'});assert.equal(prefix.props.required,true);assert.equal(prefix.props.maxLength,46);
 const preview=h.root.root.findAllByProps({role:'status'})[0].children.join('');assert.match(preview,/SYNTH-001/);assert.match(preview,/SYNTH-003/);
 await act(async()=>h.submit());assert.equal(h.calls.length,1);assert.equal(h.calls[0].jumlah,3);assert.equal(h.calls[0].awalan_nomor_inventaris,'SYNTH');assert.equal(h.calls[0].aset.harga_beli,'9999999999999.99');assert.equal('nomor_inventaris' in h.calls[0].aset,false);
 }finally{await h.close();}
});
test('single create preserves literal optional inventory number and edit has no quantity',async()=>{
 for(const asset of [undefined,{perangkat_id:7,nomor_inventaris:'SYNTH-literal'}]){const h=await mount(asset);try{
 if(asset)assert.equal(h.root.root.findAllByProps({name:'jumlah'}).length,0);
 else await h.change('nomor_inventaris','SYNTH-literal');
 await act(async()=>h.submit());assert.equal(h.calls[0].nomor_inventaris,'SYNTH-literal');assert.equal('jumlah' in h.calls[0],false);
 }finally{await h.close();}}
});
test('quantity range is guarded in actual submit; pending duplicate is locked and failed save can retry',async()=>{
 const h=await mount();try{
 for(const value of ['0','101','1.5','']){await h.change('jumlah',value);await act(async()=>h.submit());}assert.equal(h.calls.length,0);
 await h.change('jumlah','3');await h.change('nomor_inventaris','');await act(async()=>h.submit());assert.equal(h.calls.length,0);
 await h.change('nomor_inventaris','x'.repeat(47));await act(async()=>h.submit());assert.equal(h.calls.length,0);
 for(const prefix of [' SYNTH','SYNTH ']){await h.change('nomor_inventaris',prefix);await act(async()=>h.submit());assert.equal(h.calls.length,0,'batch prefix must not be silently rewritten');}
 await h.change('nomor_inventaris','SYNTH');h.fail=true;await act(async()=>h.submit());assert.match(JSON.stringify(h.root.toJSON()),/synthetic conflict/);h.fail=false;
 let done;h.pending=new Promise(resolve=>{done=resolve;});let first;await act(async()=>{first=h.submit();h.submit();});assert.equal(h.calls.length,2);await act(async()=>{done();await first;});
 }finally{await h.close();}
});
