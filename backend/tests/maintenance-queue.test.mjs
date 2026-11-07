import test from 'node:test';
import assert from 'node:assert/strict';
import {controller,database,response} from './maintenance-helpers.mjs';
test('technician dashboard includes actionable queue and recent repair history',async()=>{
 const db=database([[{total_pengecekan_aktif:1}],[{total_riwayat_perbaikan:2}],[{pengecekan_id:3,nama_perangkat:'PC-01'}],[{perbaikan_id:8}]]);
 const {getTeknisiDashboardStats}=await controller('dashboardTeknisi',db);const res=response();
 await getTeknisiDashboardStats({user:{id:7,role:'Teknisi'}},res);
 assert.equal(res.code,200);assert.equal(res.body.data.antrian[0].pengecekan_id,3);assert.equal(res.body.data.riwayat[0].perbaikan_id,8);
});
test('ticket detail includes repair attempts for milestone UI',async()=>{
 const db=database([[{pengecekan_id:3,pemeriksaan_id:4}],[{perbaikan_id:8,hasil_perbaikan:'Gagal'}]]);
 const {getPengecekanById}=await controller('pengecekan',db);const res=response();
 await getPengecekanById({params:{id:3},user:{id:7,role:'Teknisi'}},res);
 assert.equal(res.body.data.perbaikan[0].perbaikan_id,8);
});
test('linked ticket cannot be deleted and destroy history',async()=>{
 const db=database([[{pengecekan_id:3,pemeriksaan_id:4}]]);const {deletePengecekan}=await controller('pengecekan',db);const res=response();
 await deletePengecekan({params:{id:3},user:{id:7,role:'Admin'}},res);assert.equal(res.code,409);
 assert.ok(!db.calls.some(c=>/DELETE FROM pengecekan/.test(c.sql)));
});
