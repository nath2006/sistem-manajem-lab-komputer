import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import React from 'react';
import {create, act} from 'react-test-renderer';
const require=createRequire(import.meta.url);
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
async function fixture(menu=false){
 const h={generationEntered:deferred(),pending:deferred(),logoPending:deferred(),logoEntered:deferred(),calls:[],sheets:[],auth:React.createContext({state:{role:'Admin'}})};globalThis.__exportOwnership=h;
 const bundle=await build({absWorkingDir:fileURLToPath(new URL('../../',import.meta.url)),entryPoints:[`frontend/src/${menu?'Components/InventoryExportMenu.jsx':'utils/inventoryExport.js'}`],bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'generation',setup(b){
 b.onResolve({filter:/\/api\.js$/},()=>({path:'api',namespace:'authorized'}));
 b.onLoad({filter:/.*/,namespace:'authorized'},()=>({contents:'export default {post:async(path,body)=>({data:{data:body.perangkat_ids.map(id=>({perangkat_id:id,nama_perangkat:"Original"}))}})}'}));
 b.onResolve({filter:/Context\/AuthContext$/},()=>({path:'auth',namespace:'auth'}));
 b.onLoad({filter:/.*/,namespace:'auth'},()=>({contents:'export const AuthContext=globalThis.__exportOwnership.auth'}));
 b.onResolve({filter:/documentBranding\.js$/},()=>({path:'logo',namespace:'logo'}));
 b.onLoad({filter:/.*/,namespace:'logo'},()=>({contents:`export async function loadDocumentLogo(){const h=globalThis.__exportOwnership;h.logoEntered.resolve();await h.logoPending.promise;return null;}`}));
 b.onResolve({filter:/write-excel-file\/universal|loadPdfTools\.js$/},a=>({path:a.path,namespace:'generation'}));
 b.onLoad({filter:/.*/,namespace:'generation'},a=>({contents:a.path.includes('write-excel')?`export default function write(sheet){globalThis.__exportOwnership.sheets.push(sheet);return {toBlob:()=>{globalThis.__exportOwnership.generationEntered.resolve();return globalThis.__exportOwnership.pending.promise.then(()=>new Blob(['workbook']))}}}`:`export async function loadPdfTools(){globalThis.__exportOwnership.generationEntered.resolve();await globalThis.__exportOwnership.pending.promise;return {jsPDF:class{constructor(){this.internal={pageSize:{getWidth:()=>297,getHeight:()=>210}}}setProperties(){}setTextColor(){}setFont(){}setFontSize(){}text(){}splitTextToSize(s){return [s]}getNumberOfPages(){return 1}setPage(){}output(){return new Blob(['pdf'])}},autoTable(){}}}`}));
 }}]});const module={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(require,module,module.exports);
 const original={document:globalThis.document,create:URL.createObjectURL,revoke:URL.revokeObjectURL};
 URL.createObjectURL=()=>{h.calls.push('url');h.onUrl?.();return 'blob:export'};URL.revokeObjectURL=()=>{};
 globalThis.document={addEventListener(){},removeEventListener(){},body:{appendChild(){h.onAppend?.()}},createElement(){return {style:{},click(){h.calls.push('click')},remove(){}}}};
 h.restore=()=>{globalThis.document=original.document;URL.createObjectURL=original.create;URL.revokeObjectURL=original.revoke;delete globalThis.__exportOwnership;};
 return {...h,h,module:module.exports};
}
test('same owner branding rerenders preserve immutable snapshot and duplicate busy lock',async()=>{
 const f=await fixture(true);let root;const owner={};const rows=[{perangkat_id:1,nama_perangkat:'Original'}];const branding={schoolName:'Original school'};
 const render=()=>React.createElement(f.module.default,{owner,rows,branding:{...branding}});
 try{await act(async()=>{root=create(render())});await act(async()=>root.root.findByProps({'aria-haspopup':'menu'}).props.onClick());
 const action=root.root.findAllByProps({role:'menuitem'})[0].props.onClick;let pending;
 await act(async()=>{pending=action();action()});rows[0].nama_perangkat='MUTATED';branding.schoolName='MUTATED';await act(async()=>root.update(render()));
 assert.equal(root.root.findByProps({'aria-haspopup':'menu'}).props.disabled,true);
 await act(async()=>{f.pending.resolve();await pending});assert.deepEqual(f.calls,['url','click']);assert.equal(f.sheets.length,1);
 const serialized=JSON.stringify(f.sheets);assert.ok(serialized.includes('Original school'));assert.ok(serialized.includes('Original'));assert.ok(!serialized.includes('MUTATED'));assert.ok(!serialized.includes('signal'));assert.ok(!serialized.includes('isCurrent'));
 }finally{await act(async()=>root?.unmount());f.restore()}
});

