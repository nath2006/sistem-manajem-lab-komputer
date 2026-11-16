import test from 'node:test';
import assert from 'node:assert/strict';
import {controller,database,response} from './maintenance-helpers.mjs';
test('legacy report detail keeps operational inspection rows when lab is null',async()=>{
 const db=database([[{laporan_id:1,periode:'2026-01'}],[{nama_perangkat:'Operational',nama_lab:null}]]);
 const {getDetailLaporanPerangkat}=await controller('laporanPerangkat',db);const res=response();await getDetailLaporanPerangkat({params:{id:'1'}},res);
 assert.equal(res.code,200);assert.match(db.calls[1].sql,/LEFT JOIN laboratorium l ON d.lab_id = l.lab_id/);
});
