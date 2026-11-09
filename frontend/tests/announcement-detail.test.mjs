import test from 'node:test';
import assert from 'node:assert/strict';
import { renderUI } from './helpers/renderUI.js';
import { readFile } from 'node:fs/promises';

test('article follows reference order, neutral heading and escaped plain text', async () => {
 const html = await renderUI(`import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {MemoryRouter} from 'react-router-dom'; import {AnnouncementArticle} from './src/pages/Pengumuman/PengumumanDetailPage.jsx'; module.exports=renderToStaticMarkup(<MemoryRouter><AnnouncementArticle announcement={{judul:'Synthetic title',created_at:'2026-11-01',file_path:'notice.pdf',content:'<script>alert(1)</script>\\nSecond line'}} /></MemoryRouter>);`);
 assert.ok(html.indexOf('Synthetic title') < html.indexOf('notice.pdf'));
 assert.ok(html.indexOf('notice.pdf') < html.indexOf('<img'));
 assert.ok(html.indexOf('<img') < html.indexOf('&lt;script&gt;'));
 assert.match(html,/text-gray-900/); assert.match(html,/text-maroon/); assert.match(html,/whitespace-pre-wrap/);
 assert.doesNotMatch(html,/<script>|(?:bg|text|ring)-red-/);
});
test('detail guards stale async responses and hides previous id immediately', async()=>{
 const src=await readFile(new URL('../src/pages/Pengumuman/PengumumanDetailPage.jsx',import.meta.url),'utf8');
 assert.match(src,/return \(\) => \{ active = false; \}/);
 assert.match(src,/state.id !== id/);
});
