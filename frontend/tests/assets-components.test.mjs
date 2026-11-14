import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderUI } from "./helpers/renderUI.js";
test("asset form renders optional procurement fields and no manual maintenance status input", async () => {
  const source = await readFile(
    new URL("../src/features/AsetIT/AssetForm.jsx", import.meta.url),
    "utf8",
  ).catch(() => "");
  assert.ok(source.includes("export default"), "asset form implemented");
  const html = await renderUI(
    `import React from 'react';import{renderToStaticMarkup}from'react-dom/server';import AssetForm from './src/features/AsetIT/AssetForm.jsx';module.exports=renderToStaticMarkup(<AssetForm user={{role:'Admin'}} labs={[]} onSave={()=>{}} onCancel={()=>{}}/>);`,
  );
  for (const name of ["tahun_pengadaan", "sumber_dana", "harga_beli"]) {
    assert.match(html, new RegExp(`name="${name}"`));
    const tag = html.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`))[0];
    assert.ok(!tag.includes("required"));
  }
  assert.match(html, /Printer/);
  assert.match(html, /Perangkat Jaringan/);
  assert.doesNotMatch(html, /name="status"/);
});
test("asset detail renders unknown procurement as dashes and zero as an exact price", async () => {
  const source = await readFile(
    new URL("../src/features/AsetIT/AssetDetail.jsx", import.meta.url),
    "utf8",
  ).catch(() => "");
  assert.ok(source.includes("export default"));
  const html = await renderUI(
    `import React from 'react';import{renderToStaticMarkup}from'react-dom/server';import AssetDetail from './src/features/AsetIT/AssetDetail.jsx';module.exports=renderToStaticMarkup(<AssetDetail asset={{nama_perangkat:'Printer',harga_beli:'0.00',tahun_pengadaan:null,sumber_dana:null}} onClose={()=>{}}/>);`,
  );
  assert.match(html, /Rp 0,00/);
  assert.match(html, /Tahun pengadaan/);
  assert.match(html, />-</);
});
