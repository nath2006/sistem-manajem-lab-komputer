import test from 'node:test';
import assert from 'node:assert/strict';
import { renderUI } from './helpers/renderUI.js';

async function renderManagement(role, filePath = null) {
  return renderUI(`import React from 'react';import{renderToStaticMarkup}from'react-dom/server';import{MemoryRouter}from'react-router-dom';import{AuthContext}from'./src/Context/AuthContext';import Pengumuman from './src/features/KelolaPengumuman/Pengumuman';const original=React.useState;const row={id:7,judul:'Pengumuman uji',content:'Isi pengumuman',file_path:${JSON.stringify(filePath)},created_at:'2026-11-09T08:00:00Z',created_by:{nama_lengkap:'Admin Uji'},is_active:1};React.useState=initial=>original(Array.isArray(initial)?[row]:initial);try{module.exports=renderToStaticMarkup(<MemoryRouter initialEntries={['/kelola-pengumuman']}><AuthContext.Provider value={{state:{role:${JSON.stringify(role)}},dispatch:()=>{}}}><Pengumuman/></AuthContext.Provider></MemoryRouter>)}finally{React.useState=original}`);
}

test('announcement forms and modal attachment use dynamic branding', async () => {
  const html = await renderUI(`import React from 'react';import{renderToStaticMarkup}from'react-dom/server';import{MemoryRouter}from'react-router-dom';import{AuthContext}from'./src/Context/AuthContext';import Add from './src/Components/Pengumuman/AddPengumuman';import Edit from './src/Components/Pengumuman/EditPengumuman';import Detail from './src/Components/Pengumuman/DetailPenguman';const row={judul:'Pengumuman uji',content:'Isi',file_path:'laporan.pdf',is_active:1};function render(node){return renderToStaticMarkup(<MemoryRouter><AuthContext.Provider value={{state:{role:'Admin'},dispatch:()=>{}}}>{node}</AuthContext.Provider></MemoryRouter>)}const add=render(<Add/>);const original=React.useState;React.useState=initial=>original(initial===true?false:initial===null?row:initial);try{module.exports={add,edit:render(<Edit id={7} onClose={()=>{}}/>),detail:render(<Detail id={7} onClose={()=>{}}/>)};}finally{React.useState=original}`);
  for (const form of [html.add, html.edit]) {
    assert.ok(!/(?:focus:ring|focus:border|file:bg|file:text|hover:file:bg)-blue-\d/.test(form), 'form controls must follow the configured brand');
    assert.ok(form.includes('focus:ring-maroon'));
  }
  const save = html.edit.match(/<button[^>]*>Simpan Perubahan<\/button>/)?.[0];
  assert.ok(save, 'loaded edit form exposes its save action');
  assert.match(save, /bg-maroon/);
  assert.doesNotMatch(save, /bg-red-/);
  const file = html.detail.match(/<button(?=[^>]*aria-label="Unduh file")[^>]*>/)?.[0];
  assert.ok(file);
  assert.match(html.detail, /laporan\.pdf/);
  assert.match(file, /text-maroon/);
  assert.doesNotMatch(file, /text-blue-/);
});

test('announcement management actions follow dynamic theme, have accessible names and preserve role restrictions', async () => {
  for (const role of ['Admin', 'Koordinator Lab', 'Guru']) {
    const html = await renderManagement(role);
    for (const action of ['Lihat', 'Edit', 'Hapus']) {
      const tag = html.match(new RegExp('<button(?=[^>]*aria-label="'+action+' pengumuman: Pengumuman uji")[^>]*>'))?.[0];
      if (role === 'Guru' && action !== 'Lihat') { assert.equal(tag, undefined); continue; }
      assert.ok(tag, role+' needs an accessible '+action+' control');
      assert.match(tag, /text-maroon/);
      assert.match(tag, /hover:bg-maroon\/10/);
      assert.match(tag, /focus-visible:ring-maroon/);
      assert.doesNotMatch(tag, /(?:text|bg|border|ring)-(?:red|blue)-\d/);
      assert.match(tag, /type="button"/);
    }
  }
});


test('public announcement carousel controls follow the configured brand', async () => {
  const html = await renderUI(`import React from 'react';import{renderToStaticMarkup}from'react-dom/server';import{MemoryRouter}from'react-router-dom';import{AuthContext}from'./src/Context/AuthContext';import Login from './src/pages/authentication/authLoginCover';const original=React.useState;React.useState=initial=>original(Array.isArray(initial)?[{id:1,title:'Pertama',content:'Isi',image:'/fixture.png'},{id:2,title:'Kedua',content:'Isi',image:'/fixture.png'}]:initial===true?false:initial);try{module.exports=renderToStaticMarkup(<MemoryRouter><AuthContext.Provider value={{state:{isAuthenticated:false},dispatch:()=>{}}}><Login/></AuthContext.Provider></MemoryRouter>)}finally{React.useState=original}`);
  for (const direction of ['Sebelumnya', 'Berikutnya']) {
    const button = html.match(new RegExp('<button(?=[^>]*aria-label="Pengumuman '+direction+'")[\\s\\S]*?<\\/button>'))?.[0];
    assert.ok(button);
    assert.match(button, /text-maroon/);
    assert.doesNotMatch(button, /text-red-/);
  }
});

test('management attachment URLs use the backend uploads path without localhost fallback', async () => {
  const html = await renderManagement('Admin', 'laporan.pdf');
  const link = html.match(/<a[^>]*>Lihat File<\/a>/)?.[0];
  assert.ok(link);
  assert.match(link, /href="http:\/\/example\.invalid\/uploads\/pengumuman\/laporan\.pdf"/);
  assert.doesNotMatch(link, /localhost|Uploads/);
});
