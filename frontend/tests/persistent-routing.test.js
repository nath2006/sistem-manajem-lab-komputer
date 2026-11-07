import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { transform } from 'esbuild';
import React from 'react';
import { renderToString } from 'react-dom/server';
import * as Router from 'react-router-dom';
import { renderUI } from './helpers/renderUI.js';

const require=createRequire(import.meta.url);
test('actual App routing shares one persistent shell and retains every role boundary', async()=>{
  const real=await renderUI(`export {default as Layout} from './src/Layouts/DashboardLayout';export {default as Boundary} from './src/Components/RouteBoundary';export {AuthContext} from './src/Context/AuthContext';export {ProtectedRoute,RoleRoute} from './src/utils/Middleware/ProtectedRoute';`);
  let path='/dashboard',role='Admin',authenticated=true;
  const jsx=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8');
  const built=await transform(jsx,{loader:'jsx',format:'cjs',jsx:'automatic'});
  const module={exports:{}};
  const feature=()=>React.createElement('p',{'data-page':'feature'},'Route content');
  const context={__esModule:true,AuthProvider:({children})=>React.createElement(real.AuthContext.Provider,{value:{state:{role,isAuthenticated:authenticated,isLoading:false,fullName:'Fixture'},dispatch:()=>{}}},children)};
  const defaults={ './Layouts/DashboardLayout':real.Layout,'./Components/RouteBoundary':real.Boundary,'./pages/authentication/authLoginCover':()=>React.createElement('p',{'data-page':'login'},'Login') };
  new Function('require','module','exports',built.code)(id=>{
    if(id==='react')return {...React,lazy:()=>feature};
    if(id==='react-router-dom')return {...Router,BrowserRouter:({children})=>React.createElement(Router.MemoryRouter,{initialEntries:[path]},children)};
    if(id==='./Context/AuthContext')return context;
    if(id==='./utils/Middleware/ProtectedRoute')return {ProtectedRoute:real.ProtectedRoute,RoleRoute:real.RoleRoute};
    if(defaults[id])return {__esModule:true,default:defaults[id]};
    return require(id);
  },module,module.exports);
  const matrix=[['/dashboard',['Admin']],['/ticketing',['Admin','Guru','Kepala Lab','Koordinator Lab','Teknisi']],['/pengaturan',['Admin']],['/log-aktivitas',['Admin']],['/user',['Admin']],['/kelola/data-lab',['Admin','Koordinator Lab']],['/kelola-pengumuman',['Admin','Koordinator Lab']],['/kelola-perangkat',['Admin','Kepala Lab']],['/kelola-pemeriksaan-perangkat',['Admin','Kepala Lab']],['/kelola-jadwal-lab',['Admin','Kepala Lab']],['/jadwal-lab',['Admin','Guru','Kepala Lab']],['/pengajuan-jadwal-lab',['Guru']],['/pengajuan-jadwal-lab/status',['Guru']],['/kelola-pengecekan',['Admin','Teknisi']],['/kelola-perbaikan',['Admin','Teknisi']],['/dashboard-guru',['Guru']],['/dashboard-kepala-lab',['Kepala Lab']],['/dashboard-koordinator-lab',['Koordinator Lab']],['/dashboard-teknisi',['Teknisi']]];
  for(const [url,allowed] of matrix)for(const candidate of ['Admin','Guru','Kepala Lab','Koordinator Lab','Teknisi']){
    path=url;role=candidate;
    const html=renderToString(React.createElement(module.exports.default));
    assert.equal(html.includes('data-page="feature"'),allowed.includes(role),`${role} ${url}`);
    assert.ok((html.match(/id="logo-sidebar"/g)||[]).length<=1,`${role} ${url} duplicated shell`);
  }
  path='/ticketing';authenticated=false;
  assert.ok(!renderToString(React.createElement(module.exports.default)).includes('id="logo-sidebar"'));
  authenticated=true;path='/login';
  const login=renderToString(React.createElement(module.exports.default));
  assert.ok(login.includes('data-page="login"')&&!login.includes('id="logo-sidebar"'));
});
