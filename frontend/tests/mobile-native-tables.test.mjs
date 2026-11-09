import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderUI } from './helpers/renderUI.js';

test('mobile tables never replace native layout with cards', () => {
  const css = readFileSync('src/index.css', 'utf8');
  assert.doesNotMatch(css, /display:\s*(block|grid);[\s\S]{0,140}grid-template-columns/);
  assert.doesNotMatch(css, /\.mobile-data-table thead\s*\{\s*position:\s*absolute/);
});

test('ticket table exposes the same accessible horizontal viewport', async () => {
  const html = await renderUI(`${prelude} import TicketList from './src/features/Ticketing/TicketList.jsx';module.exports=renderToStaticMarkup(<TicketList tickets={[{ticket_id:7,ticket_number:'TKT-7',title:'Perangkat',status:'new',priority:'P3'}]} onDetail={()=>{}}/>);`);
  assert.match(html, /role="region"[^>]*aria-label="Tiket layanan[^>]*tabindex="0"/);
  assert.match(html, /<th[^>]*scope="col"/);
  assert.match(html, /Detail/);
});

const prelude = `import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {MemoryRouter} from 'react-router-dom';`;
test('shared table exposes a named keyboard scrolling region and instructions', async () => {
  const html = await renderUI(`${prelude} import Table from './src/Layouts/Table.jsx';module.exports=renderToStaticMarkup(<MemoryRouter><Table title="Perangkat" headers={[{judul:'Nama'}]} data={[{id:1}]} renderRow={r=><tr key={r.id}><td>PC-01</td></tr>}/></MemoryRouter>);`);
  assert.match(html, /role="region"[^>]*aria-label="Perangkat[^>]*tabindex="0"/);
  assert.match(html, /Geser tabel/);
  assert.match(html, /aria-describedby=/);
  assert.match(html, /<thead/);
});
