import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
test('real attachment callback locks duplicates, checks HTTP, retries, saves original name and cleans blob/unmount',async()=>{
 const React=require('react');let index=0;const state=[];let cleanup;
 const hooks={...React,useRef(value){const i=index++;return state[i] ||= {current:value};},useState(value){const i=index++;if(!(i in state))state[i]=value;return [state[i],v=>{state[i]=v;}];},useEffect(effect){cleanup=effect();}};
 const bundle=await build({entryPoints:['src/Components/Pengumuman/AnnouncementAttachment.jsx'],bundle:true,platform:'node',format:'cjs',write:false,external:['react','react/jsx-runtime'],define:{'import.meta.env':'{}'}});
 const module={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(name=>name==='react'?hooks:require(name),module,module.exports);
 const originals={fetch:globalThis.fetch,document:globalThis.document,setTimeout:globalThis.setTimeout,create:URL.createObjectURL,revoke:URL.revokeObjectURL};
 let calls=0,resolve,signal,removed=0,clicked=0,created=0;const revoked=[],timers=[];let link;
 globalThis.fetch=(_url,options)=>{calls++;signal=options.signal;return new Promise(r=>{resolve=r;});};
 globalThis.document={body:{append(){}},createElement(){return link={click(){clicked++;},remove(){removed++;}};}};
 globalThis.setTimeout=fn=>{timers.push(fn);};URL.createObjectURL=()=>{created++;return 'blob:test';};URL.revokeObjectURL=url=>revoked.push(url);
 const render=()=>{index=0;return module.exports.default({file:'https://example.org/original%20notice.pdf'});};
 function find(node,predicate){if(!node||typeof node!=='object')return;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const result=find(child,predicate);if(result)return result;}}
 const button=()=>find(render(),n=>n.type==='button'&&n.props['aria-label']==='Unduh file');
 try{
 const first=button().props.onClick();await button().props.onClick();assert.equal(calls,1);assert.equal(button().props.disabled,true);resolve({ok:false,status:503});await first;assert(find(render(),n=>n.props?.role==='alert'));assert.equal(created,0);assert.equal(button().props.disabled,false);
 const retry=button().props.onClick();resolve({ok:true,blob:async()=>new Blob(['%PDF-demo'],{type:'application/pdf'})});await retry;assert.equal(calls,2);assert.equal(clicked,1);assert.equal(removed,1);assert.equal(link.download,'original notice.pdf');assert.equal(created,1);assert.equal(find(render(),n=>n.props?.role==='alert'),undefined);timers.forEach(fn=>fn());assert.deepEqual(revoked,['blob:test']);
 const pending=button().props.onClick();cleanup();assert.equal(signal.aborted,true);resolve({ok:true,blob:async()=>new Blob(['not downloaded'])});await pending;assert.equal(clicked,1);
 }finally{globalThis.fetch=originals.fetch;globalThis.document=originals.document;globalThis.setTimeout=originals.setTimeout;URL.createObjectURL=originals.create;URL.revokeObjectURL=originals.revoke;}
});
