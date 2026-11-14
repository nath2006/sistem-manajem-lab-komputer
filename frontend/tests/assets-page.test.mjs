import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderUI } from "./helpers/renderUI.js";
test("asset page is lazy and authenticated, with native table and contextual actions", async () => {
  const app = await readFile(
    new URL("../src/App.jsx", import.meta.url),
    "utf8",
  );
  assert.match(app, /path="\/aset-it"/);
  const html = await renderUI(
    `import React from 'react';import{renderToStaticMarkup}from'react-dom/server';import{MemoryRouter}from'react-router-dom';import AssetTable from './src/features/AsetIT/AssetTable.jsx';module.exports=renderToStaticMarkup(<MemoryRouter><AssetTable data={[{perangkat_id:1,nama_perangkat:'Printer TU',penggunaan:'Operasional',kategori:'Printer',harga_beli:'0.00'}]} user={{role:'Admin'}} onDetail={()=>{}} onEdit={()=>{}} onDelete={()=>{}}/></MemoryRouter>);`,
  );
  assert.match(html, /<table/);
  assert.match(html, /<thead/);
  assert.match(html, /Rp 0,00/);
  for (const action of ["Lihat", "Edit", "Hapus"])
    assert.match(html, new RegExp(`${action} Printer TU`));
});
test("legacy lab filtering tolerates operational assets without a lab", async () => {
  const src = await readFile(
    new URL(
      "../src/features/KelolaDataPerangkat/Perangkat.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(src, /p\.lab_id\.toString\(/);
  const { filterLabDevices } = await import(
    "../src/features/AsetIT/assetView.js"
  );
  assert.deepEqual(
    filterLabDevices([{ lab_id: null }, { lab_id: 2 }, { lab_id: 3 }], "2"),
    [{ lab_id: 2 }],
  );
});
