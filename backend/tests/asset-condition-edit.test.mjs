import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAsset } from '../utils/assetPolicy.js';
import { createAssetService } from '../services/assetService.js';
import { createLegacyDeviceWriter } from '../services/legacyDeviceService.js';
const base={perangkat_id:7,nama_perangkat:'Printer',penggunaan:'Operasional',kategori:'Printer',lab_id:null,status:'Rusak'};
const values=['Baik','Rusak','Perlu Perbaikan','Dalam Perbaikan'];
function fixture(active=false, old=base){
 const calls=[]; let row={...old};
 const c={beginTransaction:async()=>calls.push('begin'),commit:async()=>calls.push('commit'),rollback:async()=>calls.push('rollback'),release(){},async query(sql,args=[]){
 calls.push(sql);
 if(sql.startsWith('SELECT * FROM perangkat'))return [[row]];
 if(sql.includes('FROM laboratorium WHERE'))return [[{kepala_lab_id:1,lab_id:2}]];
 if(sql.startsWith('SELECT p.perangkat_id'))return [[{...row,active_condition_findings:active?1:0}]];
 if(sql.includes('FROM pengecekan'))return [active?[{pengecekan_id:9,status_pengecekan:'Baru'}]:[]];
 if(sql.startsWith('UPDATE perangkat')){
  const fields=sql.slice(sql.indexOf(' SET ')+5,sql.indexOf(' WHERE ')).split(',').map(v=>v.trim().split('=')[0]);
  fields.forEach((k,i)=>row[k]=args[i]);return [{affectedRows:1}];
 }
 if(sql.startsWith('SELECT '))return [[row]];
 throw Error(sql);
 }};
 return {db:{getConnection:async()=>c,query:c.query},calls,row:()=>row};
}
test('all actual condition enum values are accepted; invalid explicit values rejected',()=>{
 for(const status of values)assert.equal(normalizeAsset({status},base).status,status);
 for(const status of ['other','',null,4])assert.throws(()=>normalizeAsset({status},base),e=>e.status===400);
 assert.equal(normalizeAsset({lokasi:'TU'},base).status,'Rusak');
});
test('asset read exposes maintenance context and preserves lab detail',async()=>{
 const f=fixture(true,{...base,penggunaan:'Pembelajaran',lab_id:2});
 const row=await createAssetService(f.db).get(7);
 assert.equal(row.condition_editable,false);
 assert.match(row.condition_edit_reason,/temuan aktif.*Perbaikan/i);
 assert.equal(row.penggunaan,'Pembelajaran');
});
test('operational condition update succeeds without active findings inside device transaction',async()=>{
 const f=fixture(); const result=await createAssetService(f.db).update({role:'Admin'},7,{status:'Baik'});
 assert.equal(result.status,'Baik');
 assert.ok(f.calls.findIndex(s=>s.includes('FROM pengecekan'))>f.calls.findIndex(s=>s.includes('FROM perangkat WHERE')));
 assert.ok(f.calls.some(s=>s.includes('FROM pengecekan')&&s.includes('FOR UPDATE')));
 assert.equal(f.calls.at(-1),'commit');
});
test('active finding rejects manual condition change but permits unchanged condition and metadata',async()=>{
 const f=fixture(true);const service=createAssetService(f.db);
 await assert.rejects(service.update({role:'Admin'},7,{status:'Baik'}),e=>e.status===409&&/temuan.*9|9.*temuan/i.test(e.message));
 assert.equal(f.row().status,'Rusak');assert.equal(f.calls.at(-1),'rollback');
 await service.update({role:'Admin'},7,{lokasi:'TU'});
 await service.update({role:'Admin'},7,{status:'Rusak'});
 assert.equal(f.row().status,'Rusak');
});
test('legacy device writer shares manual condition guard and keeps lab ownership',async()=>{
 const lab={...base,penggunaan:'Pembelajaran',lab_id:2};
 for(const status of values){const f=fixture(false,lab);await createLegacyDeviceWriter(f.db)({id:1,role:'Kepala Lab'},{status},7);assert.equal(f.row().status,status);}
 const f=fixture(true,lab);await assert.rejects(createLegacyDeviceWriter(f.db)({id:1,role:'Kepala Lab'},{status:'Baik'},7),e=>e.status===409);
 const bad=fixture(false,lab);await assert.rejects(createLegacyDeviceWriter(bad.db)({id:8,role:'Kepala Lab'},{status:'Baik'},7),e=>e.status===403);
});
