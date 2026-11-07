import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('tombol aktif menggunakan pointer dan tombol disabled tidak memberi kesan dapat diklik', async () => {
  const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');
  assert.match(css, /button:not\(:disabled\)[^{]*\{\s*cursor:\s*pointer\s*;/);
  assert.match(css, /button:disabled[^{]*\{\s*cursor:\s*not-allowed\s*;/);
});
