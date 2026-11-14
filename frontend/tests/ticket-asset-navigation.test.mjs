import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import process from 'node:process';
import React from 'react';
import { create, act } from 'react-test-renderer';

const require = createRequire(import.meta.url);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const asset = { perangkat_id: 7, nama_perangkat: '<img src=x onerror=alert(1)>', lokasi: '<script>alert(2)</script>', penggunaan: 'Operasional', kategori: 'Printer', nomor_inventaris: 'PR-7', status: 'Baik' };
async function harness(entry = '/ticketing', state = { isAuthenticated: true, role: 'Guru', userId: 1 }) {
  const auth = React.createContext();
  const h = { entry, state, auth, requests: [], missing: false, pending: null };
  h.get = async path => {
    h.requests.push(path);
    if (path === '/assets') return { data: [asset] };
    if (path === '/lab') return { data: [] };
    if (path === '/assets/7') {
      if (h.pending) return h.pending;
      if (h.denied) throw { response: { status: 403 }, message: 'Anda tidak diizinkan membaca aset ini.' };
      if (h.missing) throw { response: { status: 404 }, message: 'Aset tidak ditemukan.' };
      return { data: asset };
    }
    if (path === '/assets/999') throw { response: { status: 404 }, message: 'Aset tidak ditemukan.' };
    if (path.startsWith('/asset-qr/identity/')) return { data: null };
    if (path === '/tickets/options') return { data: { data: { types: ['incident'], categories: ['hardware'], devices: [asset] } } };
    if (path === '/tickets') return { data: { data: [{ ticket_id: 1, title: 'Printer macet', ticket_number: 'TKT-1', perangkat_id: 7, nama_perangkat: asset.nama_perangkat, status: 'new' }], summary: {}, pagination: { page: 1, pages: 1, total: 1 } } };
    throw Error(`Unexpected request: ${path}`);
  };
  h.mutate = () => { throw Error('Navigation must not write'); };
  globalThis.__assetNavigation = h;
  const bundle = await build({ entryPoints: ['src/App.jsx'], bundle: true, platform: 'node', format: 'cjs', write: false, jsx: 'automatic', loader: { '.css': 'empty', '.png': 'dataurl' }, external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/server'], define: { 'import.meta.env': '{}' }, plugins: [{ name: 'mounted-app-boundaries', setup(b) {
    b.onResolve({ filter: /^react-router-dom$/ }, args => args.importer.endsWith('/src/App.jsx') || args.importer.endsWith('\\src\\App.jsx') ? { path: 'router', namespace: 'asset-navigation' } : { path: 'react-router-dom', external: true });
    b.onResolve({ filter: /Context\/AuthContext$/ }, () => ({ path: 'auth', namespace: 'asset-navigation' }));
    b.onResolve({ filter: /utils\/api$/ }, () => ({ path: 'api', namespace: 'asset-navigation' }));
    b.onResolve({ filter: /Layouts\/Dashboard(Layout)?$/ }, args => ({ path: args.path.endsWith('DashboardLayout') ? 'shell' : 'layout', namespace: 'asset-navigation' }));
    b.onResolve({ filter: /pages\/authentication\/authLoginCover$/ }, () => ({ path: 'login', namespace: 'asset-navigation' }));
    b.onLoad({ filter: /.*/, namespace: 'asset-navigation' }, ({ path }) => ({ resolveDir: process.cwd(), loader: 'jsx', contents: {
      auth: 'import React,{useState} from "react";const h=globalThis.__assetNavigation;export const AuthContext=h.auth;export function AuthProvider({children}){const [state,setState]=useState(h.state);h.setSession=setState;return <AuthContext.Provider value={{state}}>{children}</AuthContext.Provider>}',
      api: 'const h=globalThis.__assetNavigation;export const get=h.get,post=h.mutate,put=h.mutate,deleteData=h.mutate;export const postWithFile=h.mutate,putWithFile=h.mutate;export default {get:h.get,post:h.mutate,put:h.mutate};',
      router: 'import React from "react";import {MemoryRouter,useLocation,useNavigate} from "react-router-dom";export * from "react-router-dom";const h=globalThis.__assetNavigation;function Probe(){h.location=useLocation();h.navigate=useNavigate();return null}export function BrowserRouter({children}){return <MemoryRouter initialEntries={[h.entry]}><Probe/>{children}</MemoryRouter>}',
      shell: 'import React,{Suspense} from "react";import {Outlet} from "react-router-dom";export default function Shell(){return <Suspense fallback="Loading"><Outlet/></Suspense>}',
      layout: 'export default function Layout({children}){return children}',
      login: 'export default function Login(){return "LOGIN"}',
    }[path] }));
  } }] });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(require, module, module.exports);
  const previousDocument = globalThis.document;
  globalThis.document = { title: '' };
  h.commits = [];
  h.mount = async () => { await act(async () => { h.root = create(React.createElement(React.Profiler, { id: 'asset-navigation', onRender: () => { if (h.root) h.commits.push(JSON.stringify(h.root.toJSON())); } }, React.createElement(module.exports.default))); }); };
  h.go = async url => { await act(async () => h.navigate(url)); };
  h.close = async () => { await act(async () => h.root.unmount()); globalThis.document = previousDocument; delete globalThis.__assetNavigation; };
  h.reload = async () => { h.entry = h.location.pathname + h.location.search; await act(async () => h.root.unmount()); await h.mount(); };
  await h.mount();
  return h;
}
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
};

