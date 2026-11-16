import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function find(node,predicate){if(!node||typeof node!=='object')return;if(predicate(node))return node;for(const c of [node.props?.children].flat(Infinity)){const found=find(c,predicate);if(found)return found;}}
test('actual QR controls retry failed image encoding even when persisted identity and URL are unchanged',async()=>{
 let stateCursor=0,effectCursor=0,calls=0;const states=[],dependencies=[],pending=[];
 const hooks={...require('react'),useContext:()=>({state:{role:'Admin'}}),useMemo:fn=>fn(),useState(initial){const i=stateCursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],next=>{states[i]=typeof next==='function'?next(states[i]):next;}];},useEffect(fn,deps){const i=effectCursor++;if(!dependencies[i]||deps.some((d,j)=>d!==dependencies[i][j])){dependencies[i]=deps;pending.push(fn);}}};
 globalThis.__qrRetry={get:async()=>({data:{public_id:'cbd402ef-c02e-42a3-b090-26311c541d14'}}),post:async()=>{},encodeQr:async()=>{if(++calls===1)throw Error('canvas failed');return 'data:image/png;base64,actual-retry';},verificationUrl:()=> 'https://school.example/verifikasi-aset/cbd402ef-c02e-42a3-b090-26311c541d14',isLoopback:()=>false,createLabelPrintJob:()=>async()=>true};
 const result=await build({entryPoints:['src/features/AsetIT/AssetQrLabel.jsx'],bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',external:['react','react/jsx-runtime'],define:{'import.meta.env':JSON.stringify({VITE_QR_PUBLIC_ORIGIN:'https://school.example'})},plugins:[{name:'qr-retry-boundaries',setup(b){b.onResolve({filter:/(AuthContext|utils\/api|assetQr)$/},()=>({path:'adapter',namespace:'qrtest'}));b.onLoad({filter:/.*/,namespace:'qrtest'},()=>({contents:'export const AuthContext={};export const {get,post,encodeQr,verificationUrl,isLoopback,createLabelPrintJob}=globalThis.__qrRetry;'}));}}]});
 const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(name=>name==='react'?hooks:require(name),module,module.exports);delete globalThis.__qrRetry;
 const render=()=>{stateCursor=effectCursor=0;return module.exports.default({asset:{perangkat_id:7,nama_perangkat:'Printer'}});};
 async function settle(){for(let i=0;i<4;i++){render();for(const fn of pending.splice(0))fn();await new Promise(r=>setImmediate(r));}return render();}
 let tree=await settle();assert.equal(calls,1);const retry=find(tree,n=>n.type==='button'&&n.props.children==='Muat ulang QR');assert.ok(retry);retry.props.onClick();tree=await settle();assert.equal(calls,2,'retry must rerun encoder for unchanged UUID');assert.ok(find(tree,n=>n.type==='img'&&n.props.src.includes('actual-retry')));
});
