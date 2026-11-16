import test from 'node:test';
import assert from 'node:assert/strict';
import {controller,database,response} from './maintenance-helpers.mjs';
test('direct troubleshooting is transactional, uses session actor and marks device needing repair',async()=>{
 const db=database([[{perangkat_id:2}]]);const {createPengecekan}=await controller('pengecekan',db);const res=response();
 await createPengecekan({body:{user_id:99,perangkat_id:2,tanggal_pengecekan:'2026-11-02',ditemukan_kerusakan:'Mati',status_pengecekan:'Sudah Ditangani'},user:{id:7,role:'Teknisi'}},res);
 assert.equal(res.code,201);const insert=db.calls.find(c=>/INSERT INTO pengecekan/.test(c.sql));assert.equal(insert.args[0],7);assert.ok(insert.args.includes('Baru'));assert.ok(db.calls.some(c=>/UPDATE perangkat/.test(c.sql)));assert.ok(db.calls.some(c=>c.sql==='COMMIT'));
});
test('ticket updates cannot bypass repair result by closing queue manually',async()=>{
 const db=database([[{pengecekan_id:3,user_id:7,perangkat_id:2,status_pengecekan:'Baru'}]]);const {updatePengecekan}=await controller('pengecekan',db);const res=response();
 await updatePengecekan({params:{id:3},body:{tanggal_pengecekan:'2026-11-02',ditemukan_kerusakan:'Mati',status_pengecekan:'Sudah Ditangani'},user:{id:7,role:'Teknisi'}},res);
 assert.equal(res.code,409);assert.ok(!db.calls.some(c=>/UPDATE pengecekan/.test(c.sql)));
});
