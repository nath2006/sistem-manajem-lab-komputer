import test from 'node:test';
import assert from 'node:assert/strict';
import { renderUI } from './helpers/renderUI.js';
const article = async (file) => renderUI(`import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {AnnouncementArticle} from './src/pages/Pengumuman/PengumumanDetailPage.jsx'; module.exports=renderToStaticMarkup(<AnnouncementArticle announcement={{judul:'Title',created_at:'2026-11-01',file_path:${JSON.stringify(file)},content:'Body'}}/>);`);
test('missing attachment remains explicit below the date', async()=>{
 const html=await article(null); assert.match(html,/Belum ada lampiran/); assert.ok(html.indexOf('November') < html.indexOf('Belum ada lampiran')); assert.doesNotMatch(html,/aria-label="Unduh file"/);
});
test('management detail modal also exposes the download card below its date', async () => {
 const html=await renderUI(`import React from 'react';import{renderToStaticMarkup}from'react-dom/server';import Detail from './src/Components/Pengumuman/DetailPenguman';const original=React.useState;const row={judul:'Demo',content:'Isi',created_at:'2026-11-01',file_path:'notice.pdf',is_active:1};React.useState=initial=>original(initial===null?row:initial===true?false:initial);try{module.exports=renderToStaticMarkup(<Detail id={7} onClose={()=>{}}/>)}finally{React.useState=original}`);
 assert.ok(html.includes('aria-label="Unduh file"'), 'management view must have an explicit download control');
 assert.ok(html.indexOf('Tanggal Dibuat') < html.indexOf('aria-label="Lampiran"'));
});
test('attachment uses reference tile and accessible download control',async()=>{
 const html=await article('https://example.org/notice.pdf'); assert.match(html,/aria-label="Unduh file"/); assert.match(html,/title="Unduh file"/); assert.match(html,/h-14 w-14/); assert.match(html,/max-w-6xl/); assert.match(html,/max-w-\[34rem\]/); assert.doesNotMatch(html,/target="_blank"/);
});
