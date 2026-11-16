import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabelPrintJob, buildLabelPdf } from '../src/features/AsetIT/assetQr.js';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const public_id = 'cbd402ef-c02e-42a3-b090-26311c541d14';
const labels = [{ public_id, nama_perangkat: 'Repeat fixture', nomor_inventaris: 'REPEAT-1' }];
const options = { base: 'https://school.example' };

// Exercise the actual delivery boundary with real Blob URLs and real PDF bytes.
// Only the native window handle and passage of time are controlled.
test('each PDF stays readable beyond five minutes until its own viewer closes', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const viewers = [];
  const job = createLabelPrintJob({ open: () => {
    const viewer = { closed: false, location: { replace(url) { viewer.url = url; } }, close() { this.closed = true; } };
    viewers.push(viewer);
    return viewer;
  } });
  try {
    for (let i = 0; i < 3; i++) assert.equal(await job(labels, options), true);
    assert.equal(new Set(viewers.map(v => v.url)).size, 3);
    for (const viewer of viewers) assert.equal((await fetch(viewer.url)).ok, true);
    t.mock.timers.tick(301000);
    for (const viewer of viewers) {
      const response = await fetch(viewer.url);
      const bytes = await response.text();
      assert.match(bytes, /^%PDF-/);
      assert.ok(bytes.includes(public_id));
    }
    viewers[1].close();
    t.mock.timers.tick(1000);
    await assert.rejects(fetch(viewers[1].url), /fetch failed/);
    for (const viewer of [viewers[0], viewers[2]]) assert.equal((await fetch(viewer.url)).ok, true);
    viewers.forEach(v => v.close());
    t.mock.timers.tick(1000);
    for (const viewer of viewers) await assert.rejects(fetch(viewer.url), /fetch failed/);
  } finally {
    viewers.forEach(v => URL.revokeObjectURL(v.url));
    t.mock.timers.reset();
  }
});

test('blocked popup, failed build, duplicate clicks and closed viewer do not consume future jobs', async () => {
  let mode = 'blocked', release, opened = 0, printed = 0;
  const job = createLabelPrintJob({
    open: () => mode === 'blocked' ? null : (++opened, { close() {} }),
    build: async () => {
      if (mode === 'failure') throw Error('build failed');
      if (mode === 'pending') await new Promise(r => { release = r; });
      return buildLabelPdf(labels, options);
    },
    print: pdf => { assert.match(pdf.output(), /^%PDF-/); printed++; },
  });
  await assert.rejects(job(labels, options), /diblokir/);
  mode = 'failure';
  await assert.rejects(job(labels, options), /build failed/);
  mode = 'pending';
  const pending = job(labels, options);
  assert.equal(await job(labels, options), false);
  release();
  assert.equal(await pending, true);
  mode = 'success';
  for (let i = 0; i < 3; i++) assert.equal(await job(labels, options), true);
  assert.equal(opened, 5);
  assert.equal(printed, 4);
});

test('unreadable closed handle retains PDF and releases it once closure is observable', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let unreadable = true, closed = false, url;
  const job = createLabelPrintJob({ open: () => ({
    get closed() { if (unreadable) throw new DOMException('Cross-origin access', 'SecurityError'); return closed; },
    location: { replace(value) { url = value; } }, close() { closed = true; },
  }) });
  try {
    assert.equal(await job(labels, options), true);
    t.mock.timers.tick(301000);
    assert.equal((await fetch(url)).ok, true);
    unreadable = false;
    closed = true;
    t.mock.timers.tick(1000);
    await assert.rejects(fetch(url), /fetch failed/);
  } finally {
    URL.revokeObjectURL(url);
    t.mock.timers.reset();
  }
});

