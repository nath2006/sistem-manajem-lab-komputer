import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import process from 'node:process';

const require = createRequire(import.meta.url);

// Isolate callers from shell/context lifecycle and the separately-owned skeleton.
async function renderComponent(file, props = {}, { role = 'Admin', stateOverrides = {} } = {}) {
  const result = await build({
    stdin: { contents: `import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import Component from './src/Components/${file}.jsx'; module.exports=renderToStaticMarkup(<Component {...${JSON.stringify(props)}} />);`, loader: 'jsx', resolveDir: process.cwd() },
    bundle: true, platform: 'node', format: 'cjs', write: false, jsx: 'automatic',
    external: ['react', 'react/jsx-runtime', 'react-dom/server'],
    define: { 'import.meta.env': '{}' },
    plugins: [{ name: 'caller-fixtures', setup(builder) {
      builder.onResolve({ filter: /^react-router-dom$|Loading\/Skeleton$|Context\/|Layouts\/|utils\/api$|utils\/useTitle$|DetailModal\/ModalContainer$|FormContainer$/ }, args => ({ path: args.path, namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path: name }) => {
        let contents;
        if (name.includes('Loading/Skeleton')) contents = `export default function Skeleton({variant,label}) { return <div role="status" data-skeleton={variant}>{label}</div> } export function SkeletonRows({columns,label}) {return <tr data-skeleton="rows"><td colSpan={columns}>{label}</td></tr>}`;
        else if (name === 'react-router-dom') contents = `export function useNavigate(){return ()=>{}} export function useLocation(){return {state:{}}}`;
        else if (name.includes('AuthContext')) contents = `import {createContext} from 'react'; export const AuthContext=createContext({state:{role:${JSON.stringify(role)},userId:1,lab_id_kepala:2,isLoading:false,isAuthenticated:true}});`;
        else if (name.includes('SettingsContext')) contents = `export function useSettings(){return {settings:{},loaded:false,loading:true,error:null,reloadSettings(){}}}`;
        else if (name.includes('utils/api')) contents = `export const get=()=>new Promise(()=>{}); export const post=get; export const put=get; export const putWithFile=get; export const postWithFile=get;`;
        else if (name.includes('useTitle')) contents = 'export default function useTitle(){}';
        else contents = 'export default function Container({children,primaryButton,error}){return <section>{error && <p role="alert">{error}</p>}{children}{primaryButton}</section>}';
        return { contents, loader: 'jsx', resolveDir: process.cwd() };
      });
    } }],
  });
  const module = { exports: {} };
  const React = require('react'); let stateIndex = 0;
  const isolatedRequire = name => name === 'react' ? { ...React, useState(initial) { const index = stateIndex++; return React.useState(Object.hasOwn(stateOverrides, index) ? stateOverrides[index] : initial); } } : require(name);
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(isolatedRequire, module, module.exports);
  return module.exports;
}

for (const file of ['DataLab/AddLabaratorium', 'KelolaJadwalLab/AddJadwalLab', 'Perangkat/AddPerangkat', 'Pengecekan/AddPengecekan']) {
  test(`${file} reserves form space until initial options arrive`, async () => {
    const html = await renderComponent(file, file.includes('AddPengecekan') ? { onClose: true } : {});
    assert.match(html, /data-skeleton="form"/);
    assert.doesNotMatch(html, /<select/);
    if (file.includes('AddPengecekan')) assert.match(html, /<button disabled=""/);
  });
}

test('schedule status uses tbody-compatible skeleton rows', async () => {
  const html = await renderComponent('KelolaJadwalLab/PengecekanStatus');
  assert.match(html, /<tr data-skeleton="rows"><td colSpan="12">/);
  assert.doesNotMatch(html, /animate-spin/);
});

test('edit lab reserves pending user options after detail is available', async () => {
  const html = await renderComponent('DataLab/EditLaboratorium', { id: 1 }, { stateOverrides: { 4: false } });
  assert.match(html, /data-skeleton="text"/);
  assert.match(html, /<button disabled=""/);
  assert.match(html, /name="nama_lab"/);
});

test('edit device reserves pending lab options without hiding loaded fields', async () => {
  const html = await renderComponent('Perangkat/EditPerangkat', { id: 1 }, { stateOverrides: { 5: false, 6: true } });
  assert.match(html, /data-skeleton="text"/);
  assert.match(html, /name="nama_perangkat"/);
  assert.match(html, /disabled=""[^>]*>Update Perangkat/);
});

test('assigned device lab name has a skeleton while unresolved', async () => {
  const html = await renderComponent('Perangkat/AddPerangkat', {}, { role: 'Kepala Lab' });
  assert.match(html, /data-skeleton="text"/);
});

test('empty or failed lab options settle without an endless loading label', async () => {
  const html = await renderComponent('DataLab/AddLabaratorium', {}, { stateOverrides: { 3: false } });
  assert.doesNotMatch(html, /data-skeleton|Memuat daftar user/);
  assert.match(html, /Daftar user tidak tersedia/);
  assert.match(html, /name="nama_lab"/);
});

test('loaded troubleshooting fields and saving button remain visible', async () => {
  const html = await renderComponent('Pengecekan/AddPengecekan', { onClose: true }, { stateOverrides: { 2: false, 3: true } });
  assert.doesNotMatch(html, /data-skeleton/);
  assert.match(html, /name="perangkat_id"/);
  assert.match(html, /Menyimpan/);
  assert.match(html, /<button disabled=""/);
});

test('history errors and legacy history do not masquerade as loading', async () => {
  const failed = await renderComponent('Pemeriksaan/MaintenanceHistory', { pengecekanId: 12 }, { stateOverrides: { 0: { error: 'Tidak tersedia' } } });
  assert.match(failed, /role="alert"/);
  assert.doesNotMatch(failed, /data-skeleton/);
  const legacy = await renderComponent('Pemeriksaan/MaintenanceHistory', {}, { stateOverrides: { 0: { legacy: true } } });
  assert.match(legacy, /Data lama/);
  assert.doesNotMatch(legacy, /data-skeleton/);
});

test('synchronous add user and repair forms never get an initial skeleton', async () => {
  for (const file of ['User/AddUser', 'Perbaikan/AddPerbaikan', 'Pengumuman/AddPengumuman']) {
    const html = await renderComponent(file);
    assert.doesNotMatch(html, /data-skeleton/);
    assert.match(html, /<(input|textarea)/);
  }
});

test('loaded schedule rows remain visible while refreshing', async () => {
  const html = await renderComponent('KelolaJadwalLab/PengecekanStatus', {}, { stateOverrides: { 0: [{ pengajuan_id: 1 }] } });
  assert.doesNotMatch(html, /data-skeleton/);
});

test('maintenance history reserves detail space while its initial request is pending', async () => {
  const html = await renderComponent('Pemeriksaan/MaintenanceHistory', { pengecekanId: 12 });
  assert.match(html, /data-skeleton="detail"/);
  assert.match(html, /Memuat riwayat/);
});
