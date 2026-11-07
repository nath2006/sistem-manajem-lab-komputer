import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderUI } from './helpers/renderUI.js';

test('table primitive renders a local keyboard-scrollable responsive viewport', async () => {
  const html = await renderUI(`import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import Panel from './src/Components/DashboardTablePanel.jsx'; module.exports = renderToStaticMarkup(<Panel label="Labs"><table><tbody><tr><td>Lab A</td></tr></tbody></table></Panel>);`);
  assert.match(html, /overflow-x-auto/);
  assert.match(html, /md:max-h-\[440px\]/);
  assert.match(html, /tabindex="0"/);
  assert.match(html, /Lab A/);
});

test('user and lab icon actions have explicit accessible touch targets', async () => {
  for (const path of ['features/KelolaUser/User.jsx', 'features/KelolaLaboratorium/Laboratorium.jsx']) {
    const text = await source(path);
    const actions = [...text.matchAll(/<button\b[\s\S]*?<\/button>/g)].map(match => match[0]).filter(button => /FaEye|FaFilePen|FaTrash/.test(button));
    assert.equal(actions.length, 3);
    for (const button of actions) {
      assert.match(button, /type="button"/);
      assert.match(button, /aria-label=/);
      assert.match(button, /min-h-\[44px\]/);
      assert.match(button, /min-w-\[44px\]/);
    }
  }
});

test('primary troubleshooting controls use school theme without recoloring errors', async () => {
  const add = await source('Components/Pengecekan/AddPengecekan.jsx');
  assert.match(add, /bg-maroon hover:bg-maroon\/90/);
  assert.match(add, /role="alert"[^>]*text-red-600/);
  const queue = await source('features/KelolaPengecekan/PengecekanPerangkat.jsx');
  assert.ok(!queue.includes("'bg-red-600 text-white'"));
});

test('role shortcuts are keyboard-native responsive buttons', async () => {
  for (const role of ['Guru', 'KepalaLab', 'KoordinatorLab', 'Teknisi']) {
    const text = await source(`pages/${role}/${role}Dashboard.jsx`);
    assert.match(text, /<button\s+type="button"\s+className="[^"]*min-h-\[70px\]/);
    assert.ok(!text.includes('className="h-[70px]'));
  }
});

const source = path => readFile(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('admin starts every independent request before any resolves', async () => {
  const text = await source('pages/admin/AdminDashboard.jsx');
  const body = text.split('const fetchAdminDashboardData = async () => {')[1].split('\n  };')[0];
  const pending = [];
  const values = {};
  const loading = [];
  const run = new Function('get', 'setDashboardStats', 'setLabsData', 'setUsersData', 'setIsLoading', `return (async () => {${body}})()`);
  const task = run(path => new Promise(resolve => pending.push({ path, resolve })), value => values.stats = value, value => values.labs = value, value => values.users = value, value => loading.push(value));
  const count = pending.length;
  // Resolve sequential implementations too, so RED never leaves pending work.
  for (let i = 0; i < 3; i++) { pending[i]?.resolve({ data: i === 0 ? { totalUser: 7 } : [i] }); await new Promise(resolve => setImmediate(resolve)); }
  await task;
  assert.equal(count, 3);
  assert.deepEqual(loading, [false]);
  assert.deepEqual(values, { stats: { totalUser: 7 }, labs: [1], users: [2] });
});

test('admin preserves all-defaults-on-failure and response fallbacks', async () => {
  const text = await source('pages/admin/AdminDashboard.jsx');
  const body = text.split('const fetchAdminDashboardData = async () => {')[1].split('\n  };')[0];
  const run = new Function('get', 'setDashboardStats', 'setLabsData', 'setUsersData', 'console', 'setIsLoading', `return (async () => {${body}})()`);
  for (const fails of [false, true]) {
    const values = {};
    const loading = [];
    await run(async path => { if (fails && path.endsWith('labs-with-heads')) throw Error('offline'); return {}; }, v => values.stats = v, v => values.labs = v, v => values.users = v, { error() {} }, value => loading.push(value));
    assert.deepEqual(loading, [false]);
    assert.deepEqual(values, { stats: {}, labs: [], users: [] });
  }
});

test('dashboard table panels remove mobile fixed-height traps', async () => {
  for (const path of ['pages/admin/AdminDashboard.jsx', 'pages/KoordinatorLab/KoordinatorLabDashboard.jsx']) {
    const text = await source(path);
    assert.ok(text.includes('<DashboardTablePanel'), path);
    assert.ok(!text.includes('h-[500px]'), path);
  }
});
