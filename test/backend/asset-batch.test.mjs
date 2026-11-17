import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import { createAssetRouter } from '../../backend/router/assetRoutes.js';
import { createAssetService } from '../../backend/services/assetService.js';
const actor = { id: 7, role: 'Admin' };
const payload = (overrides = {}) => ({ jumlah: 3, awalan_nomor_inventaris: 'TU-2026', aset: { nama_perangkat: 'Printer', penggunaan: 'Operasional', kategori: 'Printer', lab_id: null, harga_beli: '9999999999999.99' }, ...overrides });
function fixture({ failAt } = {}) {
  let rows = [], snapshot, inserts = 0, commits = 0, rollbacks = 0, connections = 0;
  const c = {
    async beginTransaction() { snapshot = structuredClone(rows); },
    async commit() { commits++; }, async rollback() { rows = snapshot; rollbacks++; }, release() {},
    async query(sql, values) {
      if (sql.startsWith('INSERT INTO perangkat')) {
        inserts++;
        if (inserts === failAt) throw new Error('synthetic write failure');
        const fields = sql.match(/\(([^)]+)\)/)[1].split(',');
        const row = Object.fromEntries(fields.map((f, i) => [f, values[i]]));
        if (rows.some(r => r.nomor_inventaris === row.nomor_inventaris)) throw Object.assign(new Error('private SQL detail'), { code: 'ER_DUP_ENTRY' });
        row.perangkat_id = 10 + inserts * 7;
        rows.push({ status: 'Baik', foto_perangkat: null, ...row });
        return [{ insertId: row.perangkat_id }];
      }
      if (sql.startsWith('SELECT * FROM perangkat')) return [rows.filter(r => r.perangkat_id === values[0])];
      if (sql.startsWith('SELECT pengecekan_id')) return [[]];
      if (sql.startsWith('UPDATE perangkat')) {
        const row = rows.find(r => r.perangkat_id === values.at(-1));
        const fields = sql.split(' SET ')[1].split(' WHERE ')[0].split(',').map(v => v.split('=')[0]);
        fields.forEach((key, index) => { row[key] = values[index]; });
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('SELECT p.perangkat_id')) return [rows.filter(r => r.perangkat_id === values[0]).map(r => ({ ...r, nama_lab: null, active_condition_findings: 0 }))];
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
  const db = { async getConnection() { connections++; return c; }, async query() {
    return [[...['penggunaan', 'kategori', 'lokasi', 'tahun_pengadaan', 'sumber_dana', 'harga_beli', 'lab_id'].map(COLUMN_NAME => ({ COLUMN_NAME, IS_NULLABLE: 'YES', COLUMN_TYPE: ({ penggunaan: "enum('Pembelajaran','Operasional')", kategori: "enum('Komputer','Laptop','Monitor','Printer','Perangkat Jaringan','Proyektor','Lainnya')", harga_beli: 'decimal(15,2)' })[COLUMN_NAME] }))]];
  } };
  return { db, service: createAssetService(db), rows: () => rows, stats: () => ({ commits, rollbacks, connections }) };
}
test('batch strictly validates quantity, exact prefix, scope and both allowlists before connecting', async () => {
  const cases = [null, [], {}, ...[0, 101, -1, 1.5, '2', null, true].map(jumlah => payload({ jumlah })),
    ...['', ' ', ' A', 'A ', 'A'.repeat(47), null, 4].map(awalan_nomor_inventaris => payload({ awalan_nomor_inventaris })),
    ...['id', 'perangkat_id', 'qr_code', 'actor', 'user_id', 'unknown'].map(key => ({ ...payload(), [key]: 7 })),
    ...['nomor_inventaris', 'id', 'perangkat_id', 'qr_code', 'actor', 'unknown'].map(key => payload({ aset: { ...payload().aset, [key]: 'x' } })),
    payload({ aset: { ...payload().aset, penggunaan: 'Pembelajaran', lab_id: 1 } }),
    payload({ aset: { ...payload().aset, lab_id: '' } }), payload({ aset: { ...payload().aset, lab_id: 1 } })];
  for (const body of cases) {
    const f = fixture();
    await assert.rejects(() => f.service.createBatch(actor, body), e => e.status === 400, JSON.stringify(body));
    assert.equal(f.stats().connections, 0);
  }
});
test('batch denies non-Admin actors before DB access', async () => {
  for (const user of [null, { role: 'Kepala Lab', id: 1 }, { role: 'Teknisi', id: 1 }, { role: 'Guru', id: 1 }]) {
    const f = fixture(); await assert.rejects(() => f.service.createBatch(user, payload()), e => e.status === 403);
    assert.equal(f.stats().connections, 0);
  }
});
test('batch creates independently identified units in one transaction without QR issuance', async () => {
  const f = fixture();
  assert.equal(typeof f.service.createBatch, 'function');
  const result = await f.service.createBatch(actor, payload());
  assert.equal(result.created_count, 3);
  assert.deepEqual(result.assets.map(r => r.perangkat_id), [17, 24, 31]);
  assert.deepEqual(result.assets.map(r => r.nomor_inventaris), ['TU-2026-001', 'TU-2026-002', 'TU-2026-003']);
  for (const row of result.assets) {
    assert.equal(row.harga_beli, '9999999999999.99');
    assert.equal(row.status, 'Baik'); assert.equal(row.condition_editable, true);
    assert.equal(row.lab_id, null); assert.equal(row.qr_code, undefined);
  }
  assert.deepEqual(f.stats(), { commits: 1, rollbacks: 0, connections: 1 });
});

test('batch units support independent damage edits through existing maintenance-aware update', async () => {
  const f = fixture(); const result = await f.service.createBatch(actor, payload());
  const damaged = await f.service.update(actor, result.assets[1].perangkat_id, { status: 'Rusak' });
  assert.equal(damaged.status, 'Rusak');
  assert.deepEqual(f.rows().map(row => row.status), ['Baik', 'Rusak', 'Baik']);
  assert.deepEqual(f.rows().map(row => row.perangkat_id), result.assets.map(row => row.perangkat_id));
});
test('a collision after an earlier unit insert rolls back only the attempted batch', async () => {
  const f = fixture(); await f.service.create(actor, { ...payload().aset, nomor_inventaris: 'TU-2026-002' });
  const before = structuredClone(f.rows());
  await assert.rejects(() => f.service.createBatch(actor, payload()), error => error.code === 'ER_DUP_ENTRY');
  assert.deepEqual(f.rows(), before);
});
test('batch rollback on middle write failure and duplicate retry never adds rows', async () => {
  const failed = fixture({ failAt: 2 });
  await assert.rejects(() => failed.service.createBatch(actor, payload()), /synthetic/);
  assert.equal(failed.rows().length, 0); assert.equal(failed.stats().rollbacks, 1);
  const f = fixture(); await f.service.createBatch(actor, payload());
  await assert.rejects(() => f.service.createBatch(actor, payload()), e => e.code === 'ER_DUP_ENTRY');
  assert.equal(f.rows().length, 3); assert.equal(f.stats().commits, 1);
});
test('batch preserves exact internal prefix and reuses common normalization and explicit condition', async () => {
  const f = fixture(); const body = payload({ jumlah: 1, awalan_nomor_inventaris: 'TU / Printer' });
  Object.assign(body.aset, { nama_perangkat: ' Printer baru ', spesifikasi: ' Duplex ', lokasi: ' TU ', tahun_pengadaan: '1900', sumber_dana: ' BOS ', harga_beli: '000.0', status: 'Rusak' });
  const { assets: [row] } = await f.service.createBatch(actor, body);
  assert.equal(row.nomor_inventaris, 'TU / Printer-001');
  assert.equal(row.nama_perangkat, 'Printer baru'); assert.equal(row.spesifikasi, 'Duplex');
  assert.equal(row.lokasi, 'TU'); assert.equal(row.tahun_pengadaan, 1900);
  assert.equal(row.sumber_dana, 'BOS'); assert.equal(row.harga_beli, '0.00'); assert.equal(row.status, 'Rusak');
});
test('quantity and prefix upper bounds preserve suffix 100 and nullable per-unit procurement', async () => {
  const f = fixture(); const body = payload({ jumlah: 100, awalan_nomor_inventaris: 'A'.repeat(46) });
  body.aset.harga_beli = ''; body.aset.tahun_pengadaan = null; body.aset.sumber_dana = '';
  const result = await f.service.createBatch(actor, body);
  assert.equal(result.assets.length, 100);
  assert.equal(result.assets[99].nomor_inventaris, 'A'.repeat(46) + '-100');
  for (const row of result.assets) assert.equal(row.harga_beli, null);
  const one = await fixture().service.createBatch(actor, payload({ jumlah: 1, awalan_nomor_inventaris: 'X' }));
  assert.equal(one.created_count, 1);
});
test('mounted batch authenticates JWT actor, returns full projections and safe conflict', async () => {
  const f = fixture(); const app = express(); app.use(express.json());
  app.use('/api/assets', createAssetRouter(f.db, (req, res, next) => {
    if (!req.headers.authorization) return res.sendStatus(403);
    try { req.user = jwt.verify(req.headers.authorization.replace('Bearer ', ''), 'synthetic-batch-only'); next(); }
    catch { res.sendStatus(401); }
  }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r));
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/assets/batch`;
    const post = token => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload()) });
    assert.equal((await post()).status, 403); assert.equal((await post('forged')).status, 401);
    assert.equal((await post(jwt.sign({ role: 'Kepala Lab', id: 7 }, 'synthetic-batch-only'))).status, 403);
    const token = jwt.sign(actor, 'synthetic-batch-only');
    const response = await post(token); assert.equal(response.status, 201);
    assert.equal((await response.json()).data.created_count, 3);
    const conflict = await post(token); assert.equal(conflict.status, 409);
    assert.deepEqual(await conflict.json(), { message: 'Nomor inventaris sudah digunakan.' });
    assert.equal(f.rows().length, 3);
  } finally { await new Promise(r => server.close(r)); }
});