test('obsolete generation failure cannot alert new owner or unlock its pending retry',async()=>{
 const f=await fixture(true);let root;let owner={};const render=()=>React.createElement(f.module.default,{owner,rows:[{perangkat_id:1}]});
 const start=async()=>{await act(async()=>root.root.findByProps({'aria-haspopup':'menu'}).props.onClick());let pending;await act(async()=>{pending=root.root.findAllByProps({role:'menuitem'})[0].props.onClick()});return {pending}};
 try{await act(async()=>{root=create(render())});const old=await start();const oldGeneration=f.pending;owner={};await act(async()=>root.update(render()));f.h.pending=deferred();const retry=await start();
 await act(async()=>{oldGeneration.reject(Error('Old unrelated failure'));await old.pending});assert.equal(root.root.findAllByProps({role:'alert'}).length,0);assert.equal(root.root.findByProps({'aria-haspopup':'menu'}).props.disabled,true);
 await act(async()=>{f.h.pending.resolve();await retry.pending});assert.deepEqual(f.calls,['url','click']);
 }finally{await act(async()=>root?.unmount());f.restore()}
});

for(const format of ['xlsx','pdf']) test(`${format}: owner invalidated during generation cannot create a download URL; current retry delivers`,async()=>{
 const f=await fixture();const controller=new AbortController();
 try{const pending=f.module.exportInventory(format,[{perangkat_id:1,nama_perangkat:'Old'}],{signal:controller.signal,isCurrent:()=>!controller.signal.aborted});await f.generationEntered.promise;controller.abort();f.pending.resolve();await assert.rejects(pending,{name:'AbortError'});assert.deepEqual(f.calls,[]);
 await f.module.exportInventory(format,[{perangkat_id:1,nama_perangkat:'New'}]);assert.deepEqual(f.calls,['url','click']);
 }finally{f.restore()}
});

test('PDF ownership invalidation while logo is pending suppresses delivery',async()=>{
 const f=await fixture();let current=true;
 try{const pending=f.module.exportInventory('pdf',[{perangkat_id:1}],{branding:{logoSrc:'synthetic-logo'},isCurrent:()=>current});f.pending.resolve();await f.logoEntered.promise;current=false;f.logoPending.resolve();await assert.rejects(pending,{name:'AbortError'});assert.deepEqual(f.calls,[]);}finally{f.restore()}
});

test('ownership is checked again immediately before anchor click',async()=>{
 const f=await fixture();let current=true;f.h.onAppend=()=>{current=false};
 try{const pending=f.module.exportInventory('xlsx',[{perangkat_id:1}],{isCurrent:()=>current});f.pending.resolve();await assert.rejects(pending,{name:'AbortError'});assert.deepEqual(f.calls,['url']);}finally{f.restore()}
});

for(const change of ['account','same-account-token','lab','unmount']) test(`mounted menu cancels deferred delivery after ${change} and permits current retry`,async()=>{
 const f=await fixture(true);let root;let owner={account:1,token:'first',lab:1};
 const render=()=>React.createElement(f.module.default,{owner,rows:[{perangkat_id:1,nama_perangkat:'Original'}],branding:{schoolName:'School'}});
 const start=async()=>{await act(async()=>root.root.findByProps({'aria-haspopup':'menu'}).props.onClick());let pending;await act(async()=>{pending=root.root.findAllByProps({role:'menuitem'})[0].props.onClick()});return {pending};};
 try{
 await act(async()=>{root=create(render())});const old=await start();
 assert.equal(root.root.findByProps({'aria-haspopup':'menu'}).props['aria-busy'],true);
 if(change==='unmount') await act(async()=>root.unmount());
 else {owner={...owner,...(change==='account'?{account:2}:change==='same-account-token'?{token:'second'}:{lab:2})};await act(async()=>root.update(render()))}
 await act(async()=>{f.pending.resolve();await old.pending});assert.deepEqual(f.calls,[]);
 if(change==='unmount')await act(async()=>{root=create(render())});
 assert.equal(root.root.findAllByProps({role:'alert'}).length,0);
 const retry=await start();await act(async()=>await retry.pending);assert.deepEqual(f.calls,['url','click']);
 }finally{await act(async()=>root?.unmount());f.restore()}
});
