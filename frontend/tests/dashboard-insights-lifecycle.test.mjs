import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { act, create } = require('react-test-renderer');
const bundle = await build({
  stdin: {
    contents: "export {default as DashboardInsights, DashboardInsightsView} from './src/Components/DashboardInsights.jsx'; export {AuthContext} from './src/Context/AuthContext.jsx';",
    resolveDir: process.cwd(), loader: 'jsx',
  },
  bundle: true, platform: 'node', format: 'cjs', write: false, jsx: 'automatic',
  external: ['react', 'react/jsx-runtime'],
  define: { 'import.meta.env': '{"PROD":false}' },
  plugins: [{ name: 'offline-api-boundary', setup(builder) {
    builder.onResolve({ filter: /utils\/api$/ }, () => ({ path: 'api', namespace: 'test' }));
    builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export const get=(...args)=>globalThis.__dashboardLifecycleGet(...args); export default {defaults:{headers:{common:{}}}};' }));
  } }],
});
const compiled = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(require, compiled, compiled.exports);
const { DashboardInsights, DashboardInsightsView, AuthContext } = compiled.exports;
const initialSession = { isAuthenticated: true, userId: 7, role: 'Guru', token: 'synthetic-session-a' };
const data = count => ({ tickets: { available: true, rows: [{ label: 'new', count }] }, assets: null });

async function mount(t) {
  const requests = [], intervals = new Map();
  const previous = Object.fromEntries(['window', 'setInterval', 'clearInterval', 'IS_REACT_ACT_ENVIRONMENT', '__dashboardLifecycleGet'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.window = new EventTarget();
  globalThis.setInterval = (callback, delay) => { assert.equal(delay, 60000); const id = Symbol(); intervals.set(id, callback); return id; };
  globalThis.clearInterval = id => intervals.delete(id);
  globalThis.__dashboardLifecycleGet = path => {
    assert.equal(path, '/dashboard/insights');
    return new Promise((resolve, reject) => requests.push({ resolve: value => resolve({ data: value }), reject }));
  };
  let renderer;
  const element = state => React.createElement(AuthContext.Provider, { value: { state, dispatch() {} } }, React.createElement(DashboardInsights));
  t.after(async () => {
    try { if (renderer) await act(async () => renderer.unmount()); }
    finally {
      for (const [key, descriptor] of Object.entries(previous)) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    }
  });
  await act(async () => { renderer = create(element(initialSession)); });
  return {
    requests, intervals,
    view: () => renderer.root.findByType(DashboardInsightsView).props,
    focus: () => act(async () => window.dispatchEvent(new Event('focus'))),
    interval: () => act(async () => { for (const callback of intervals.values()) callback(); }),
    resolve: (index, value) => act(async () => requests[index].resolve(value)),
    reject: index => act(async () => requests[index].reject(new Error('offline'))),
    session: state => act(async () => renderer.update(element(state))),
    unmount: () => act(async () => renderer.unmount()),
  };
}

test('mounted initial A cannot overwrite newer focus B after B resolves first', async t => {
  const h = await mount(t);
  assert.equal(h.view().loading, true);
  await h.focus();
  assert.equal(h.requests.length, 2);
  await h.resolve(1, data(9));
  assert.deepEqual(h.view().data, data(9));
  await h.resolve(0, data(2));
  assert.deepEqual(h.view().data, data(9), 'late initial response must not replace newer focus data');
  assert.equal(h.view().error, '');
  assert.equal(h.view().loading, false);
});

test('mounted late initial failure cannot replace newer focus success', async t => {
  const h = await mount(t);
  await h.focus();
  await h.resolve(1, data(9));
  await h.reject(0);
  assert.deepEqual(h.view().data, data(9));
  assert.equal(h.view().error, '', 'obsolete failure must not show an error over newer success');
  assert.equal(h.view().loading, false);
});

test('mounted older settlement cannot end loading while latest interval request is pending', async t => {
  const h = await mount(t);
  await h.interval();
  await h.resolve(0, data(2));
  assert.equal(h.view().data, null);
  assert.equal(h.view().loading, true, 'only latest request may finish initial loading');
  await h.resolve(1, data(9));
  assert.equal(h.view().loading, false);
  assert.deepEqual(h.view().data, data(9));
});

for (const [name, nextSession] of [
  ['same-account token replacement', { ...initialSession, token: 'synthetic-session-b' }],
  ['account change', { ...initialSession, userId: 8 }],
  ['role change', { ...initialSession, role: 'Admin' }],
  ['logout', { isAuthenticated: false, userId: null, role: null, token: null }],
]) {
  for (const outcome of ['success', 'failure']) {
    test(`mounted ${name} ignores old-session ${outcome} while latest session is pending`, async t => {
      const h = await mount(t);
      await h.session(nextSession);
      assert.equal(h.requests.length, 2);
      assert.equal(h.intervals.size, 1, 'previous effect interval must be cleaned up');
      if (outcome === 'success') await h.resolve(0, data(2));
      else await h.reject(0);
      assert.equal(h.view().data, null);
      assert.equal(h.view().error, '');
      assert.equal(h.view().loading, true);
      await h.resolve(1, data(9));
      assert.deepEqual(h.view().data, data(9));
      await h.focus();
      assert.equal(h.requests.length, 3, 'only current effect may listen for focus');
      await h.resolve(2, data(10));
      assert.deepEqual(h.view().data, data(10));
    });
  }
}

test('mounted latest availability response stays unavailable, refresh errors preserve real data and retry recovers', async t => {
  const h = await mount(t);
  const unavailable = { tickets: { available: false, rows: [], reason: 'Skema ticketing belum tersedia.' }, assets: null };
  await h.resolve(0, unavailable);
  assert.deepEqual(h.view().data, unavailable);
  await h.focus();
  assert.deepEqual(h.view().data, unavailable, 'background refresh must retain prior availability state');
  await h.reject(1);
  assert.deepEqual(h.view().data, unavailable, 'request failure must not manufacture zero totals');
  assert.equal(h.view().error, 'Gagal memuat ringkasan.');
  await act(async () => h.view().onRetry());
  assert.equal(h.view().loading, true);
  assert.equal(h.view().error, '');
  assert.deepEqual(h.view().data, unavailable, 'retry retains prior data while pending');
  await h.resolve(2, data(12));
  assert.deepEqual(h.view().data, data(12));
  assert.equal(h.view().error, '');
  assert.equal(h.view().loading, false);
});

test('mounted retry cleanup prevents late prior-effect success from clearing latest error', async t => {
  const h = await mount(t);
  await h.focus();
  await h.reject(1);
  await act(async () => h.view().onRetry());
  await h.reject(2);
  await h.resolve(0, data(2));
  assert.equal(h.view().data, null);
  assert.equal(h.view().error, 'Gagal memuat ringkasan.');
  assert.equal(h.view().loading, false);
});

test('unmount cleanup removes interval and focus listener before deferred requests settle', async t => {
  const h = await mount(t);
  await h.focus();
  await h.unmount();
  assert.equal(h.intervals.size, 0);
  await h.focus();
  assert.equal(h.requests.length, 2, 'unmounted instance must not refresh');
  await h.resolve(0, data(2));
  await h.reject(1);
});
