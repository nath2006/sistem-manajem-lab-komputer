import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
async function fixture(post){
 globalThis.__authorizedExportPost=post;
 const result=await build({entryPoints:[fileURLToPath(new URL('../../frontend/src/utils/inventoryExport.js',import.meta.url))],bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'api-boundary',setup(b){b.onResolve({filter:/\/api\.js$/},()=>({path:'api',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export default {post:(...args)=>globalThis.__authorizedExportPost(...args)}'}));}}]});
 const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports);return module.exports;
}
test('official exporter sends immutable selected IDs and lab scope with signal before generation',async()=>{
 let release,enter;const wait=new Promise(r=>release=r);const entered=new Promise(r=>enter=r);let request;const api=await fixture(async(...args)=>{request=args;enter();await wait;return {data:{data:[{perangkat_id:2,nama_perangkat:'SERVER ONLY',nama_lab:'Lab B'}]}}});
 const controller=new AbortController();const rows=[{perangkat_id:2,nama_perangkat:'CLIENT SECRET'}];const options={kind:'lab',lab_id:3,signal:controller.signal,branding:{schoolName:'Original school'}};
 const oldDocument=globalThis.document;const oldCreate=URL.createObjectURL;let blob;
 globalThis.document={body:{appendChild(){}},createElement:()=>({style:{},click(){},remove(){}})};URL.createObjectURL=value=>{blob=value;return 'blob:authorized'};
 try{const pending=api.exportInventory('pdf',rows,options);rows[0].perangkat_id=9;options.lab_id=9;options.branding.schoolName='MUTATED';await entered;assert.deepEqual(request?.slice(0,2),['/inventory-exports/lab',{perangkat_ids:[2],lab_id:3}]);assert.equal(request[2].signal,controller.signal);release();await pending;const pdf=Buffer.from(await blob.arrayBuffer()).toString();assert.match(pdf,/SERVER ONLY/);assert.match(pdf,/Original school/);assert.ok(!pdf.includes('CLIENT SECRET'));assert.ok(!pdf.includes('MUTATED'));}finally{globalThis.document=oldDocument;URL.createObjectURL=oldCreate;}
});
for(const status of [403,409])test(`server ${status} blocks downloads even for direct exporter invocation`,async()=>{
 const api=await fixture(async()=>{throw Object.assign(Error('denied'),{response:{status}})});const old=URL.createObjectURL;let urls=0;URL.createObjectURL=()=>{urls++;};try{await assert.rejects(api.exportInventory('xlsx',[{perangkat_id:1}],{kind:'assets',kategori:'Printer'}),/denied/);assert.equal(urls,0);}finally{URL.createObjectURL=old;}
});
export {fixture};
