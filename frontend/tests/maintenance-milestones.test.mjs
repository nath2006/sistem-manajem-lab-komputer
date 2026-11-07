import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { build } from 'esbuild';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const source = fileURLToPath(new URL('../src/Components/Pemeriksaan/MaintenanceMilestones.jsx', import.meta.url));
test('milestones show original fault, every repair attempt, actor, and current resolution', async () => {
 assert.ok(existsSync(source), 'shared milestone component is missing');
 const out = join(process.env.TMPDIR || tmpdir(), 'maintenance-milestones-test.cjs');
 await build({entryPoints:[source],bundle:true,platform:'node',format:'cjs',outfile:out,external:['react'],logLevel:'silent'});
 // Bundled React is excluded, resolve it from this frontend installation.
 const {createRequire}=await import('node:module'); const require=createRequire(import.meta.url);
 const code=(await import('node:fs/promises')).readFile;let text=await code(out,'utf8');
 text=text.replaceAll('require("react")',`require(${JSON.stringify(require.resolve('react'))})`);
 await (await import('node:fs/promises')).writeFile(out,text);
 const {default:mod}=await import(pathToFileURL(out).href);const Component=mod.default;
 const html=renderToStaticMarkup(React.createElement(Component,{
  pemeriksaan:{tanggal_pemeriksaan:'2026-11-01',hasil_pemeriksaan:'Baik',nama_pemeriksa:'Kepala Lab',catatan:'Tidak menyala'},
  pengecekan:[{pengecekan_id:3,tanggal_pengecekan:'2026-11-01',status_pengecekan:'Sudah Ditangani',ditemukan_kerusakan:'Tidak menyala'}],
  perbaikan:[{perbaikan_id:1,hasil_perbaikan:'Gagal',tindakan:'Uji kabel',nama_user:'Teknisi A',tanggal_perbaikan:'2026-11-01'},
   {perbaikan_id:2,hasil_perbaikan:'Berhasil',tindakan:'Ganti PSU',nama_user:'Teknisi B',tanggal_perbaikan:'2026-11-02'}]
 }));
 for(const label of ['Bermasalah','Gagal','Berhasil','Uji kabel','Ganti PSU','Teknisi A','Teknisi B','Sudah Ditangani'])assert.ok(html.includes(label),label);
 assert.ok(html.includes('<ol'));assert.ok(html.indexOf('Uji kabel')<html.indexOf('Ganti PSU'));
});
