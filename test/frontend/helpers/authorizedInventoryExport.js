import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
// Synthetic authorized dataset adapter only for document/download fixtures.
// Runtime never uses this adapter: inventoryExport calls the real apiClient.
let selected=[];
let cached;
export function authorizeFixtureRows(rows){selected=structuredClone(rows);}
export async function loadInventoryExport(){
 if(!cached)cached=(async()=>{
  globalThis.__inventoryDocumentAdapter=async(path,body)=>({data:{data:body.perangkat_ids.map(id=>structuredClone(selected.find(row=>row.perangkat_id===id)))}});
  const result=await build({entryPoints:[fileURLToPath(new URL('../../../frontend/src/utils/inventoryExport.js',import.meta.url))],bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'authorized-document-data',setup(b){b.onResolve({filter:/\/api\.js$/},()=>({path:'api',namespace:'document-fixture'}));b.onLoad({filter:/.*/,namespace:'document-fixture'},()=>({contents:'export default {post:(...args)=>globalThis.__inventoryDocumentAdapter(...args)}'}));}}]});
  const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports);return module.exports;
 })();return cached;
}
