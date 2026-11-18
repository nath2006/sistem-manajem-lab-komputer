import test from 'node:test';
import {loadInventoryExport, authorizeFixtureRows} from './helpers/authorizedInventoryExport.js';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
const artifactDir = join(homedir(), 'AppData', 'Local', 'hermes', 'cache', 'scratch');
mkdirSync(artifactDir, {recursive:true});
const source = new URL('../../frontend/src/utils/inventoryExport.js', import.meta.url);
test('inventory XLSX builder creates an actual workbook blob', async () => {
  assert.ok(existsSync(source), 'inventory export helper must exist');
  const { buildInventoryXlsx } = await loadInventoryExport();
  const blob = await buildInventoryXlsx([{ nomor_inventaris: '0001', nama_perangkat: '=1+1' }], {kind:'assets'});
  assert.equal(blob.type, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  assert.equal(Buffer.from(await blob.arrayBuffer()).subarray(0,2).toString(), 'PK');
});

test('PDF builder paginates real tables without print actions', async () => {
  const { buildInventoryPdf } = await loadInventoryExport();
  assert.equal(typeof buildInventoryPdf, 'function');
  const rows = Array.from({length:80}, (_,i) => ({nomor_inventaris:String(i).padStart(4,'0'), nama_perangkat:'Komputer '+i, nama_lab:'Lab Sintetis',status:'Baik',spesifikasi:'Spesifikasi panjang '.repeat(20),token:'PRIVATE-SENTINEL'}));
  const doc = await buildInventoryPdf(rows,{kind:'lab',branding:{schoolName:'Sekolah Sintetis',systemName:'Sistem Sintetis'}});
  assert.ok(doc.getNumberOfPages() > 1);
  const pdf = doc.output();
  assert.ok(pdf.startsWith('%PDF-'));
  assert.ok(!pdf.includes('PRIVATE-SENTINEL'));
  assert.ok(!pdf.includes('/S /JavaScript'));
  assert.ok(!pdf.includes('print('));
  writeFileSync(join(artifactDir,'inventory-export-lab.pdf'),Buffer.from(doc.output('arraybuffer')));
});

test('exported PDF headers remain readable with light and dark school colors', async () => {
  const {buildInventoryPdf} = await loadInventoryExport();
  for (const [primaryColor, expected] of [['#ffffff','#000000'], ['#ffff00','#000000'], ['#fff','#000000'], ['#000000','#ffffff']]) {
    const doc = await buildInventoryPdf([{nama_perangkat:'Perangkat uji'}], {branding:{primaryColor}});
    assert.equal(doc.lastAutoTable.head[0].cells[0].styles.textColor, expected);
  }
});

test('OOXML roundtrip preserves exact text, safe projection, zero, and pre-await snapshots for both kinds', async () => {
  const {buildInventoryXlsx,buildInventoryPdf} = await loadInventoryExport();
  const rows=[{nomor_inventaris:'00001',nama_perangkat:'=1+1',penggunaan:'+cmd',kategori:'@user',status:'-bad',tahun_pengadaan:0,sumber_dana:'',harga_beli:'9007199254740993.123456',spesifikasi:'Full specification',token:'PRIVATE-SENTINEL',qr_token:'PRIVATE-SENTINEL'}];
  const branding={schoolName:'Original School',systemName:'Original System',primaryColor:'not-a-color'};
  const pending=buildInventoryXlsx(rows,{kind:'assets',branding});
  rows[0].nama_perangkat='MUTATED';branding.schoolName='MUTATED';
  const assets=await pending;
  const lab=await buildInventoryXlsx(rows,{kind:'lab'});
  for (const [kind,blob] of [['assets',assets],['lab',lab]]) {
    const filename=join(artifactDir,`inventory-export-${kind}.xlsx`);
    const archive=Buffer.from(await blob.arrayBuffer());
    writeFileSync(filename,archive);
    const entries={};
    for(let p=0;p<archive.length-46;p++) {
      if(archive.readUInt32LE(p)!==0x02014b50) continue;
      const method=archive.readUInt16LE(p+10),size=archive.readUInt32LE(p+20);
      const length=archive.readUInt16LE(p+28),offset=archive.readUInt32LE(p+42);
      const name=archive.subarray(p+46,p+46+length).toString();
      const start=offset+30+archive.readUInt16LE(offset+26)+archive.readUInt16LE(offset+28);
      const bytes=archive.subarray(start,start+size);
      entries[name]=(method===8?inflateRawSync(bytes):bytes).toString();
    }
    const sheet=entries['xl/worksheets/sheet1.xml'];
    const strings=[...entries['xl/sharedStrings.xml'].matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m=>[...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x=>x[1]).join(''));
    const sheetRows=[...sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)];
    assert.equal(sheetRows.length,6);assert.ok(!/<f[ >]/.test(sheet));
    const cells=[...sheetRows.at(-1)[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)];
    const values=cells.map(c=>{assert.match(c[1],/t="s"/);return strings[Number(c[2].match(/<v>(\d+)<\/v>/)[1])];});
    assert.equal(values[0],'00001');assert.ok(!strings.join('').includes('PRIVATE-SENTINEL'));
    if(kind==='assets') {
      assert.deepEqual(values,['00001','=1+1','+cmd','@user','-','-bad','0','-','9007199254740993.123456','Full specification']);
      assert.ok(strings.includes('Original School'));assert.ok(!strings.includes('MUTATED'));
    } else assert.equal(values.length,5);
  }
  await assert.rejects(buildInventoryXlsx([]),/data/i);
  await assert.rejects(buildInventoryPdf([{}],{kind:'private'}),/valid/i);
});

