import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),React=require('react'),{act,create}=require('react-test-renderer');
const result=await build({stdin:{contents:"export {default as User} from './src/features/KelolaUser/User.jsx';export {default as Admin} from './src/pages/admin/AdminDashboard.jsx';export {default as Edit} from './src/Components/User/EditUser.jsx';export {AuthContext} from './src/Context/AuthContext.jsx';",resolveDir:fileURLToPath(new URL('../../frontend',import.meta.url)),loader:'jsx'},bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',external:['react','react/jsx-runtime','react-router-dom'],define:{'import.meta.env':'{}'},plugins:[{name:'boundaries',setup(b){
 b.onResolve({filter:/Context\/PresenceContext$/},()=>({path:'presence',namespace:'test'}));
 b.onResolve({filter:/utils\/api$/},()=>({path:'api',namespace:'test'}));
 b.onResolve({filter:/Layouts\/Table$/},()=>({path:'table',namespace:'test'}));
 b.onResolve({filter:/useDeletionDialog$/},()=>({path:'deletion',namespace:'test'}));
 b.onResolve({filter:/ModalContainer$/},()=>({path:'modal',namespace:'test'}));
 b.onResolve({filter:/Layouts\/Dashboard$|DashboardInsights$|DashboardTheme$|DashboardTablePanel$|Footer$|useTitle$/},()=>({path:'wrapper',namespace:'test'}));
 b.onLoad({filter:/.*/,namespace:'test'},({path})=>({loader:'jsx',contents:({presence:'export const usePresence=()=>globalThis.__presence;',api:'export const get=(...a)=>globalThis.__get(...a);export const put=(...a)=>globalThis.__put(...a);export const deleteData=()=>{};export default {defaults:{headers:{common:{}}}};',table:'export default function Table({data,renderRow}){return <table><tbody>{data.map(renderRow)}</tbody></table>}',deletion:'export default ()=>({requestDeletion(){},dialog:null});',modal:'export default function Modal({children,primaryButton}){return <div>{children}{primaryButton}</div>}',wrapper:'export default function Wrapper({children}){return <div>{children}</div>}'})[path]}));
}}]});
const m={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,m,m.exports);
const {User,Admin,Edit,AuthContext}=m.exports,{MemoryRouter}=require('react-router-dom');
async function harness(t,Component){globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.__presence={connected:false,ready:false,onlineUserIds:[]};const originalDocument=globalThis.document;globalThis.document={title:''};let renderer;let gets=0;const puts=[];
 globalThis.__get=async url=>{gets++;return {data:url==='/user'?[{user_id:1,nama_lengkap:'Actor One',is_online:1},{user_id:2,nama_lengkap:'Actor Two',is_online:0}]:url.includes('/detail/')?{nama_lengkap:'Actor',username:'actor',email:'a@example.test',role:'Guru',is_online:1}:url.endsWith('/stats')?{totalOnlineUsers:999}:[]};};globalThis.__put=async(...args)=>puts.push(args);
 let state={isAuthenticated:true,role:'Admin',userId:1,token:'synthetic'};
 const element=()=>React.createElement(MemoryRouter,null,React.createElement(AuthContext.Provider,{value:{state}},React.createElement(Component,{id:1,onClose(){},onUpdate(){}})));
 const update=()=>act(async()=>renderer.update(element()));
 t.after(async()=>{if(renderer)await act(async()=>renderer.unmount());globalThis.document=originalDocument;delete globalThis.__presence;delete globalThis.__get;delete globalThis.__put;delete globalThis.IS_REACT_ACT_ENVIRONMENT;});
 await act(async()=>{renderer=create(element());});return {get renderer(){return renderer},puts,gets:()=>gets,update,presence:async value=>{globalThis.__presence=value;await update();},session:async value=>{state=value;await update();}};
}
test('mounted User badges use full live snapshot not stale database flags and never refetch for presence',async t=>{const h=await harness(t,User);const text=()=>JSON.stringify(h.renderer.toJSON());assert.match(text(),/Tidak diketahui/);assert.doesNotMatch(text(),/"Online"/);const calls=h.gets();await h.presence({connected:true,ready:true,onlineUserIds:[2]});const rows=h.renderer.root.findAllByType('tr');assert.match(rows[0].findAllByType('span').at(-1).children.join(''),/Offline/);assert.match(rows[1].findAllByType('span').at(-1).children.join(''),/Online/);assert.equal(h.gets(),calls);await h.presence({connected:false,ready:false,onlineUserIds:[]});assert.match(text(),/Tidak diketahui/);});
test('mounted admin online metric is live or unknown, never stale stats count',async t=>{const h=await harness(t,Admin);const text=()=>JSON.stringify(h.renderer.toJSON());assert.doesNotMatch(text(),/999/);assert.match(text(),/Belum terhubung/);await h.presence({connected:true,ready:true,onlineUserIds:[1,2]});const online=h.renderer.root.findAll(n=>n.props.label==='Pengguna online');assert.equal(online[0].props.count,2);});
test('mounted roster hides prior authentication immediately and ignores late prior-token response',async t=>{
 const h=await harness(t,User);const requests=[];globalThis.__get=()=>new Promise(resolve=>requests.push(resolve));
 await h.session({isAuthenticated:true,role:'Admin',userId:1,token:'synthetic-b'});assert.doesNotMatch(JSON.stringify(h.renderer.toJSON()),/Actor One/);
 await h.session({isAuthenticated:true,role:'Admin',userId:2,token:'synthetic-c'});
 await act(async()=>requests[0]({data:[{user_id:1,nama_lengkap:'OBSOLETE ROSTER'}]}));assert.doesNotMatch(JSON.stringify(h.renderer.toJSON()),/OBSOLETE ROSTER/);
 await act(async()=>requests[1]({data:[{user_id:2,nama_lengkap:'CURRENT ROSTER'}]}));assert.match(JSON.stringify(h.renderer.toJSON()),/CURRENT ROSTER/);
 await h.session({isAuthenticated:false});assert.doesNotMatch(JSON.stringify(h.renderer.toJSON()),/CURRENT ROSTER/);
});
test('mounted editor removes manual presence control and outgoing online flag',async t=>{const h=await harness(t,Edit);assert.equal(h.renderer.root.findAll(n=>n.props.name==='is_online').length,0);assert.match(JSON.stringify(h.renderer.toJSON()),/otomatis/);await act(async()=>h.renderer.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(h.puts.length,1);assert.equal('is_online' in h.puts[0][1],false);});
