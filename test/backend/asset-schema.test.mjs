import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAssetSchema } from '../../backend/services/assetSchemaService.js';
const metadata = () => [
  ['lab_id','int','YES'],
  ['penggunaan',"enum('Pembelajaran','Operasional')",'NO'],
  ['kategori',"enum('Komputer','Laptop','Monitor','Printer','Perangkat Jaringan','Proyektor','Lainnya')",'NO'],
  ['lokasi','varchar(150)','YES'], ['tahun_pengadaan','smallint','YES'],
  ['sumber_dana','varchar(150)','YES'], ['harga_beli','decimal(15,2)','YES'],
].map(([COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE])=>({COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE}));
function adapter(rows) {return {query:async sql=>{assert.match(sql,/information_schema\.COLUMNS/);return [rows];}};}
test('matching migration metadata permits asset access',async()=>{await requireAssetSchema(adapter(metadata()));});
for (const [column,field,value] of [
  ['harga_beli','COLUMN_TYPE','decimal(10,2)'], ['harga_beli','COLUMN_TYPE','decimal(15,3)'],
  ...['lokasi','tahun_pengadaan','sumber_dana','harga_beli'].map(c=>[c,'IS_NULLABLE','NO']),
  ['penggunaan','COLUMN_TYPE',"enum('Pembelajaran')"],
  ['kategori','COLUMN_TYPE',"enum('Komputer','Lainnya')"],
]) test(`incompatible ${column} ${field} ${value} fails closed with controlled 503`,async()=>{
  const rows=metadata(); rows.find(r=>r.COLUMN_NAME===column)[field]=value;
  await assert.rejects(requireAssetSchema(adapter(rows)),e=>e.status===503&&e.code==='ASSET_SCHEMA_REQUIRED');
});
