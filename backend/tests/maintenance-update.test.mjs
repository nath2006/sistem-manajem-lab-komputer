import test from 'node:test';
import assert from 'node:assert/strict';
import { controller, database, response } from './maintenance-helpers.mjs';

test('editing repair result synchronizes linked ticket and inspection in the same transaction', async () => {
 const db = database([[{ perbaikan_id: 8, user_id: 7, pengecekan_id: 3, perangkat_id_snapshot: 2 }], [{ pengecekan_id: 3, perangkat_id: 2, pemeriksaan_id: 4 }], [{ hasil_perbaikan: 'Gagal' }], []]);
 const { updatePerbaikan } = await controller('perbaikan', db);
 const res = response();
 await updatePerbaikan({ params: { id: 8 }, user: { id: 7, role: 'Teknisi' }, body: { user_id: 7, tanggal_perbaikan: '2026-11-02', tindakan: 'Uji kabel', hasil_perbaikan: 'Gagal' } }, res);
 assert.equal(res.code, 200);
 assert.ok(db.calls.some(c => /UPDATE pemeriksaan/.test(c.sql) && c.args.includes('Bermasalah')));
 assert.ok(db.calls.some(c => /UPDATE pengecekan/.test(c.sql) && c.args.includes('Menunggu Perbaikan')));
 assert.ok(db.calls.some(c => c.sql === 'COMMIT'));
 assert.match(db.calls.find(c => /SELECT \* FROM pengecekan/.test(c.sql)).sql, /FOR UPDATE/);
 assert.match(db.calls.find(c => /SELECT hasil_perbaikan/.test(c.sql)).sql, /ORDER BY perbaikan_id DESC LIMIT 1/);
 assert.match(db.calls.find(c => /UPDATE perangkat/.test(c.sql)).sql, /CASE WHEN EXISTS/);
 assert.deepEqual(db.calls.find(c => /UPDATE perbaikan SET tanggal_perbaikan/.test(c.sql)).args.slice(-2), [null, 8]);
});
