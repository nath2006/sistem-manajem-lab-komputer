import assert from 'node:assert/strict';
// Only the successfully CREATEd, empty schema clone may be downgraded.
export function legacySchemaPlan(scope, columns, foreignKeys) {
  assert.match(scope.database, /^simlab_review_\d{14}$/);
  assert.equal(scope.fresh, true);
  assert.equal(scope.selected, scope.database);
  assert.notEqual(scope.source, scope.database);
  assert.notEqual(scope.database, 'sistem-manajemen-lab-fix');
  const lab = columns.find(c => c.COLUMN_NAME === 'lab_id');
  assert.ok(lab);
  assert.match(lab.COLUMN_TYPE, /^int(?:\(11\))?$/);
  assert.equal(lab.COLUMN_DEFAULT, null);
  assert.equal(lab.EXTRA, '');
  assert.equal(lab.COLUMN_COMMENT, '');
  assert.ok(['YES', 'NO'].includes(lab.IS_NULLABLE));
  assert.equal(foreignKeys.length, 1);
  assert.deepEqual(foreignKeys[0], {COLUMN_NAME:'lab_id',REFERENCED_TABLE_NAME:'laboratorium',REFERENCED_COLUMN_NAME:'lab_id',DELETE_RULE:'RESTRICT',UPDATE_RULE:'CASCADE'});
  const known = ['penggunaan','kategori','lokasi','tahun_pengadaan','sumber_dana','harga_beli'];
  const plan = known.filter(name => columns.some(c => c.COLUMN_NAME === name)).map(name => `ALTER TABLE \`perangkat\` DROP COLUMN \`${name}\``);
  if (lab.IS_NULLABLE === 'YES') plan.push(`ALTER TABLE \`perangkat\` MODIFY COLUMN \`lab_id\` ${lab.COLUMN_TYPE} NOT NULL`);
  return plan;
}
