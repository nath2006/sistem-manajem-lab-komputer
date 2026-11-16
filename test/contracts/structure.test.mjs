import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ignored = new Set(['node_modules', '.git', '.vscode', 'dist', 'uploads', 'generated', '.flowbite-react']);
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (ignored.has(entry.name)) return [];
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

test('all project test files and review tooling are centralized under root test', () => {
  for (const old of ['frontend/tests', 'backend/tests', 'tests', 'backend/scripts', 'backend/prisma/seed.js']) {
    assert.equal(existsSync(resolve(root, old)), false, `${old} must be moved, not duplicated`);
  }
  const tests = files(root).filter(path => /\.test\.(?:mjs|js)$/.test(path));
  assert.ok(tests.length >= 118, 'retain the original 118 test files and new contract coverage');
  assert.ok(tests.every(path => path.startsWith(resolve(root, 'test') + (process.platform === 'win32' ? '\\' : '/'))));
});

test('the single project Markdown document and root OpenAPI spec are present', () => {
  const markdown = files(root).filter(path => /\.md$/i.test(path));
  assert.deepEqual(markdown, [resolve(root, 'README.md')]);
  const readme = readFileSync(markdown[0], 'utf8');
  assert.match(readme, /use case/i);
  assert.match(readme, /activity diagram/i);
  assert.match(readme, /```mermaid/);
  assert.match(readme, /openapi\.json/);
  assert.ok(Object.keys(JSON.parse(readFileSync(resolve(root, 'openapi.json'), 'utf8')).paths).length > 0);
});

test('root and application test commands share one portable runner', () => {
  const rootPackage = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  assert.equal(rootPackage.scripts.test, 'node test/run.mjs');
  for (const name of ['frontend', 'backend']) {
    const packageJson = JSON.parse(readFileSync(resolve(root, name, 'package.json'), 'utf8'));
    assert.equal(packageJson.scripts.test, `node ../test/run.mjs ${name}`);
  }
  const invalid = spawnSync(process.execPath, [resolve(root, 'test/run.mjs'), 'unknown-suite'], { encoding: 'utf8' });
  assert.equal(invalid.status, 2);
  assert.match(invalid.stderr, /Usage:/);
});
