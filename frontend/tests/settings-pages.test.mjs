import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Bundle the actual JSX with deterministic network/layout boundaries; no browser dependencies.
test('settings provider defaults, admin settings form and activity loading render', async () => {
  const result = await build({
    stdin: { contents: `
      import React from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import { SettingsProvider, useSettings } from './src/Context/SettingsContext.jsx';
      import Pengaturan from './src/features/Pengaturan/Pengaturan.jsx';
      import LogAktivitas from './src/features/LogAktivitas/LogAktivitas.jsx';
      import { AuthContext } from './src/Context/AuthContext.jsx';
      function Fallback() { const { settings, refreshSettings, loaded } = useSettings(); return <span>{settings.school_name}|{typeof refreshSettings}|ready:{String(loaded)}</span>; }
      function Probe() { const { settings } = useSettings(); return <span>{settings.school_name}|{settings.lesson_duration}</span>; }
      const render = (component, role) => renderToStaticMarkup(<AuthContext.Provider value={{state:{role}}}><SettingsProvider>{component}</SettingsProvider></AuthContext.Provider>);
      console.log(JSON.stringify({ fallback: renderToStaticMarkup(<Fallback/>), defaults: render(<Probe/>, 'Admin'), settings: render(<Pengaturan/>, 'Admin'), denied: render(<Pengaturan/>, 'Guru'), logs: render(<LogAktivitas/>, 'Admin') }));
    `, resolveDir: process.cwd(), loader: 'jsx' },
    bundle: true, platform: 'node', format: 'cjs', write: false, jsx: 'automatic',
    plugins: [{ name: 'boundaries', setup(build) {
      build.onResolve({ filter: /Layouts\/Dashboard$/ }, () => ({path:'dashboard',namespace:'test'}));
      build.onResolve({ filter: /utils\/api$/ }, () => ({path:'api',namespace:'test'}));
      build.onResolve({ filter: /Context\/AuthContext(\.jsx)?$/ }, () => ({path:'auth',namespace:'test'}));
      build.onLoad({ filter: /.*/, namespace: 'test' }, ({path}) => ({ contents: path === 'dashboard' ? "export default function Dashboard({children}) {return children}" : path === 'auth' ? "import {createContext} from 'react'; export const AuthContext=createContext();" : "export default {get:async()=>({data:{data:{}}}), put:async()=>({data:{data:{}}})};", loader:'js', resolveDir: process.cwd() }));
    } }],
  });
  const folder = await mkdtemp(join(process.env.TMPDIR || join(process.env.LOCALAPPDATA, 'hermes', 'cache', 'scratch'), 'settings-test-'));
  try {
    const path = join(folder, 'bundle.cjs'); await writeFile(path, result.outputFiles[0].text);
    const child = spawnSync(process.execPath, [path], {encoding:'utf8'});
    assert.equal(child.status, 0, child.stderr);
    const output = JSON.parse(child.stdout);
    assert.match(output.fallback, /Sekolah Anda\|function\|ready:false/);
    assert.match(output.defaults, /Sekolah Anda\|60/);
    assert.match(output.settings, /Nama sekolah/);
    assert.match(output.settings, /Durasi pelajaran/);
    assert.match(output.denied, /Hanya Admin/);
    assert.match(output.logs, /Memuat log/);
  } finally { await rm(folder, {recursive:true, force:true}); }
});