test('mounted real controls keep the same QR after three jobs, detail reopen and invalid copy counts', async (t) => {
  const require = createRequire(import.meta.url);
  const context = React.createContext({ state: { role: 'Admin' } });
  const reads = [], viewers = [];
  let writes = 0, blocked = false;
  globalThis.__repeatLabelBoundary = {
    AuthContext: context,
    get: async path => { reads.push(path); return { data: { public_id } }; },
    post: async () => { writes++; throw Error('No issuance expected'); },
  };
  const result = await build({
    entryPoints: ['src/features/AsetIT/AssetQrLabel.jsx'], bundle: true,
    platform: 'node', format: 'cjs', write: false, jsx: 'automatic',
    external: ['react', 'react/jsx-runtime', 'jspdf', 'qrcode'],
    define: { 'import.meta.env': JSON.stringify({ VITE_QR_PUBLIC_ORIGIN: 'http://localhost:5174' }) },
    plugins: [{ name: 'read-only-identity-fixture', setup(b) {
      b.onResolve({ filter: /(AuthContext|utils\/api)$/ }, () => ({ path: 'adapter', namespace: 'repeat' }));
      b.onLoad({ filter: /.*/, namespace: 'repeat' }, () => ({ contents: 'export const {AuthContext,get,post}=globalThis.__repeatLabelBoundary;' }));
    } }],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports);
  delete globalThis.__repeatLabelBoundary;
  const previousWindow = globalThis.window, previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.window = { open() {
    if (blocked) return null;
    const viewer = { closed: false, close() { this.closed = true; }, location: { replace(url) { viewer.url = url; } } };
    viewers.push(viewer);
    return viewer;
  } };
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let renderer;
  const mount = async () => {
    await act(async () => { renderer = TestRenderer.create(React.createElement(module.exports.default, { asset: { perangkat_id: 7, ...labels[0] } })); });
    // The real encoder settles through its asynchronous PNG generation.
    for (let i = 0; i < 50 && !renderer.root.findAllByType('img').length; i++)
      await act(async () => { await new Promise(resolve => setImmediate(resolve)); });
    assert.equal(renderer.root.findAllByType('img').length, 1);
  };
  const printButton = () => renderer.root.findAllByType('button').find(b => b.props.children === 'Cetak label PDF');
  try {
    await mount();
    const png = renderer.root.findByType('img').props.src;
    assert.equal(printButton().props.disabled, false, 'localhost must offer an actionable print control, not a dead disabled button');
    await act(async () => { await printButton().props.onClick(); });
    assert.equal(viewers.length, 0, 'localhost must never silently print a production label');
    assert.match(renderer.root.findByProps({ role: 'alert' }).findByType('p').props.children, /pratinjau localhost/i);
    await act(async () => renderer.root.findByProps({ type: 'checkbox' }).props.onChange({ target: { checked: true } }));
    assert.equal(printButton().props.disabled, false);
    blocked = true;
    await act(async () => { await printButton().props.onClick(); });
    assert.match(renderer.root.findByProps({ role: 'alert' }).findByType('p').props.children, /diblokir/);
    blocked = false;
    for (let i = 0; i < 3; i++) {
      await act(async () => { await printButton().props.onClick(); });
      assert.equal(printButton().props.disabled, false);
      assert.equal(renderer.root.findByType('img').props.src, png);
      assert.ok((await (await fetch(viewers[i].url)).text()).includes(public_id));
      viewers[i].close();
      t.mock.timers.tick(1000);
    }
    const copies = renderer.root.findByProps({ 'aria-label': 'Jumlah label' });
    for (const value of ['', '0', '25', '1.5']) {
      await act(async () => copies.props.onChange({ target: { value } }));
      assert.equal(printButton().props.disabled, true);
    }
    for (const value of ['1', '24']) {
      await act(async () => copies.props.onChange({ target: { value } }));
      assert.equal(printButton().props.disabled, false);
    }
    await act(async () => renderer.unmount());
    await mount();
    assert.equal(renderer.root.findByType('img').props.src, png);
    assert.equal(printButton().props.disabled, false);
    assert.deepEqual(reads, ['/asset-qr/identity/7', '/asset-qr/identity/7']);
    const origin = renderer.root.findByProps({ 'aria-label': 'Alamat publik sekolah' });
    await act(async () => origin.props.onChange({ target: { value: 'javascript:alert(1)' } }));
    assert.equal(printButton().props.disabled, false, 'invalid configuration must remain actionable');
    await act(async () => { await printButton().props.onClick(); });
    assert.match(renderer.root.findAllByProps({ role: 'alert' }).at(-1).findByType('p').props.children, /Perbaiki Alamat publik sekolah/);
    assert.equal(viewers.length, 3);
    await act(async () => origin.props.onChange({ target: { value: options.base } }));
    assert.equal(printButton().props.disabled, false);
    await act(async () => { await printButton().props.onClick(); });
    assert.ok((await (await fetch(viewers[3].url)).text()).includes(public_id));
    viewers[3].close();
    t.mock.timers.tick(1000);
    assert.equal(writes, 0);
    assert.equal(viewers.length, 4);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    for (const viewer of viewers) URL.revokeObjectURL(viewer.url);
    t.mock.timers.reset();
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
    if (previousAct === undefined) delete globalThis.IS_REACT_ACT_ENVIRONMENT; else globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
  }
});