test('account replacement on the same asset URL refetches and rejects the old pending detail', async () => {
  const h = await harness('/aset-it');
  try {
    const old = deferred(), current = deferred();
    h.pending = old.promise;
    await h.go('/aset-it?asset=7');
    h.pending = current.promise;
    await act(async () => h.setSession({ isAuthenticated: true, role: 'Guru', userId: 2 }));
    assert.equal(h.requests.filter(p => p === '/assets/7').length, 2);
    await act(async () => old.resolve({ data: { ...asset, nama_perangkat: 'OBSOLETE ACCOUNT DETAIL' } }));
    assert.doesNotMatch(text(h), /OBSOLETE ACCOUNT DETAIL/);
    assert.match(text(h), /Memuat detail aset/);
    await act(async () => current.resolve({ data: { ...asset, nama_perangkat: 'CURRENT ACCOUNT DETAIL' } }));
    assert.match(text(h), /CURRENT ACCOUNT DETAIL/);
  } finally { await h.close(); }
});

test('same-user token replacement ignores pending old success while the new detail is loading', async () => {
  const h = await harness('/aset-it', { isAuthenticated: true, role: 'Guru', userId: 1, token: 'synthetic-session-a' });
  try {
    const old = deferred(), current = deferred();
    h.pending = old.promise;
    await h.go('/aset-it?asset=7');
    h.pending = current.promise;
    await act(async () => h.setSession({ isAuthenticated: true, role: 'Guru', userId: 1, token: 'synthetic-session-b' }));
    assert.equal(h.requests.filter(p => p === '/assets/7').length, 2);
    await act(async () => old.resolve({ data: { ...asset, nama_perangkat: 'OBSOLETE TOKEN DETAIL' } }));
    assert.doesNotMatch(text(h), /OBSOLETE TOKEN DETAIL/);
    assert.match(text(h), /Memuat detail aset/);
    await act(async () => current.resolve({ data: asset }));
    assert.match(text(h), /Detail Aset IT Sekolah/);
  } finally { await h.close(); }
});

test('same-user new-token and role replacement hide loaded detail in the first commit and refetch', async () => {
  const session = { isAuthenticated: true, role: 'Guru', userId: 1, token: 'synthetic-session-a' };
  const h = await harness('/aset-it', session);
  try {
    const initial = deferred();
    h.pending = initial.promise;
    await h.go('/aset-it?asset=7');
    await act(async () => initial.resolve({ data: { ...asset, nama_perangkat: 'PREVIOUS SESSION DETAIL' } }));
    assert.match(text(h), /PREVIOUS SESSION DETAIL/);
    for (const replacement of [{ ...session, token: 'synthetic-session-b' }, { ...session, role: 'Teknisi' }]) {
      const next = deferred();
      h.pending = next.promise;
      h.commits.length = 0;
      const before = h.requests.filter(p => p === '/assets/7').length;
      await act(async () => h.setSession(replacement));
      assert.ok(h.commits.length > 0);
      assert.doesNotMatch(h.commits[0], /PREVIOUS SESSION DETAIL/, 'old detail must be hidden before passive effect reset');
      assert.match(text(h), /Memuat detail aset/);
      assert.equal(h.requests.filter(p => p === '/assets/7').length, before + 1);
      await act(async () => next.resolve({ data: { ...asset, nama_perangkat: 'PREVIOUS SESSION DETAIL' } }));
      assert.match(text(h), /PREVIOUS SESSION DETAIL/);
    }
  } finally { await h.close(); }
});

