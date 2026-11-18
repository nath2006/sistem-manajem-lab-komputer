import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(new URL('../../frontend/package.json',import.meta.url));
async function client(t,handler){
 const server=createServer(handler);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base=`http://127.0.0.1:${server.address().port}/api`;
 const bundle=await build({entryPoints:[fileURLToPath(new URL('../../frontend/src/utils/inventoryExport.js',import.meta.url))],bundle:true,platform:'node',format:'cjs',write:false,external:['axios','js-cookie'],define:{'import.meta.env':JSON.stringify({VITE_BASE_URL:base})}});
 const module={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(require,module,module.exports);
 return module.exports;
}
function downloadProbe(t){const original={document:globalThis.document,create:URL.createObjectURL,revoke:URL.revokeObjectURL};const calls=[];
 globalThis.document={body:{appendChild(){}},createElement:()=>({style:{},click(){calls.push('click')},remove(){}})};URL.createObjectURL=blob=>{calls.push(blob);return 'blob:synthetic'};URL.revokeObjectURL=()=>{};
 t.after(()=>{globalThis.document=original.document;URL.createObjectURL=original.create;URL.revokeObjectURL=original.revoke;});return calls;
}
for(const status of [403,409])test(`real apiClient POST HTTP ${status} produces no file or download for either inventory`,async t=>{
 const requests=[];const api=await client(t,async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;requests.push({method:req.method,path:req.url,body:JSON.parse(raw)});res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify({message:'Selection denied by server'}));});const calls=downloadProbe(t);
 for(const kind of ['assets','lab'])await assert.rejects(api.exportInventory('xlsx',[{perangkat_id:2,nama_perangkat:'CLIENT'}],{kind,lab_id:7,kategori:'Printer',role:'Admin'}),error=>error.response?.status===status);
 assert.deepEqual(requests,[{method:'POST',path:'/api/inventory-exports/assets',body:{perangkat_ids:[2],kategori:'Printer'}},{method:'POST',path:'/api/inventory-exports/lab',body:{perangkat_ids:[2],lab_id:7}}]);assert.deepEqual(calls,[]);
});
test('real apiClient signal cancels a pending server dataset without creating URLs',async t=>{
 let enter;const entered=new Promise(resolve=>enter=resolve);let response;
 const api=await client(t,(req,res)=>{response=res;enter();});const calls=downloadProbe(t);const controller=new AbortController();
 const pending=api.exportInventory('pdf',[{perangkat_id:1}],{kind:'lab',signal:controller.signal});await entered;controller.abort();await assert.rejects(pending,error=>error.code==='ERR_CANCELED'||error.name==='AbortError');response.destroy();assert.deepEqual(calls,[]);
});
test('real HTTP authorized data alone reaches generated PDF with exact decimal and null cells',async t=>{
 const api=await client(t,(req,res)=>{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({data:[{perangkat_id:2,nama_perangkat:'SERVER NAME',nomor_inventaris:'00002',harga_beli:'9007199254740993.123456',tahun_pengadaan:0,sumber_dana:null}]}));});const calls=downloadProbe(t);
 const {blob}=await api.exportInventory('pdf',[{perangkat_id:2,nama_perangkat:'CLIENT SECRET',harga_beli:'1'}],{kind:'assets'});const content=Buffer.from(await blob.arrayBuffer()).toString();assert.match(content,/SERVER NAME/);assert.match(content,/9007199254740993\.123456/);assert.match(content,/00002/);assert.ok(!content.includes('CLIENT SECRET'));assert.equal(calls.at(-1),'click');
});
