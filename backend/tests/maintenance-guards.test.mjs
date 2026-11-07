import test from 'node:test';
import assert from 'node:assert/strict';
import { controller, database, response } from './maintenance-helpers.mjs';
const body = { pengecekan_id: 3, tanggal_perbaikan: '2026-11-02', tindakan: 'Uji kabel', hasil_perbaikan: 'Berhasil' };
test('repair refuses invalid outcome before acquiring a connection', async () => {
 const db=database(); const {createPerbaikan}=await controller('perbaikan',db);const res=response();
 await createPerbaikan({body:{...body,hasil_perbaikan:'???'},user:{id:7}},res);
 assert.equal(res.code,400);assert.equal(db.calls.length,0);
});
test('closed queue cannot receive duplicate successful submissions', async () => {
 const db=database([[{status_pengecekan:'Sudah Ditangani',perangkat_id:2}]]);const {createPerbaikan}=await controller('perbaikan',db);const res=response();
 await createPerbaikan({body,user:{id:7}},res);assert.equal(res.code,409);
 assert.ok(!db.calls.some(c=>/INSERT INTO perbaikan/.test(c.sql)));
});
test('technician cannot rewrite another technician repair', async () => {
 const db=database([[{user_id:8,pengecekan_id:3}]]);const {updatePerbaikan}=await controller('perbaikan',db);const res=response();
 await updatePerbaikan({params:{id:1},body,user:{id:7,role:'Teknisi'}},res);assert.equal(res.code,403);
 assert.ok(!db.calls.some(c=>/UPDATE perbaikan/.test(c.sql)));
});
test('repair history cannot be deleted',async()=>{
 const db=database();const {deletePerbaikan}=await controller('perbaikan',db);const res=response();
 await deletePerbaikan({params:{id:1}},res);assert.equal(res.code,409);assert.equal(db.calls.length,0);
});
test('response read failure cannot leave a committed write behind a 500',async()=>{
 const db=database([[{perangkat_id:2,pemeriksaan_id:4,status_pengecekan:'Baru'}]]);const query=db.query;
 db.query=async(sql,args)=>{if(/FROM perbaikan pb/.test(sql))throw Error('read failed');return query(sql,args);};
 const {createPerbaikan}=await controller('perbaikan',db);const res=response();
 await createPerbaikan({body,user:{id:7}},res);assert.equal(res.code,500);
 assert.ok(!db.calls.some(c=>c.sql==='COMMIT'),'all response reads must be before commit');
});
test('SQL failure rolls back and releases instead of committing',async()=>{
 const db=database([[{perangkat_id:2,pemeriksaan_id:4}]]);const query=db.query;
 db.query=async(sql,args)=>{if(/UPDATE pemeriksaan/.test(sql))throw Error('test SQL failure');return query(sql,args);};
 const {createPerbaikan}=await controller('perbaikan',db);const res=response();
 await createPerbaikan({body,user:{id:7}},res);assert.equal(res.code,500);
 assert.ok(db.calls.some(c=>c.sql==='ROLLBACK'));assert.ok(db.calls.some(c=>c.sql==='RELEASE'));assert.ok(!db.calls.some(c=>c.sql==='COMMIT'));
});
