import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { loadPdfTools } from '../src/utils/loadPdfTools.js';
const require = createRequire(import.meta.url);

test('actual repair print callback blocks duplicate clicks, exposes failure and retries with real PDF tools', async () => {
  const realReact = require('react');
  let index=0;
  const state=[];
  const hooks={...realReact,
    useState(initial) { const i=index++; if (!(i in state)) state[i]=Array.isArray(initial)?[{perbaikan_id:7,nama_perangkat:'Komputer',tanggal_perbaikan:'2026-11-04'}]:initial; return [state[i],next=>{state[i]=typeof next==='function'?next(state[i]):next;}]; },
    useRef(initial) {const i=index++; return state[i] ||= {current:initial};},
    useEffect(){}, useContext(){return {state:{role:'Admin'}};},
  };
  let rejectImport;
  let calls=0;
  let result;
  globalThis.__printTest = {loadPdfTools:()=>{calls++; return result || new Promise((_,reject)=>{rejectImport=reject;});}};
  const bundle=await build({entryPoints:['src/features/KelolaPerbaikan/Perbaikan.jsx'],bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',define:{'import.meta.env':'{}'},external:['react','react/jsx-runtime'],plugins:[{name:'boundaries',setup(b){
    b.onResolve({filter:/loadPdfTools$/},()=>({path:'pdf',namespace:'test'}));
    b.onResolve({filter:/react-router-dom$/},()=>({path:'router',namespace:'test'}));
    b.onResolve({filter:/utils\/api$/},()=>({path:'api',namespace:'test'}));
    b.onResolve({filter:/Context\/AuthContext$/},()=>({path:'auth',namespace:'test'}));
    b.onResolve({filter:/utils\/useTitle$/},()=>({path:'noop',namespace:'test'}));
    b.onResolve({filter:/useDeletionDialog$/},()=>({path:'deletion',namespace:'test'}));
    b.onResolve({filter:/(Layouts|[Cc]omponents)\//},()=>({path:'noop',namespace:'test'}));
    b.onLoad({filter:/.*/,namespace:'test'},({path})=>({contents:path==='pdf'?'export const loadPdfTools=globalThis.__printTest.loadPdfTools;':path==='router'?'export const useLocation=()=>({}); export const useNavigate=()=>()=>{};':path==='api'?'export const get=async()=>({data:[]}); export const deleteData=async()=>{};':path==='auth'?'export const AuthContext={};':path==='deletion'?'export default function useDeletionDialog(){return {requestDeletion(){},dialog:null};}':'export default function Boundary(){return null;}'}));
  }}]});
  const module={exports:{}};
  new Function('require','module','exports',bundle.outputFiles[0].text)(name=>name==='react'?hooks:require(name),module,module.exports);
  delete globalThis.__printTest;
  const render=()=>{index=0;return module.exports.default();};
  function find(node,predicate) {
    if (!node || typeof node!=='object') return;
    if (predicate(node)) return node;
    for (const child of [node.props?.children].flat(Infinity)) { const found=find(child,predicate); if(found)return found; }
  }
  const print=()=>find(render(),n=>n.type==='button' && n.props.title==='Cetak Data Perbaikan ke PDF');
  const first=print().props.onClick();
  await print().props.onClick();
  assert.equal(calls,1);
  assert.equal(print().props.disabled,true);
  rejectImport(new Error('chunk offline'));
  await first;
  assert.match(find(render(),n=>n.props?.role==='alert').props.children,/Gagal membuat PDF/);
  assert.equal(print().props.disabled,false);
  const tools=await loadPdfTools();
  const saved=[];
  result=Promise.resolve({...tools,jsPDF:function PDF(options) {
    const doc=new tools.jsPDF(options);
    doc.save=name=>saved.push({name,pdf:doc.output(),table:doc.lastAutoTable});
    return doc;
  }});
  await print().props.onClick();
  assert.equal(calls,2);
  assert.equal(saved.length,1);
  assert.match(saved[0].name,/^laporan_perbaikan_perangkat_.*\.pdf$/);
  assert.match(saved[0].pdf,/^%PDF-/);
  assert.ok(saved[0].table.finalY>0);
  assert.equal(find(render(),n=>n.props?.role==='alert'),undefined);
});
