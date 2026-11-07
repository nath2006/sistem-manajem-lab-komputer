import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function load(name, db) {
  const source=(await readFile(new URL(`../controllers/${name}Controller.js`,import.meta.url),'utf8')).replace(/^import .*$/gm,'').replace(/^export /gm,'');
  const context={db,console:{error() {}}};
  vm.runInNewContext(source+'\nglobalThis.handler = '+(name==='dashboard'?'getDashboardStats':'getTeknisiDashboardStats')+';',context);
  return context.handler;
}
function response() { return {code:200,status(value){this.code=value;return this;},json(value){this.body=value;return this;}}; }
function measuredDatabase(rows) {
  let active=0,maximum=0;
  const calls=[];
  return {calls,get maximum(){return maximum;},async query(sql) {
    calls.push(sql); active++; maximum=Math.max(maximum,active);
    try { await new Promise(resolve=>setTimeout(resolve,5)); const match=rows.find(([pattern])=>sql.includes(pattern)); return [match?match[1]:[]]; }
    finally { active--; }
  }};
}

test('admin dashboard independent SQL reads start together without changing the response contract', async () => {
  const db=measuredDatabase([['total_online_users',[{total_online_users:2}]],['total_perangkat',[{total_perangkat:10}]],['total_lab',[{total_lab:3}]],['total_user',[{total_user:12}]],['total_pengumuman',[{total_pengumuman:1}]],['SELECT id, judul',[{id:4,judul:'Info'}]],['FROM perangkat GROUP BY',[{status:'Baik',jumlah:10}]],['FROM laboratorium GROUP BY',[{status:'Tersedia',jumlah:3}]]]);
  const res=response();await (await load('dashboard',db))({},res);
  assert.equal(res.code,200);assert.equal(db.calls.length,8);
  assert.equal(db.maximum,8,'Independent reads should not be serialized');
  assert.equal(res.body.data.totalOnlineUsers,2);assert.equal(res.body.data.totalPerangkat,10);assert.equal(res.body.data.totalLab,3);assert.equal(res.body.data.totalUser,12);assert.equal(res.body.data.totalPengumuman,1);
  assert.equal(res.body.data.latestAnnouncements[0].id,4);assert.equal(res.body.data.perangkatByStatus[0].jumlah,10);assert.equal(res.body.data.labByStatus[0].jumlah,3);
});

test('technician reads stay independent while queue and retained history remain present', async () => {
  const db=measuredDatabase([['total_pengecekan_aktif',[{total_pengecekan_aktif:1}]],['total_riwayat_perbaikan',[{total_riwayat_perbaikan:2}]],['FROM pengecekan pc',[{pengecekan_id:3}]],['FROM perbaikan pb',[{perbaikan_id:8}]]]);
  const res=response();await (await load('dashboardTeknisi',db))({},res);
  assert.equal(res.code,200);assert.equal(db.calls.length,4);assert.equal(db.maximum,4);
  assert.equal(res.body.data.antrian[0].pengecekan_id,3);assert.equal(res.body.data.riwayat[0].perbaikan_id,8);
});

test('dashboard query failures still yield one failed response rather than partial successful statistics', async () => {
  for (const name of ['dashboard','dashboardTeknisi']) {
    const db={async query(){throw new Error('fixture database failure');}};
    const res=response();await (await load(name,db))({},res);
    assert.equal(res.code,500);assert.equal(res.body.data,undefined);
  }
});
