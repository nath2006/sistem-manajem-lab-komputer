import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const React = require('react');
const { act, create } = require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
async function load(entry) {
  const result = await build({ entryPoints: [`src/${entry}`], bundle:true, platform:'node', format:'cjs', write:false, jsx:'automatic', external:['react','react/jsx-runtime'], define:{'import.meta.env':'{}'}, plugins:[{name:'boundaries',setup(b){
    b.onResolve({filter: /(?:utils\/api|Context\/AuthContext|Context\/SettingsContext|Layouts\/Dashboard|Components\/FormContainer|DetailModal\/ModalContainer|react-router-dom|flowbite-react|utils\/useTitle)$/}, args=>({path:args.path,namespace:'fixture'}));
    b.onLoad({filter:/.*/,namespace:'fixture'}, ({path})=>({contents: path.includes('SettingsContext') ? 'export const useSettings=()=>({settings:{school_name:"School",primary_color:"#15803d"},logoSrc:""});' : path.includes('AuthContext') ? 'import {createContext} from "react"; export const AuthContext=createContext({state:{role:"Admin",isAuthenticated:true},dispatch(){}});' : path.includes('utils/api') ? 'export const get=async()=>({data: {data:{},user_id:2,tanggal_perbaikan:"2026-11-18",tindakan:"Repair"}}); export const post=async()=>({}); export const put=post; export default {get,put};' : path==='react-router-dom' ? 'export const useNavigate=()=>()=>{};' : path==='flowbite-react' ? 'export const Card=({children})=>children;' : path.includes('useTitle') ? 'export default ()=>{};' : 'import React from "react"; export default ({children,primaryButton,secondaryButton})=><div>{children}{primaryButton}{secondaryButton}</div>;',loader:'jsx'}));
  }}]});
  const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports);return module.exports.default;
}
async function mount(entry,props={}) { const Component=await load(entry);let tree;await act(async()=>{tree=create(React.createElement(Component,props));});return tree; }
for (const name of ['AddPerbaikan','EditPerbaikan']) test(`${name} primary action and controls use live school branding outside dashboard`,async()=>{
 const tree=await mount(`Components/Perbaikan/${name}.jsx`,{id:1,pengecekanData:{pengecekan_id:1},loggedInUserId:2});try{
 const button=tree.root.findAllByType('button').find(n=>String(n.props.children).includes('Simpan'));
 assert.ok(button.props.className.includes('bg-maroon'),button.props.className);
 assert.equal(button.props.style.color,'#ffffff');
 for(const field of tree.root.findAll(n=>['input','textarea','select'].includes(n.type)&&!n.props.disabled)) {assert.ok(field.props.className.includes('focus:ring-maroon')); assert.ok(field.props.className.includes('focus:border-maroon'));}
 const cancel=tree.root.findAllByType('button').find(n=>n.props.children==='Batal');assert.ok(cancel.props.className.includes('bg-white'));
 }finally{await act(()=>tree.unmount());}
});
test('login icon represents masked versus visible state without submitting',async()=>{
 const tree=await mount('pages/authentication/authLoginCover.jsx');try{
 const toggle=()=>tree.root.findByProps({'aria-controls':'login-password'});
 const input=()=>tree.root.findByProps({id:'login-password'});
 assert.equal(input().props.type,'password');assert.equal(toggle().props.type,'button');assert.equal(toggle().props['aria-label'],'Tampilkan password');
 assert.ok(toggle().findAllByType('svg')[0].props.className.includes('lucide-eye-off'));
 await act(()=>toggle().props.onClick());
 assert.equal(input().props.type,'text');assert.equal(toggle().props['aria-pressed'],true);assert.equal(toggle().props['aria-label'],'Sembunyikan password');
 assert.ok(!toggle().findAllByType('svg')[0].props.className.includes('lucide-eye-off'));
 await act(()=>toggle().props.onClick());assert.equal(input().props.type,'password');
 }finally{await act(()=>tree.unmount());}
});
test('settings native logo selector matches announcement file tile',async()=>{
 const tree=await mount('features/Pengaturan/Pengaturan.jsx');try {const input=tree.root.findByProps({type:'file'}); for(const token of ['file:mr-4','file:py-2','file:px-4','file:rounded-l-md','file:border-0','file:font-semibold','file:bg-maroon/10','file:text-maroon','hover:file:bg-maroon/20']) assert.ok(input.props.className.split(' ').includes(token),token);assert.equal(input.props.accept,'image/png,image/jpeg,image/webp,image/gif');}finally{await act(()=>tree.unmount());}
});
