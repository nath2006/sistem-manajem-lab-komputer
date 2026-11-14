import test from 'node:test';
import assert from 'node:assert/strict';
import { legacySchemaPlan } from '../scripts/assets-review-baseline.mjs';
const scope={database:'simlab_review_20261115010101',selected:'simlab_review_20261115010101',source:'simlab_review_20261114181000',fresh:true};
const lab={COLUMN_NAME:'lab_id',COLUMN_TYPE:'int',IS_NULLABLE:'YES',COLUMN_DEFAULT:null,EXTRA:'',COLUMN_COMMENT:''};
const fk={COLUMN_NAME:'lab_id',REFERENCED_TABLE_NAME:'laboratorium',REFERENCED_COLUMN_NAME:'lab_id',DELETE_RULE:'RESTRICT',UPDATE_RULE:'CASCADE'};
test('already migrated clone is reset to legacy before synthetic seed',()=>{
 const columns=[lab,...['penggunaan','kategori','lokasi','tahun_pengadaan','sumber_dana','harga_beli'].map(COLUMN_NAME=>({COLUMN_NAME}))];
 const plan=legacySchemaPlan(scope,columns,[fk]);
 assert.equal(plan.length,7);
 assert.match(plan[0],/DROP COLUMN `penggunaan`/);
 assert.equal(plan[6],'ALTER TABLE `perangkat` MODIFY COLUMN `lab_id` int NOT NULL');
});
test('legacy clone requires no DDL',()=>assert.deepEqual(legacySchemaPlan(scope,[{...lab,IS_NULLABLE:'NO'}],[fk]),[]));
test('DDL refuses source, nonfresh, wrong selected target and unexpected metadata',()=>{
 for(const change of [{fresh:false},{selected:scope.source},{source:scope.database},{database:'production'}])assert.throws(()=>legacySchemaPlan({...scope,...change},[lab],[fk]));
 assert.throws(()=>legacySchemaPlan(scope,[{...lab,COLUMN_TYPE:'bigint'}],[fk]));
 assert.throws(()=>legacySchemaPlan(scope,[lab],[{...fk,DELETE_RULE:'CASCADE'}]));
});
