import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
async function harness(entry, api) {
  let cursor = 0;
  const states = [], effects = [];
  const hooks = { ...require('react'), useContext: () => ({state:{role:'Admin'}}), useCallback: fn => fn,
    useState(initial) { const i=cursor++; if (!(i in states)) states[i]=initial; return [states[i], next=>{states[i]=typeof next==='function'?next(states[i]):next;}]; },
    useEffect(fn) { if (effects.length < 2) effects.push(fn); } };
  globalThis.__assetRecoveryApi = api;
  const result = await build({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'boundaries',setup(b){
    b.onResolve({filter:/Context\/AuthContext$/},()=>({path:'auth',namespace:'test'}));
    b.onResolve({filter:/utils\/api$/},()=>({path:'api',namespace:'test'}));
    b.onResolve({filter:/useDeletionDialog$/},()=>({path:'deletion',namespace:'test'}));
    b.onResolve({filter:/(Layouts\/Dashboard|ModalContainer|LoadingSpinner|Loading\/Skeleton|useObjectUrl|useTitle|AssetTable|AssetForm|AssetDetail)$/},()=>({path:'stub',namespace:'test'}));
    b.onLoad({filter:/.*/,namespace:'test'},({path})=>({contents:path==='api'?'export const {get,putWithFile,post,put,deleteData}=globalThis.__assetRecoveryApi;':path==='auth'?'export const AuthContext={};':path==='deletion'?'export default ()=>({requestDeletion(){},dialog:null});':'export default function Stub(){return null;}'}));
  }}]});
  const module={exports:{}};
  new Function('require','module','exports',result.outputFiles[0].text)(name=>name==='react'?hooks:require(name),module,module.exports);
  delete globalThis.__assetRecoveryApi;
  return {states,effects,render(props={}) {cursor=0;return module.exports.default(props);}};
}
function find(node, predicate) {
  if (!node || typeof node!=='object') return;
  if (predicate(node)) return node;
  for (const child of [node.props?.children].flat(Infinity)) { const match=find(child,predicate); if(match)return match; }
}
test('legacy blank inventory submits photo-only update and preserves required name/lab guards', async()=>{
  const calls=[];
  const h=await harness('src/Components/Perangkat/EditPerangkat.jsx',{get:async path=>({data:path==='/lab'?[{lab_id:1}]:{nama_perangkat:'Printer',lab_id:1,status:'Baik',nomor_inventaris:null}}),putWithFile:async(...args)=>{calls.push(args);return {data:{}};}});
  h.render({id:7});
  await Promise.all(h.effects.map(fn=>fn()));
  await new Promise(resolve=>setImmediate(resolve));
  const props={id:7,onUpdate(){},onClose(){}};
  const form=()=>find(h.render(props),n=>n.type==='form');
  const photo=new File(['photo'],'photo.png',{type:'image/png'});
  find(form(),n=>n.props?.type==='file').props.onChange({target:{files:[photo]}});
  await form().props.onSubmit({preventDefault(){}});
  assert.equal(calls.length,1,'blank inventory must reach actual multipart update');
  assert.equal(calls[0][1].get('nomor_inventaris'),'');
  assert.equal(calls[0][1].get('foto_perangkat').name,'photo.png');
  assert.notEqual(find(form(),n=>n.props?.name==='nomor_inventaris').props.required,true);
  for (const field of ['nama_perangkat','lab_id']) {
    const previous=h.states[0][field]; h.states[0]={...h.states[0],[field]:''};
    await form().props.onSubmit({preventDefault(){}}); assert.equal(calls.length,1);
    h.states[0]={...h.states[0],[field]:previous};
  }
});
test('lab failure retry requests labs again and supplies recovered labs to add form', async()=>{
  let labs=0;
  const recovered=[{lab_id:9,nama_lab:'Recovered lab'}];
  const h=await harness('src/features/AsetIT/AsetIT.jsx',{get:async path=>{if(path==='/lab'){if(++labs===1)throw Error('offline');return {data:recovered};}return {data:[]};}});
  h.render(); await Promise.all(h.effects.map(fn=>fn())); await new Promise(resolve=>setImmediate(resolve));
  const retry=find(h.render(),n=>n.type==='button'&&n.props.children==='Muat ulang');
  assert.ok(retry);
  await retry.props.onClick(); await new Promise(resolve=>setImmediate(resolve));
  assert.equal(labs,2,'retry must reload lab endpoint');
  const add=find(h.render(),n=>n.type==='button'&&n.props.children==='Tambah aset');
  assert.equal(add.props.disabled,false); add.props.onClick();
  assert.deepEqual(find(h.render(),n=>n.props?.labs).props.labs,recovered);
});