test('old request failure after closing loading modal cannot poison a reopened selection', async () => {
  const h = await harness('/aset-it');
  try {
    const old = deferred(), current = deferred();
    h.pending = old.promise;
    await h.go('/aset-it?keep=1&asset=7');
    await click(h, h.root.root.findByProps({ 'aria-label': 'Tutup dialog' }));
    assert.equal(h.location.search, '?keep=1');
    assert.equal(h.root.root.findAllByProps({ role: 'dialog' }).length, 0);
    h.pending = current.promise;
    await h.go('/aset-it?keep=1&asset=7');
    await act(async () => old.reject(Error('OBSOLETE CLOSED ERROR')));
    assert.doesNotMatch(text(h), /OBSOLETE CLOSED ERROR/);
    assert.match(text(h), /Memuat detail aset/);
    await act(async () => current.resolve({ data: asset }));
    assert.match(text(h), /Detail Aset IT Sekolah/);
  } finally { await h.close(); }
});

test('delayed success after closing loading modal stays closed and cannot complete a newer request', async () => {
  const h = await harness('/aset-it');
  try {
    const old = deferred(), current = deferred();
    h.pending = old.promise;
    await h.go('/aset-it?asset=7');
    await click(h, h.root.root.findByProps({ 'aria-label': 'Tutup dialog' }));
    await act(async () => old.resolve({ data: { ...asset, nama_perangkat: 'OBSOLETE CLOSED DETAIL' } }));
    assert.equal(h.root.root.findAllByProps({ role: 'dialog' }).length, 0);
    assert.equal(h.location.search, '');
    h.pending = current.promise;
    await h.go('/aset-it?asset=7');
    assert.match(text(h), /Memuat detail aset/);
    assert.doesNotMatch(text(h), /OBSOLETE CLOSED DETAIL/);
    await act(async () => current.resolve({ data: asset }));
    assert.match(text(h), /Detail Aset IT Sekolah/);
  } finally { await h.close(); }
});

test('obsolete session rejection cannot replace current loading or successful detail', async () => {
  const h = await harness('/aset-it');
  try {
    const old = deferred(), current = deferred();
    h.pending = old.promise;
    await h.go('/aset-it?asset=7');
    h.pending = current.promise;
    await act(async () => h.setSession({ isAuthenticated: true, role: 'Guru', userId: 2 }));
    await act(async () => current.resolve({ data: { ...asset, nama_perangkat: 'CURRENT SESSION DETAIL' } }));
    await act(async () => old.reject(Error('OBSOLETE SESSION ERROR')));
    assert.match(text(h), /CURRENT SESSION DETAIL/);
    assert.doesNotMatch(text(h), /OBSOLETE SESSION ERROR|Memuat detail aset/);
  } finally { await h.close(); }
});

test('pending detail success and rejection after unmount are ignored', async () => {
  for (const failure of [false, true]) {
    const h = await harness('/aset-it');
    const pending = deferred();
    h.pending = pending.promise;
    await h.go('/aset-it?asset=7');
    await h.close();
    const commits = h.commits.length;
    await act(async () => failure ? pending.reject(Error('UNMOUNTED DETAIL ERROR')) : pending.resolve({ data: asset }));
    assert.equal(h.root.toJSON(), null);
    assert.equal(h.commits.length, commits);
  }
});

const text = h => JSON.stringify(h.root.toJSON());
async function click(h, node) { await act(async () => node.props.onClick({ button: 0, preventDefault() {}, metaKey: false, altKey: false, ctrlKey: false, shiftKey: false })); }

test('actual App routes navigate from a loaded ticket to the real asset modal and survive reload', async () => {
  const h = await harness();
  try {
    const link = h.root.root.findAllByType('a').find(n => n.children.some(c => typeof c === 'string' && c.includes('Lihat aset:')));
    assert.ok(link, 'real loaded ticket must provide an asset link');
    await click(h, link);
    assert.equal(h.location.pathname, '/aset-it', 'ticket must not fall through the real App wildcard to login');
    assert.equal(h.location.search, '?asset=7');
    assert.equal(h.root.root.findAllByProps({ role: 'dialog' }).length, 1);
    assert.match(text(h), /Detail Aset IT Sekolah/);
    assert.ok(h.requests.includes('/assets/7'));
    await h.reload();
    assert.match(text(h), /Detail Aset IT Sekolah/);
    assert.equal(h.root.root.findAllByProps({ role: 'dialog' }).length, 1);
    assert.ok(h.root.root.findAllByType('h2').some(n => n.children.includes(asset.nama_perangkat)));
    assert.ok(h.root.root.findAllByType('dd').some(n => n.children.includes(asset.lokasi)));
    assert.equal(h.root.root.findAllByType('script').length, 0);
    assert.equal(h.root.root.findAllByType('img').length, 0);
    await click(h, h.root.root.findByProps({ 'aria-label': 'Tutup dialog' }));
    assert.equal(h.location.search, '');
    assert.equal(h.root.root.findAllByProps({ role: 'dialog' }).length, 0);
    assert.match(text(h), /Inventaris Aset IT/);
  } finally { await h.close(); }
});

