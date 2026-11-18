import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';

const module = await import('../../backend/router/inventoryExportRoutes.js').catch(() => ({}));
const secret = 'synthetic-inventory-export-test-only';
async function fixture(t, { role = 'Admin', currentRole = role, deleted = false, rows = [] } = {}) {
  assert.equal(typeof module.createInventoryExportRouter, 'function', 'export router factory must exist');
  const calls = [];
  const db = { async query(sql, params = []) {
    calls.push({ sql, params });
    assert.match(sql.trim(), /^SELECT\b/i);
    if (/FROM user\b/i.test(sql)) return [deleted ? [] : [{ role: currentRole }]];
    if (/information_schema/.test(sql)) return [[
      ...['penggunaan','kategori','lokasi','tahun_pengadaan','sumber_dana','harga_beli','lab_id'].map(COLUMN_NAME => ({ COLUMN_NAME, IS_NULLABLE: 'YES', COLUMN_TYPE: COLUMN_NAME === 'harga_beli' ? 'decimal(15,2)' : COLUMN_NAME === 'penggunaan' ? "enum('Pembelajaran','Operasional')" : COLUMN_NAME === 'kategori' ? "enum('Komputer','Laptop','Monitor','Printer','Perangkat Jaringan','Proyektor','Lainnya')" : 'text' }))
    ]];
    const ids = params.filter(value => Number.isInteger(value));
    return [rows.filter(row => ids.includes(row.perangkat_id) && (/p.lab_id IS NULL/.test(sql) ? row.penggunaan === 'Operasional' && row.lab_id === null : row.lab_id !== null && row.penggunaan !== 'Operasional') && (!/p.kategori = \?/.test(sql) || row.kategori === params.at(-1)) && (!/p.lab_id = \?/.test(sql) || row.lab_id === params.at(-1)))];
  } };
  const verify = (req, res, next) => {
    try { req.user = jwt.verify(req.headers.authorization?.slice(7) || '', secret); next(); }
    catch { res.status(401).json({ message: 'Unauthorized' }); }
  };
  const app = express(); app.use(express.json());
  app.use('/api/inventory-exports', module.createInventoryExportRouter(db, verify));
  app.use((error, req, res, next) => res.status(error.status || 500).json({message:'Invalid request'}));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const token = jwt.sign({ id: 7, role }, secret);
  const request = async (kind, body, auth = true) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/inventory-exports/${kind}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json(), cache: response.headers.get('cache-control') };
  };
  return { calls, request };
}

test('both export kinds deny non-export roles before inventory SQL', async t => {
  for (const role of ['Kepala Lab', 'Kepala Koor Lab', 'Guru', 'Siswa', 'unknown']) {
    const f = await fixture(t, { role });
    for (const kind of ['assets', 'lab']) assert.equal((await f.request(kind, { perangkat_ids: [1] })).status, 403);
    assert.ok(f.calls.every(call => /FROM user\b/i.test(call.sql)));
  }
});

const asset = (id, price = null) => ({ perangkat_id: id, nama_perangkat: 'Fixture', penggunaan: 'Operasional', kategori: 'Komputer', lab_id: null, harga_beli: price, password: 'private', qr_token: 'private', foto_perangkat: 'private' });
test('authorized datasets are ordered, projected, exact decimals and read-only', async t => {
  for (const role of ['Admin', 'Teknisi']) {
    const f = await fixture(t, { role, rows: [asset(1, '9999999999999.99'), asset(2, '0.00'), asset(3)] });
    const r = await f.request('assets', { perangkat_ids: [3, 1, 2], kategori: 'Komputer' });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data.map(row => row.perangkat_id), [3, 1, 2]);
    assert.deepEqual(r.body.data.map(row => row.harga_beli), [null, '9999999999999.99', '0.00']);
    assert.match(r.cache, /no-store/);
    assert.ok(r.body.data.every(row => !('password' in row) && !('qr_token' in row) && !('foto_perangkat' in row)));
    const query = f.calls.find(call => /FROM perangkat/.test(call.sql));
    assert.match(query.sql, /CAST\(p.harga_beli AS CHAR\)/);
    assert.doesNotMatch(query.sql, /SELECT\s+\*|FOR UPDATE|password|qr_token|foto_perangkat/i);
    assert.deepEqual(query.params, [3, 1, 2, 'Komputer']);
  }
});

