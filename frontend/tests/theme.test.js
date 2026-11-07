import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import process from 'node:process';

// Render real shared UI; default school color is intentionally not baked into markup.
async function renderThemeComponents() {
  const result = await build({ stdin: { contents: `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { MemoryRouter } from 'react-router-dom';
    import FormContainer from './src/Components/FormContainer/index.jsx';
    import Table from './src/Layouts/Table.jsx';
    import CardStatAdmin from './src/Components/cardDashboard/CardStatAdmin.jsx';
    import CardDashboard from './src/Components/cardDashboard/CardDashboard.jsx';
    import Footer from './src/Components/Footer.jsx';
    const render = component => renderToStaticMarkup(<MemoryRouter>{component}</MemoryRouter>);
    module.exports = {
      form: render(<FormContainer title="Pengaturan Sekolah" />),
      table: render(<Table title="User" headers={[]} data={[]} to="/add-user" />),
      stats: render(<CardStatAdmin icon={() => <svg />} count={4} label="User" />),
      card: render(<CardDashboard to="/user" title="Data User" count={4} description="Lihat data" />),
      footer: render(<Footer />),
    };`, resolveDir: process.cwd(), loader: 'jsx' }, bundle: true, platform: 'node', format: 'cjs', write: false, define: { 'import.meta.env': '{}' } });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
  return module.exports;
}
const markup = renderThemeComponents();

test('custom select hover uses the same school color variable', async () => {
  const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');
  assert.match(css, /\.select-option:hover option:hover\s*\{\s*background-color:\s*var\(--color-maroon\)/);
});

test('settings form primary/secondary buttons and table add action follow school color on hover', async () => {
  const { form, table } = await markup;
  assert.match(form, /bg-maroon/);
  assert.match(form, /text-maroon/);
  assert.match(form, /hover:bg-maroon\/90/);
  assert.doesNotMatch(form + table, /(?:hover:|focus:)?(?:bg|text|border|ring)-red-\d+/);
  assert.match(table, /hover:bg-maroon\/90/);
});

test('statistics icons, dashboard titles and copyright use theme tokens, not red palette', async () => {
  const { stats, card, footer } = await markup;
  assert.match(stats, /bg-maroon/);
  assert.match(stats + card + footer, /text-maroon/);
  assert.doesNotMatch(stats + card + footer, /(?:group-hover:|hover:)?(?:bg|text|border)-red-\d+/);
});

test('lab/user action icons and schedule navigation do not switch back to static colors', async () => {
  for (const relative of ['features/KelolaLaboratorium/Laboratorium.jsx', 'features/KelolaUser/User.jsx', 'features/LihatJadwalLab/JadwalLab.jsx']) {
    const source = await readFile(new URL(`../src/${relative}`, import.meta.url), 'utf8');
    const buttons = source.match(/<button\b[\s\S]*?<\/button>/g) || [];
    assert.ok(buttons.length > 0, relative);
    for (const button of buttons) {
      assert.doesNotMatch(button, /(?:hover:|focus:)?(?:bg|text|border|ring)-(?:red|blue|teal|purple)-\d+/, relative);
      assert.match(button, /(?:bg|text)-maroon/, relative);
    }
  }
});

test('lab/user edit actions and shared close buttons retain theme color in modals', async () => {
  for (const relative of ['Components/User/EditUser.jsx', 'Components/User/AddUser.jsx', 'Components/DataLab/EditLaboratorium.jsx', 'Components/Perangkat/EditPerangkat.jsx', 'Components/DetailModal/ModalContainer.jsx']) {
    const source = await readFile(new URL(`../src/${relative}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /(?:hover:|focus:)(?:bg|text|border|ring)-red-\d+/, relative);
    for (const button of source.match(/<button\b[\s\S]*?<\/button>/g) || []) {
      assert.doesNotMatch(button, /(?:bg|text|border)-red-\d+/, relative);
    }
  }
});
