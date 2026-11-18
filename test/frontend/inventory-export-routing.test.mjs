import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import process from 'node:process';
import React,{Suspense} from 'react';
import {create,act} from 'react-test-renderer';
import {renderUI} from './helpers/renderUI.js';
const require=createRequire(import.meta.url);
process.chdir(fileURLToPath(new URL('../../frontend',import.meta.url)));
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
async function appAt(path,role){
 const h={path,role,auth:React.createContext()};globalThis.__inventoryRoute=h;
 const result=await build({absWorkingDir:process.cwd(),entryPoints:['src/App.jsx'],bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',define:{'import.meta.env':'{}'},external:['react','react/jsx-runtime','react-dom','react-router-dom'],plugins:[{name:'route-policy-fixture',setup(b){
 b.onResolve({filter:/react-router-dom/},a=>a.importer.endsWith('App.jsx')?{path:'router',namespace:'fixture'}:undefined);
 b.onResolve({filter:/Context\/AuthContext/},()=>({path:'auth',namespace:'fixture'}));
 b.onResolve({filter:/Context\/PresenceContext/},()=>({path:'presence',namespace:'fixture'}));
 b.onResolve({filter:/DashboardLayout|RouteBoundary/},()=>({path:'outlet',namespace:'fixture'}));
 b.onResolve({filter:/features\/|pages\/|Components\/(User|Pengumuman|DataLab|Pengecekan|Perangkat|Pemeriksaan|KelolaJadwalLab)\//},a=>({path:a.path,namespace:'page'}));
 b.onLoad({filter:/.*/,namespace:'page'},a=>({contents:`export default function Page(){return ${JSON.stringify(a.path)}}`}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({loader:'jsx',contents:({
 router:'import React from "react";import {MemoryRouter} from "react-router-dom";export * from "react-router-dom";export const BrowserRouter=({children})=><MemoryRouter initialEntries={[globalThis.__inventoryRoute.path]}>{children}</MemoryRouter>',
 auth:'import React from "react";const h=globalThis.__inventoryRoute;export const AuthContext=h.auth;export const AuthProvider=({children})=><AuthContext.Provider value={{state:{role:h.role,isAuthenticated:true,isLoading:false}}}>{children}</AuthContext.Provider>',
 presence:'export const PresenceProvider=({children})=>children',
 outlet:'import React from "react";import {Outlet} from "react-router-dom";export default function Layout(){return <Outlet/>}'
 })[a.path]}));
 }}]});const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports);
 let root;try{await act(async()=>{root=create(React.createElement(Suspense,{fallback:'loading'},React.createElement(module.exports.default)))});return JSON.stringify(root.toJSON());}finally{await act(async()=>root?.unmount());}
}
test('actual App grants Teknisi only existing laboratory list not old Head Admin routes',async()=>{
 assert.match(await appAt('/kelola-perangkat','Teknisi'),/KelolaDataPerangkat/);
 for(const path of ['/add-perangkat','/add-pemeriksaan','/kelola-pemeriksaan-perangkat','/kelola-jadwal-lab'])assert.doesNotMatch(await appAt(path,'Teknisi'),/AddPerangkat|AddPemeriksaan|PemeriksaanPerangkat|PengajuanJadwalLab/);
 for(const role of ['Admin','Kepala Lab'])assert.match(await appAt('/add-perangkat',role),/AddPerangkat/);
});
test('Teknisi existing shell exposes one lab navigation item and one punctuation free tour step',async()=>{
 const data=await renderUI(`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {MemoryRouter} from 'react-router-dom';import {AuthContext} from './src/Context/AuthContext';import {SettingsProvider} from './src/Context/SettingsContext';import {DashboardShell} from './src/Layouts/Dashboard';import {ROLE_STEPS} from './src/Components/Onboarding/onboardingData.js';module.exports={html:renderToStaticMarkup(<MemoryRouter><AuthContext.Provider value={{state:{role:'Teknisi'}}}><SettingsProvider><DashboardShell title="Test"/></SettingsProvider></AuthContext.Provider></MemoryRouter>),steps:ROLE_STEPS.Teknisi};`);
 assert.equal([...data.html.matchAll(/data-tour-path="\/kelola-perangkat"/g)].length,1);
 const steps=data.steps.filter(step=>step.element==='[data-tour-path="/kelola-perangkat"]');assert.equal(steps.length,1);assert.match(steps[0].description,/ekspor/i);assert.doesNotMatch(steps[0].description,/[.,;:\-—–→/]/);
});
