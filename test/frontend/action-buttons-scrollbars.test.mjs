import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderUI } from './helpers/renderUI.js';

async function management(feature, role = 'Admin') {
  return renderUI(`import React from 'react';import{renderToStaticMarkup}from'react-dom/server';import{MemoryRouter}from'react-router-dom';import{AuthContext}from'./src/Context/AuthContext';import{DashboardContext}from'./src/Context/DashboardContext';import Feature from ${JSON.stringify(feature)};const original=React.useState;const row={id:7,user_id:7,judul:'Demo',content:'Isi',nama_lengkap:'User Demo',username:'demo',email:'demo@example.invalid',role:'Koordinator Lab',created_at:'2026-11-01',is_active:1};React.useState=value=>original(Array.isArray(value)?[row]:value);try{module.exports=renderToStaticMarkup(<MemoryRouter><AuthContext.Provider value={{state:{role:${JSON.stringify(role)}}}}><DashboardContext.Provider value={{setTitle(){}}}><Feature/></DashboardContext.Provider></AuthContext.Provider></MemoryRouter>)}finally{React.useState=original}`);
}

for (const feature of ['./src/features/KelolaUser/User.jsx', './src/features/KelolaPengumuman/Pengumuman.jsx']) {
  test(`${feature} distinguishes view/edit/delete actions and keeps accessible descriptions`, async () => {
    const html = await management(feature);
    for (const [action, color] of [['Lihat', 'blue'], ['Edit', 'amber'], ['Hapus', 'red']]) {
      const button = html.match(new RegExp('<button(?=[^>]*aria-label="' + action + '[^"]*")[^>]*>'))?.[0];
      assert.ok(button, action);
      assert.match(button, new RegExp('text-' + color + '-600'));
      assert.match(button, /title="[^"]+"/);
      assert.match(button, /min-h-11 min-w-11/);
      assert.doesNotMatch(button, /text-maroon/);
    }
  });
}

test('non-admin user and announcement permissions are unchanged', async () => {
  for (const feature of ['./src/features/KelolaUser/User.jsx', './src/features/KelolaPengumuman/Pengumuman.jsx']) {
    const html = await management(feature, 'Guru');
    assert.match(html, /aria-label="Lihat/);
    assert.doesNotMatch(html, /aria-label="(?:Edit|Hapus)/);
  }
});

test('table scrolling instructions are screen-reader-only and scrollbars use subdued rounded thumbs', async () => {
  const html = await renderUI(`import React from 'react';import{renderToStaticMarkup}from'react-dom/server';import Region from './src/Components/TableScrollRegion';module.exports=renderToStaticMarkup(<Region><table><tbody><tr><td>Data</td></tr></tbody></table></Region>);`);
  assert.match(html, /<p[^>]*class="sr-only"/);
  assert.match(html, /aria-describedby=/);
  assert.ok(/className="sr-only">Geser tabel/.test(readFileSync('src/features/LihatJadwalLab/JadwalLab.jsx', 'utf8')), 'schedule scrolling instructions must not be visible');
  const css = readFileSync('src/index.css', 'utf8');
  assert.match(css, /::-webkit-scrollbar-thumb/);
  assert.match(css, /scrollbar-color:\s*var\(--scrollbar-thumb\) transparent/);
  assert.match(css, /border-radius:\s*999px/);
  assert.ok(css.includes('var(--color-gray-500, #6b7280)'), 'Flowbite does not expose every Tailwind gray variable; scrollbar needs a neutral fallback');
});
