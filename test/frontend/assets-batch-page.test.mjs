import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import React from 'react';
import {create,act} from 'react-test-renderer';
const require=createRequire(import.meta.url);globalThis.IS_REACT_ACT_ENVIRONMENT=true;
async function mount({pending=false,fail=false}={}){
 const h={posts:[],gets:0,rows:[{perangkat_id:1,nama_perangkat:'Synthetic',penggunaan:'Operasional',kategori:'Printer'},{perangkat_id:2,nama_perangkat:'Synthetic lab',penggunaan:'Pembelajaran'}],fail};
 h.auth=React.createContext({state:{role:'Admin'}});let resolve;h.wait=new Promise(r=>{resolve=r;});h.resolve=resolve;
 h.get=async()=>{h.gets++;if(pending){pending=false;await h.wait;}if(h.fail)throw Error('synthetic load failure');return {data:h.rows};};
 h.post=async(path,body)=>{h.posts.push({path,body});const count=body.jumlah||1;h.rows=[...h.rows,...Array.from({length:count},(_,i)=>({perangkat_id:10+i,nama_perangkat:'Synthetic new',penggunaan:'Operasional'}))];return {status:201,data:{message:'Synthetic success',data:body.jumlah?{created_count:count,assets:h.rows.slice(-count)}:h.rows.at(-1)}};};
 globalThis.__batchPage=h;
 const bundle=await build({entryPoints:['src/features/AsetIT/AsetIT.jsx'],bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',external:['react','react/jsx-runtime','react-dom'],plugins:[{name:'boundaries',setup(b){
 b.onResolve({filter:/react-router-dom|Layouts\/Dashboard$|Context\/AuthContext$|utils\/api$|useDeletionDialog$|useTitle$|ModalContainer$|\.\/AssetTable$|\.\/AssetDetail$/},({path})=>({path,namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({loader:'jsx',contents:path.includes('react-router')?'export function useSearchParams(){return [new URLSearchParams(),()=>{}]}':path.includes('AuthContext')?'export const AuthContext=globalThis.__batchPage.auth':path.includes('utils/api')?'const h=globalThis.__batchPage;export const get=h.get,post=h.post,put=h.post,deleteData=()=>{};':path.includes('useDeletionDialog')?'export default function useDeletionDialog(){return {requestDeletion(){},dialog:null}}':path.includes('useTitle')?'export default function useTitle(){}':path.includes('AssetTable')?'export default function Table(){return null}':path.includes('AssetDetail')?'export default function Detail(){return null}':'export default function Wrapper({children}){return <div>{children}</div>}'}));}}]});
 const module={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(require,module,module.exports);await act(async()=>{h.root=create(React.createElement(module.exports.default));});
 h.text=()=>JSON.stringify(h.root.toJSON());h.add=()=>act(async()=>h.root.root.findAllByType('button').find(b=>b.children.includes('Tambah aset')).props.onClick());h.change=(name,value)=>act(async()=>h.root.root.findByProps({name}).props.onChange({target:{name,value}}));h.submit=()=>act(async()=>h.root.root.findByType('form').props.onSubmit({preventDefault(){}}));h.close=()=>act(async()=>h.root.unmount());return h;
}
test('actual page save uses one batch POST, reloads server units and exposes unfiltered operational total',async()=>{const h=await mount();try{
 assert.match(h.text(),/Total unit Operasional/);assert.match(h.text(),/1 unit/);
 await h.add();await h.change('jumlah','3');await h.change('nomor_inventaris','SYNTH');await h.submit();
 assert.equal(h.posts.length,1);assert.equal(h.posts[0].path,'/assets/batch');assert.equal(h.posts[0].body.jumlah,3);assert.equal(h.gets,2);assert.match(h.text(),/3 unit aset berhasil ditambahkan/);assert.match(h.text(),/4 unit/);
 await act(async()=>h.root.root.findByProps({'aria-label':'Filter kategori'}).props.onChange({target:{value:'Laptop'}}));assert.match(h.text(),/4 unit/);
 }finally{await h.close();}});
test('single page save retains old endpoint and literal inventory number',async()=>{const h=await mount();try{await h.add();await h.change('nomor_inventaris','SYNTH-exact');await h.submit();assert.equal(h.posts.length,1);assert.equal(h.posts[0].path,'/assets');assert.equal(h.posts[0].body.nomor_inventaris,'SYNTH-exact');}finally{await h.close();}});
test('accessible total never reports zero during initial load or failure and recovers on retry',async()=>{const h=await mount({pending:true,fail:true});try{assert.doesNotMatch(h.text(),/0 unit/);assert.match(h.text(),/Memuat total unit/);await act(async()=>h.resolve());assert.doesNotMatch(h.text(),/0 unit/);assert.match(h.text(),/Total unit belum tersedia/);h.fail=false;await act(async()=>h.root.root.findAllByType('button').find(b=>b.children.includes('Muat ulang')).props.onClick());assert.match(h.text(),/1 unit/);}finally{await h.close();}});
