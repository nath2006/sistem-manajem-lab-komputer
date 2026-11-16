import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderUI } from "./helpers/renderUI.js";
test("public view explicitly displays identity/specs as plaintext; procurement only from separate private response", async () => {
  const source = await readFile(
    new URL("../src/features/AsetIT/AssetVerification.jsx", import.meta.url),
    "utf8",
  ).catch(() => "");
  assert.ok(source, "public verification component exists");
  for (const authorized of [false, true]) {
    const html = await renderUI(
      `import React from 'react';import{renderToStaticMarkup}from'react-dom/server';import{VerificationView}from'./src/features/AsetIT/AssetVerification.jsx';module.exports=renderToStaticMarkup(<VerificationView asset={{nama_perangkat:'Printer <img onerror=x>',spesifikasi:'<script>alert(1)</script>',status:'Baik',tahun_pengadaan:1999,sumber_dana:'LEAK',harga_beli:'999.00'}} privateData={${authorized ? "{tahun_pengadaan:2020,sumber_dana:'BOS',harga_beli:'0.00'}" : "null"}}/>);`,
    );
    assert.match(html, /&lt;script&gt;/);
    assert.doesNotMatch(html, /<script>|<img onerror|LEAK|1999|999/);
    if (authorized) {
      assert.match(html, /2020/);
      assert.match(html, /BOS/);
      assert.match(html, /Rp 0,00/);
    } else assert.doesNotMatch(html, /Tahun pengadaan|Harga beli|Sumber dana/);
  }
  const app = await readFile(
    new URL("../src/App.jsx", import.meta.url),
    "utf8",
  );
  assert.ok(
    app.indexOf('path="/verifikasi-aset/:publicId"') <
      app.indexOf("<Route element={<ProtectedRoute />}>"),
  );
});
test("detail integrates QR label controls without removing existing detail", async () => {
  const html = await renderUI(
    `import React from 'react';import{renderToStaticMarkup}from'react-dom/server';import AssetDetail from './src/features/AsetIT/AssetDetail.jsx';module.exports=renderToStaticMarkup(<AssetDetail asset={{perangkat_id:7,nama_perangkat:'Printer'}} onClose={()=>{}}/>);`,
  );
  assert.match(html, /QR dan label/);
  assert.match(html, /Spesifikasi/);
});
