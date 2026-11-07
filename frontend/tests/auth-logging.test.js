import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('auth context does not log raw tokens, decoded identities or the entire session state', async () => {
  const source=await readFile(new URL('../src/Context/AuthContext.jsx',import.meta.url),'utf8');
  const sensitiveLogs=source.split('\n').filter(line => /console\.(log|warn|error)/.test(line) && /\b(token|state|userDataFromToken)\b/.test(line));
  assert.equal(sensitiveLogs.length,0,'Sensitive auth values must never be passed to the browser console');
});

test('token validation and schedule status do not expose decoded identities or full auth state', async () => {
  for (const relative of ['utils/tokenValidator.js','Components/KelolaJadwalLab/PengecekanStatus.jsx']) {
    const source=await readFile(new URL(`../src/${relative}`,import.meta.url),'utf8');
    const sensitiveLogs=source.split('\n').filter(line => /console\.(log|warn|error)/.test(line) && /,\s*(decoded|authState)\s*\)/.test(line));
    assert.equal(sensitiveLogs.length,0,relative);
  }
});
