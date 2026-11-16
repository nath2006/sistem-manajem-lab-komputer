import test from 'node:test';
import assert from 'node:assert/strict';
import { renderUI } from './helpers/renderUI.js';

test('ticket rows link their existing asset identity and do not fabricate absent asset links', async () => {
  const html = await renderUI(`import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {MemoryRouter} from 'react-router-dom'; import List from './src/features/Ticketing/TicketList.jsx'; module.exports=renderToStaticMarkup(<MemoryRouter><List tickets={[{ticket_id:1,ticket_number:'TKT-000001',title:'Printer macet',perangkat_id:7,nama_perangkat:'Printer TU',status:'new'},{ticket_id:2,title:'Bantuan aplikasi',status:'new'}]} onDetail={()=>{}} /></MemoryRouter>);`);
  assert.match(html, /href="\/aset-it\?asset=7"/);
  assert.match(html, /Lihat aset: Printer TU/);
  assert.equal((html.match(/href="\/aset-it\?asset=/g) || []).length, 1);
});

test('create ticket labels shared operational printer/network assets without a fake lab', async () => {
  const html = await renderUI(`import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import Create from './src/features/Ticketing/CreateTicketForm.jsx'; module.exports=renderToStaticMarkup(<Create options={{types:['incident'],categories:['hardware'],devices:[{perangkat_id:7,nama_perangkat:'Printer TU',penggunaan:'Operasional',kategori:'Printer',lokasi:'Tata Usaha',nomor_inventaris:'PR-7',nama_lab:null},{perangkat_id:8,nama_perangkat:'Switch',penggunaan:'Operasional',kategori:'Perangkat Jaringan',lokasi:'Ruang Server',nama_lab:null},{perangkat_id:9,nama_perangkat:'PC Lab',penggunaan:'Pembelajaran',kategori:'Komputer',nama_lab:'Lab 1'}]}} closeModal={()=>{}} onSubmit={()=>{}} />);`);
  assert.match(html, /Aset IT \(opsional\)/);
  assert.match(html, /Printer TU — PR-7 · Printer · Operasional · Tata Usaha/);
  assert.match(html, /Switch — Perangkat Jaringan · Operasional · Ruang Server/);
  assert.match(html, /PC Lab — Komputer · Pembelajaran · Lab 1/);
  assert.doesNotMatch(html, /null|undefined/);
});

test('linked asset names and locations remain escaped React text in the real detail', async () => {
  const html = await renderUI(`import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import Detail from './src/features/AsetIT/AssetDetail.jsx'; module.exports=renderToStaticMarkup(<Detail asset={{perangkat_id:7,nama_perangkat:'<img src=x onerror=alert(1)>',lokasi:'<script>alert(2)</script>'}} onClose={()=>{}} />);`);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /&lt;script&gt;alert\(2\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script|<img/);
});
