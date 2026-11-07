import test from 'node:test';
import assert from 'node:assert/strict';
import { controller, database, response } from './maintenance-helpers.mjs';
test('problem inspection uses verified actor, enqueues technician ticket and marks device',async()=>{
 const db=database([[{perangkat_id:2,kepala_lab_id:7}]]);const {createPemeriksaan}=await controller('pemeriksaan',db);const res=response();
 await createPemeriksaan({body:{user_id:99,perangkat_id:2,tanggal_pemeriksaan:'2026-11-02T09:00',hasil_pemeriksaan:'Bermasalah',catatan:'Mati'},user:{id:7,role:'Kepala Lab'}},res);
 assert.equal(res.code,201);assert.ok(db.calls.some(c=>/INSERT INTO pengecekan/.test(c.sql)));
 assert.ok(db.calls.some(c=>/UPDATE perangkat/.test(c.sql)));
 assert.equal(db.calls.find(c=>/INSERT INTO pemeriksaan/.test(c.sql)).args[0],7);
});
test('inspection update succeeds without undefined response query and preserves ticket progress',async()=>{
 const db=database([[{pemeriksaan_id:1,perangkat_id:2,user_id:7,hasil_pemeriksaan:'Bermasalah',kepala_lab_id:7}],[{pengecekan_id:3,status_pengecekan:'Menunggu Perbaikan'}]]);const {updatePemeriksaan}=await controller('pemeriksaan',db);const res=response();
 await updatePemeriksaan({params:{id:1},body:{tanggal_pemeriksaan:'2026-11-02T09:00',hasil_pemeriksaan:'Bermasalah',catatan:'Kabel'},user:{id:7,role:'Kepala Lab'}},res);
 assert.equal(res.code,200);assert.ok(!db.calls.some(c=>/status_pengecekan = 'Baru'/.test(c.sql)));assert.ok(db.calls.some(c=>c.sql==='COMMIT'));
});
test('inspection detail returns linked milestones rather than matching unrelated device repairs',async()=>{
 const db=database([[{pemeriksaan_id:1,lab_id:2,kepala_lab_id:7}],[{pengecekan_id:3}],[{perbaikan_id:8,pengecekan_id:3}]]);const {getPemeriksaanById}=await controller('pemeriksaan',db);const res=response();
 await getPemeriksaanById({params:{id:1},user:{id:7,role:'Kepala Lab'}},res);
 assert.equal(res.code,200);assert.equal(res.body.data.pengecekan.length,1);assert.equal(res.body.data.perbaikan.length,1);
 assert.ok(db.calls.some(c=>/pc.pemeriksaan_id = \?/.test(c.sql) && /perbaikan/.test(c.sql)));
});
