import test from 'node:test';
import assert from 'node:assert/strict';
import { controller, database, response } from './maintenance-helpers.mjs';

const actor = { id: 7, role: 'Teknisi' };
const repairBody = { pengecekan_id: 3, user_id: 99, tanggal_perbaikan: '2026-11-02', tindakan: 'Ganti kabel', hasil_perbaikan: 'Berhasil' };

test('successful repair retains the source and synchronizes inspection and device atomically', async () => {
  const db = database([[{ perangkat_id: 2, pemeriksaan_id: 4, status_pengecekan: 'Baru' }], []]);
  const { createPerbaikan } = await controller('perbaikan', db);
  const res = response();
  await createPerbaikan({ body: repairBody, user: actor }, res);
  assert.equal(res.code, 201);
  assert.match(db.calls.find(c => /SELECT \* FROM pengecekan/.test(c.sql)).sql, /FOR UPDATE/);
  assert.deepEqual(db.calls.find(c => /UPDATE perbaikan SET tanggal_selesai_perbaikan/.test(c.sql)).args, ['2026-11-02', 11]);
  assert.ok(!db.calls.some(c => /DELETE FROM pengecekan/i.test(c.sql)), 'history link must be retained');
  assert.ok(db.calls.some(c => /UPDATE pemeriksaan/i.test(c.sql) && c.args.includes('Baik')));
  assert.ok(db.calls.some(c => /UPDATE perangkat/i.test(c.sql)));
  assert.ok(db.calls.some(c => /UPDATE pengecekan/i.test(c.sql) && c.args.includes('Sudah Ditangani')));
  const insert = db.calls.find(c => /INSERT INTO perbaikan/i.test(c.sql));
  assert.equal(insert.args[1], actor.id, 'actor comes from verified token, not body');
  assert.ok(db.calls.findIndex(c => /UPDATE perangkat/i.test(c.sql)) < db.calls.findIndex(c => c.sql === 'COMMIT'));
});
