import test from 'node:test';
import assert from 'node:assert/strict';
import { renderUI } from './helpers/renderUI.js';
import { assetPayload } from '../src/features/AsetIT/assetView.js';
test('operational create form has no purpose/lab controls and defaults to Baik', async () => {
  const html = await renderUI(`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import AssetForm from './src/features/AsetIT/AssetForm.jsx';module.exports=renderToStaticMarkup(<AssetForm user={{role:'Admin'}} labs={[]} onSave={()=>{}} onCancel={()=>{}}/>);`);
  assert.doesNotMatch(html, /name="penggunaan"|name="lab_id"/);
  assert.match(html, /name="status"/);
  assert.match(html, /<option selected="">Baik<\/option>/);
  for (const status of ['Rusak','Perlu Perbaikan','Dalam Perbaikan']) assert.ok(html.includes(status));
});
test('operational payload fixes use and null lab, omits blank condition on older records', () => {
  const payload = assetPayload({nama_perangkat:'Printer',penggunaan:'Pembelajaran',lab_id:3,status:''});
  assert.equal(payload.penggunaan,'Operasional');
  assert.equal(payload.lab_id,null);
  assert.ok(!Object.hasOwn(payload,'status'));
  assert.equal(assetPayload({status:'Rusak'}).status,'Rusak');
});