test('invalid selections never request a detail and can recover to the existing inventory', async () => {
  for (const query of ['asset=', 'asset=..%2Fassets', 'asset=%252F7', 'asset=0', 'asset=-1', 'asset=1e2', 'asset=9007199254740992', 'asset=7&asset=8']) {
    const h = await harness(`/aset-it?keep=1&${query}`);
    try {
      assert.deepEqual(h.requests.filter(p => p.startsWith('/assets/')), [], query);
      assert.match(text(h), /Identitas aset tidak valid/);
      await click(h, h.root.root.findByProps({ 'aria-label': 'Tutup dialog' }));
      assert.equal(h.location.search, '?keep=1');
      assert.match(text(h), /Inventaris Aset IT/);
      await click(h, h.root.root.findByProps({ 'aria-label': `Lihat ${asset.nama_perangkat}` }));
      assert.match(text(h), /Detail Aset IT Sekolah/);
    } finally { await h.close(); }
  }
});

test('403 selection stays recoverable without stale detail and retry uses a fresh request', async () => {
  const h = await harness('/aset-it');
  try {
    h.denied = true;
    await h.go('/aset-it?asset=7');
    assert.match(text(h), /Anda tidak diizinkan membaca aset ini/);
    assert.doesNotMatch(text(h), /Detail Aset IT Sekolah/);
    h.denied = false;
    await click(h, h.root.root.findAllByType('button').find(n => n.children.includes('Muat ulang detail')));
    assert.equal(h.requests.filter(p => p === '/assets/7').length, 2);
    assert.match(text(h), /Detail Aset IT Sekolah/);
  } finally { await h.close(); }
});

test('404 asset selection shows a recoverable detail error and retry obtains fresh data', async () => {
  const h = await harness('/aset-it?asset=999');
  try {
    assert.match(text(h), /Aset tidak ditemukan/);
    assert.equal(h.root.root.findAllByProps({ role: 'dialog' }).length, 1);
    await click(h, h.root.root.findByProps({ 'aria-label': 'Tutup dialog' }));
    await h.go('/aset-it?asset=7');
    assert.match(text(h), /Detail Aset IT Sekolah/);
    await h.go('/aset-it');
    h.missing = true;
    await h.go('/aset-it?asset=7');
    assert.match(text(h), /Aset tidak ditemukan/);
    assert.doesNotMatch(text(h), /Detail Aset IT Sekolah/);
    h.missing = false;
    const retry = h.root.root.findAllByType('button').find(n => n.children.includes('Muat ulang detail'));
    assert.ok(retry);
    await click(h, retry);
    assert.match(text(h), /Detail Aset IT Sekolah/);
  } finally { await h.close(); }
});

test('loading selection ignores obsolete responses after close or a different query', async () => {
  const h = await harness('/aset-it');
  try {
    let resolve;
    h.pending = new Promise(done => { resolve = done; });
    await h.go('/aset-it?asset=7');
    assert.match(text(h), /Memuat detail aset/);
    await h.go('/aset-it?asset=999');
    assert.match(text(h), /Aset tidak ditemukan/);
    await act(async () => resolve({ data: asset }));
    assert.doesNotMatch(text(h), /Detail Aset IT Sekolah/);
    await click(h, h.root.root.findByProps({ 'aria-label': 'Tutup dialog' }));
    assert.equal(h.root.root.findAllByProps({ role: 'dialog' }).length, 0);
    assert.equal(h.location.pathname, '/aset-it');
  } finally { await h.close(); }
});

test('existing App authentication, all asset reader roles, role restrictions and public QR stay intact', async () => {
  for (const role of ['Admin', 'Guru', 'Teknisi', 'Koordinator Lab', 'Kepala Lab']) {
    const h = await harness('/aset-it?asset=7', { isAuthenticated: true, role, userId: 1 });
    try {
      assert.match(text(h), /Detail Aset IT Sekolah/, role);
      assert.equal(h.root.root.findAllByType('button').some(n => n.children.includes('Tambah aset')), role === 'Admin');
    } finally { await h.close(); }
  }
  for (const [entry, state] of [
    ['/aset-it?asset=7', { isAuthenticated: false }],
    ['/dashboard', { isAuthenticated: true, role: 'Guru' }],
  ]) {
    const h = await harness(entry, state);
    try { assert.equal(h.location.pathname, '/login'); assert.deepEqual(h.requests, []); }
    finally { await h.close(); }
  }
  const h = await harness('/verifikasi-aset/not-a-uuid', { isAuthenticated: false });
  try {
    assert.equal(h.location.pathname, '/verifikasi-aset/not-a-uuid');
    assert.match(text(h), /QR tidak valid/);
    assert.deepEqual(h.requests, []);
  } finally { await h.close(); }
});
