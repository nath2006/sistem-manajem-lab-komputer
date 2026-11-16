import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('lab nullability migration only modifies expected signed INT columns',async()=>{
  const sql=await readFile(new URL('../../backend/migrations/20261114_school_assets.sql',import.meta.url),'utf8');
  const guard=sql.split('PREPARE asset_stmt')[0];
  assert.match(guard,/COLUMN_TYPE\s*=\s*'int'/i);
  assert.match(guard,/IS_NULLABLE\s*=\s*'NO'/i);
});
