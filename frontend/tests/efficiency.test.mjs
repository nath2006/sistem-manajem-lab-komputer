import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

test('login entry defers feature routes and PDF dependencies', async () => {
  const result = await build({entryPoints:['src/App.jsx'], bundle:true, splitting:true, format:'esm', outdir:'unused', write:false, metafile:true, loader:{'.png':'dataurl'}, define:{'import.meta.env':'{}'}});
  const outputs = result.metafile.outputs;
  const entryName = Object.keys(outputs).find(path => outputs[path].entryPoint === 'src/App.jsx');
  const visited = new Set();
  function walk(path) {
    if (visited.has(path)) return;
    visited.add(path);
    const output = outputs[path];
    assert.ok(output, path);
    assert.equal(Object.keys(output.inputs).some(input => /node_modules\/(jspdf|jspdf-autotable)\//.test(input)), false, path);
    for (const imported of output.imports) if (!imported.external && imported.kind !== 'dynamic-import') walk(imported.path);
  }
  walk(entryName);
  assert.ok(outputs[entryName].imports.some(item => item.kind === 'dynamic-import'));
});

test('real deferred PDF tools generate a table and valid PDF bytes', async () => {
  const path = new URL('../src/utils/loadPdfTools.js', import.meta.url);
  const source = await readFile(path, 'utf8').catch(() => '');
  assert.ok(source.includes('import('), 'PDF loader must exist and defer dependencies');
  const { loadPdfTools } = await import(path);
  const [a,b] = await Promise.all([loadPdfTools(), loadPdfTools()]);
  assert.equal(a, b);
  const doc = new a.jsPDF({orientation:'landscape', unit:'mm', format:'a4'});
  a.autoTable(doc, {head:[['Lab']], body:[['Komputer']]});
  assert.equal(doc.getNumberOfPages(), 1);
  assert.match(doc.output(), /^%PDF-/);
  assert.ok(doc.lastAutoTable.finalY > 0);
});