test('PDF snapshots branding and rows and rejects a failed logo without downloading', async () => {
  const {buildInventoryPdf,exportInventory} = await loadInventoryExport();
  const rows=[{nomor_inventaris:'00042',nama_perangkat:'Original Asset',harga_beli:'9007199254740993.123456',spesifikasi:'Long full specification '.repeat(30)}];
  const branding={schoolName:'Original School',systemName:'Original System'};
  const pending=buildInventoryPdf(rows,{kind:'assets',branding});
  rows[0].nama_perangkat='MUTATED';branding.schoolName='MUTATED';
  const doc=await pending;
  const pdf=doc.output();
  assert.ok(pdf.includes('Original Asset'));assert.ok(pdf.includes('Original School'));assert.ok(!pdf.includes('MUTATED'));
  assert.ok(pdf.includes('9007199254740993.123456'));
  writeFileSync(join(artifactDir,'inventory-export-assets.pdf'),Buffer.from(doc.output('arraybuffer')));
  rows[0].perangkat_id=1;authorizeFixtureRows(rows);
  await assert.rejects(exportInventory('pdf',rows,{branding:{logoSrc:'javascript:alert(1)'}}),/Logo/);
  const retry=await buildInventoryPdf(rows);assert.ok(retry.output().startsWith('%PDF-'));
});

test('download validates input, sanitizes filenames, and releases only its own URL after delivery', async () => {
  const {exportInventory} = await loadInventoryExport();
  assert.equal(typeof exportInventory,'function');
  const calls=[];
  const originalDocument=globalThis.document;
  const create=URL.createObjectURL, revoke=URL.revokeObjectURL;
  const timer=globalThis.setTimeout;
  let cleanup;
  URL.createObjectURL = blob => {assert.ok(blob.size > 0);calls.push('url');return 'blob:owned-export';};
  URL.revokeObjectURL = url => calls.push(url);
  globalThis.setTimeout = (fn, delay) => {assert.ok(delay >= 1000);cleanup=fn;return {unref(){}};};
  globalThis.document={body:{appendChild(){}},createElement(){return {style:{},click(){assert.match(this.download,/^inventaris-assets-/);assert.ok(!this.download.includes('/'));calls.push('click');},remove(){calls.push('remove');}};}};
  try {
    await assert.rejects(exportInventory('csv',[{}]),/format/i);
    await assert.rejects(exportInventory('xlsx',[]),/data/i);
    assert.deepEqual(calls,[]);
    const rows=[{perangkat_id:1,nama_perangkat:'Test'}];authorizeFixtureRows(rows);
    await exportInventory('xlsx',rows,{title:'../../school/name'});
    assert.deepEqual(calls,['url','click','remove']);
    cleanup();assert.equal(calls.at(-1),'blob:owned-export');
    const retry=[{perangkat_id:1,nama_perangkat:'Retry'}];authorizeFixtureRows(retry);
    await exportInventory('pdf',retry);
    cleanup();
  } finally {globalThis.document=originalDocument;URL.createObjectURL=create;URL.revokeObjectURL=revoke;globalThis.setTimeout=timer;}
});
