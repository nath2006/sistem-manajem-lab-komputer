import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLabelPdf,createLabelPrintJob} from '../../frontend/src/features/AsetIT/assetQr.js';
import {getDocumentBranding,SYSTEM_NAME} from '../../frontend/src/utils/documentBranding.js';
import {PNG} from 'pngjs';
const public_id='cbd402ef-c02e-42a3-b090-26311c541d14';
test('actual multipage label PDF contains institutional branding and excludes procurement',async()=>{
 const pdf=await buildLabelPdf(Array.from({length:11},()=>({public_id,nama_perangkat:'Printer '+ 'long '.repeat(40),nomor_inventaris:'INV-TEST',kategori:'Printer',harga_beli:'SECRET_PRICE'})),{base:'https://school.example/lab/',branding:getDocumentBranding({school_name:'Sekolah Contoh'})});
 assert.equal(pdf.getNumberOfPages(),2);
 assert.equal(pdf.internal.pageSize.getWidth(),210.0015555555555);
 const output=pdf.output();assert.match(output,/Sekolah Contoh/);assert.ok(output.includes(SYSTEM_NAME));assert.doesNotMatch(output,/SECRET_PRICE/);assert.ok(output.includes(public_id));
});
test('real builder loads logos only after synchronous popup and retries failure with aspect retained',async()=>{
 const oldImage=globalThis.Image, oldDocument=globalThis.document;
 const png=new PNG({width:240,height:80});png.data.fill(255);
 const dataUrl='data:image/png;base64,'+PNG.sync.write(png).toString('base64');
 let fail=true,opens=0,closed=0,printed;
 globalThis.Image=class {naturalWidth=240;naturalHeight=80;set src(_value){assert.ok(opens>0,'viewer must open before logo request');queueMicrotask(()=>fail?this.onerror():this.onload());}};
 globalThis.document={createElement:()=>({getContext:()=>({drawImage(){}}),toDataURL:()=>dataUrl})};
 const job=createLabelPrintJob({open:()=>{opens++;return {close:()=>closed++}},print:pdf=>{printed=pdf}});
 const options={base:'https://school.example/lab/',branding:getDocumentBranding({school_name:'School'},'https://cdn.example/logo.webp')};
 try{
 const pending=job([{public_id}],options);assert.equal(opens,1);assert.equal(await job([{public_id}],options),false);
 await assert.rejects(pending,/Logo.*Pengaturan/);assert.equal(closed,1);
 fail=false;assert.equal(await job([{public_id}],options),true);assert.equal(opens,2);
 const output=printed.output();assert.match(output,/31\.1811023622047/); // 11mm logo width in points
 assert.ok(Object.values(printed.internal.collections.addImage_images).some(i=>i.width===240&&i.height===80));
 }finally{globalThis.Image=oldImage;globalThis.document=oldDocument;}
});
