import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import bcrypt from 'bcrypt';

async function seedHarness(database = 'simlab_review_20261102112805') {
  const original = await readFile(new URL('../prisma/seed.js', import.meta.url), 'utf8');
  const entry = original.lastIndexOf('\nmain()');
  const source = original.slice(0, entry).replace(/^import .*;\s*$/gm, '') + '\nglobalThis.finished = main();';
  const calls = [];
  const context = vm.createContext({ bcrypt, URL, console: { log() {} }, process: { env: { SEED_REVIEW_DATABASE: database, DB_HOST: 'localhost', DB_USER: 'test', DB_PASSWORD: 'test', DB_PORT: '3306' } }, PrismaClient: class {
    constructor(options) { calls.push({ type: 'connection', options }); }
    user = {
      upsert: async args => { calls.push({ type: 'upsert', args }); return {}; },
      updateMany: async args => { calls.push({ type: 'reset', args }); return { count: 8 }; },
    };
    laboratorium = { upsert: async () => ({ lab_id: 1 }) };
    perangkat = { upsert: async () => ({}) };
  } });
  vm.runInContext(source, context);
  await context.finished;
  return calls;
}

test('seeder menghasilkan bcrypt 123 untuk akun baru dan mereset seluruh akun existing', async () => {
  const calls = await seedHarness();
  const reset = calls.find(call => call.type === 'reset');
  assert.ok(reset, 'seluruh akun existing harus direset, bukan hanya empat username bawaan');
  assert.equal(await bcrypt.compare('123', reset.args.data.password), true);
  assert.notEqual(reset.args.data.password, '123');
  for (const call of calls.filter(call => call.type === 'upsert')) {
    assert.equal(await bcrypt.compare('123', call.args.create.password), true);
    assert.equal(await bcrypt.compare('123', call.args.update.password), true);
  }
});

test('seeder menolak nama database di luar review sebelum membuka koneksi', async () => {
  await assert.rejects(seedHarness('database_lama'), /review/i);
});
