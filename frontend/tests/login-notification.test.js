import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import process from 'node:process';
import { readFile } from 'node:fs/promises';

async function renderNotification(props) {
  const result = await build({ stdin: { contents: `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import Notification from './src/Components/Notification/Notif.jsx';
    module.exports = renderToStaticMarkup(<Notification {...${JSON.stringify(props)}} onClose={() => {}} />);
  `, loader: 'jsx', resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'cjs', write: false });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
  return module.exports;
}

test('pesan login salah memakai warna sekolah tanpa mengubah makna error dan tombol tutup tidak submit', async () => {
  const html = await renderNotification({ type: 'error', variant: 'brand', message: 'Username atau Password Salah' });
  assert.match(html, /bg-maroon/);
  assert.doesNotMatch(html, /bg-red-\d+/);
  assert.match(html, /role="alert"/);
  assert.match(html, /Username atau Password Salah/);
  assert.match(html, /type="button"/);
  const login = await readFile(new URL('../src/pages/authentication/authLoginCover.jsx', import.meta.url), 'utf8');
  assert.match(login, /<Notification\b[^>]*variant="brand"[^>]*message=\{errorMsg\}/);
});

test('notifikasi error di halaman lain mempertahankan warna status bawaannya', async () => {
  assert.match(await renderNotification({ type: 'error', message: 'Operasi gagal' }), /bg-red-500/);
});
