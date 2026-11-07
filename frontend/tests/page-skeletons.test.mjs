import test from 'node:test';
import assert from 'node:assert/strict';
import { renderUI } from './helpers/renderUI.js';

const pages = [
 'features/LogAktivitas/LogAktivitas.jsx',
 'features/Pengaturan/Pengaturan.jsx',
 'features/Ticketing/Ticketing.jsx',
 'features/KelolaUser/User.jsx',
 'features/KelolaPengumuman/Pengumuman.jsx',
 'features/KelolaLaboratorium/Laboratorium.jsx',
 'features/KelolaPengecekan/PengecekanPerangkat.jsx',
 'features/KelolaPerbaikan/Perbaikan.jsx',
 'features/KelolaDataPerangkat/Perangkat.jsx',
 'features/PemeriksaanPerangkat/Pemeriksaan.jsx',
 'features/KelolaJadwalLab/PengajuanJadwalLab.jsx',
 'features/LihatJadwalLab/JadwalLab.jsx',
 'pages/admin/AdminDashboard.jsx',
 'pages/KoordinatorLab/KoordinatorLabDashboard.jsx',
 'pages/KepalaLab/KepalaLabDashboard.jsx',
 'pages/Teknisi/TeknisiDashboard.jsx',
 'pages/authentication/authLoginCover.jsx',
 'pages/Pengumuman/PengumumanDetailPage.jsx',
];
for (const [page, authLoading] of [...pages.map(page => [page, true]), ['features/KelolaJadwalLab/PengajuanJadwalLab.jsx', false], ['features/LihatJadwalLab/JadwalLab.jsx', false]]) {
 test(`${page} renders accessible initial-data skeleton (authLoading=${authLoading})`, async () => {
  const html = await renderUI(`
   import React from 'react';
   import { renderToStaticMarkup } from 'react-dom/server';
   import { MemoryRouter } from 'react-router-dom';
   import Page from './src/${page}';
   import { AuthContext } from './src/Context/AuthContext';
   import { SettingsProvider as SchoolSettingsProvider } from './src/Context/SettingsContext';
   module.exports = renderToStaticMarkup(<MemoryRouter><SchoolSettingsProvider><AuthContext.Provider value={{state:{role:'Admin',user:{},fullName:'Test',isLoading:${authLoading}},isLoading:${authLoading}}}><Page /></AuthContext.Provider></SchoolSettingsProvider></MemoryRouter>);
  `);
  assert.match(html, /animate-pulse/, 'initial loading uses Flowbite pulse markup');
  assert.match(html, /role="status"/);
  assert.match(html, /sr-only/);
 });
}

// Seed only page hooks to exercise async branches; restore React before children.
async function renderTicketState(overrides) {
 return renderUI(`
  import React from 'react';
  import { renderToStaticMarkup } from 'react-dom/server';
  import { MemoryRouter } from 'react-router-dom';
  import Page from './src/features/Ticketing/Ticketing.jsx';
  import { AuthContext } from './src/Context/AuthContext';
  function Harness() {
   const original = React.useState;
   const overrides = ${JSON.stringify(overrides)};
   let slot = 0;
   React.useState = initial => {
    const key = String(slot++);
    return original(Object.hasOwn(overrides, key) ? overrides[key] : initial);
   };
   try { return Page(); } finally { React.useState = original; }
  }
  module.exports = renderToStaticMarkup(<MemoryRouter><AuthContext.Provider value={{state:{role:'Admin',user:{}}}}><Harness /></AuthContext.Provider></MemoryRouter>);
 `);
}

test('ticket detail renders its actual skeleton branch inside the dialog', async () => {
 const html = await renderTicketState({13:'detail',15:true});
 assert.match(html, /role="dialog"/);
 assert.match(html, /Memuat detail tiket/);
 assert.match(html, /animate-pulse/);
});

test('populated tickets remain visible during background refresh', async () => {
 const html = await renderTicketState({
  1:[{ticket_id:71,ticket_number:'INC-71',title:'Existing ticket remains visible',status:'open',priority:'P2'}],
  2:{total:1},9:true,
 });
 assert.match(html, /Existing ticket remains visible/);
 assert.doesNotMatch(html, /Memuat tiket/);
 assert.doesNotMatch(html, /Memuat statistik tiket/);
});