test('JWT verification and live role matching reject revoked, deleted and forged roles before data SQL', async t => {
  for (const options of [{currentRole:'Guru'}, {deleted:true}, {role:'Admin',currentRole:'Teknisi'}, {role:'Guru',currentRole:'Admin'}]) {
    const f = await fixture(t, options);
    for (const kind of ['assets','lab']) assert.equal((await f.request(kind,{perangkat_ids:[1]})).status,403);
    assert.ok(f.calls.every(c => /FROM user\b/.test(c.sql)));
  }
  const f = await fixture(t);
  assert.equal((await f.request('assets',{perangkat_ids:[1]},false)).status,401);
  assert.equal(f.calls.length,0);
});

test('strict body rejects forged actor, injection, duplicates, coercions and over-limit batches without device query', async t => {
  const f = await fixture(t);
  const invalid = [null, [], {}, {perangkat_ids:[]}, {perangkat_ids:[1,1]}, {perangkat_ids:['1']}, {perangkat_ids:[true]}, {perangkat_ids:[0]}, {perangkat_ids:[-1]}, {perangkat_ids:[1.2]}, {perangkat_ids:[2147483648]}, {perangkat_ids:['1) OR 1=1']}, {perangkat_ids:Array.from({length:5001},(_,i)=>i+1)}, {perangkat_ids:[1],role:'Admin'}, {perangkat_ids:[1],actor:7}, {perangkat_ids:[1],kategori:"' OR 1=1"}];
  for (const body of invalid) assert.equal((await f.request('assets',body)).status,400);
  for (const body of [{perangkat_ids:[1],lab_id:'1'},{perangkat_ids:[1],lab_id:0},{perangkat_ids:[1],kategori:'Komputer'}]) assert.equal((await f.request('lab',body)).status,400);
  assert.ok(f.calls.every(c => /FROM user\b/.test(c.sql)));
});

test('unknown IDs, wrong kind and filter intersections return generic conflict without partial data', async t => {
  const rows = [asset(1), {...asset(2),lab_id:8,penggunaan:null}, {...asset(3),lab_id:9,penggunaan:'Pembelajaran'}, {...asset(4),lab_id:8}];
  const f = await fixture(t,{rows,role:'Teknisi'});
  for (const [kind,body] of [['assets',{perangkat_ids:[1,999]}],['assets',{perangkat_ids:[2]}],['assets',{perangkat_ids:[1],kategori:'Laptop'}],['lab',{perangkat_ids:[1]}],['lab',{perangkat_ids:[4]}],['lab',{perangkat_ids:[2,3],lab_id:8}]]) {
    const r = await f.request(kind,body);
    assert.equal(r.status,409);
    assert.deepEqual(r.body,{message:'Data inventaris berubah. Muat ulang dan pilih kembali.'});
  }
});

test('upper bound accepts 5000 IDs and nullable asset category without truncation', async t => {
  const ids = Array.from({length:5000},(_,index)=>index+1);
  const f = await fixture(t,{rows:ids.map(id=>asset(id))});
  const r = await f.request('assets',{perangkat_ids:ids,kategori:null});
  assert.equal(r.status,200);
  assert.deepEqual(r.body.data.map(row=>row.perangkat_id),ids);
});

test('Teknisi can export all labs with legacy NULL usage and optional null filters', async t => {
  const f = await fixture(t,{role:'Teknisi',rows:[{...asset(2),lab_id:8,penggunaan:null},{...asset(3),lab_id:9,penggunaan:'Pembelajaran'}]});
  for (const body of [{perangkat_ids:[3,2]},{perangkat_ids:[3,2],lab_id:null},{perangkat_ids:[2],lab_id:8}]) {
    const r = await f.request('lab',body);
    assert.equal(r.status,200);
    assert.deepEqual(r.body.data.map(row=>row.perangkat_id),body.perangkat_ids);
  }
  for (const c of f.calls.filter(c=>/FROM perangkat/.test(c.sql))) {
    assert.match(c.sql,/p.lab_id IS NOT NULL/);
    assert.match(c.sql,/p.penggunaan <> 'Operasional' OR p.penggunaan IS NULL/);
    assert.doesNotMatch(c.sql,/SELECT\s+\*|FOR UPDATE/i);
  }
});
