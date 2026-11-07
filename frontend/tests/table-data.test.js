import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTableData, getPaginationItems } from '../src/utils/tableData.js';

test('table filtering preserves source records, handles empty input and matches case-insensitively', () => {
  const rows=[{id:1,name:'PC-01',lab:'Lab Satu'},{id:2,name:'Laptop',lab:'Lab Dua'}];
  assert.equal(filterTableData(rows,''),rows);
  assert.deepEqual(filterTableData(rows,'pc-01'),[rows[0]]);
  assert.deepEqual(filterTableData(rows,'LAB DUA'),[rows[1]]);
  assert.deepEqual(filterTableData(undefined,'test'),[]);
  assert.equal(rows.length,2);
});

test('pagination work and output remain bounded even with a million pages', () => {
  const pages=getPaginationItems(1_000_000,500_000);
  assert.ok(pages.length<=9);
  assert.equal(pages[0],1);
  assert.equal(pages[pages.length-1],1_000_000);
  assert.ok(pages.includes(500_000));
  assert.deepEqual(getPaginationItems(3,1),[1,2,3]);
  assert.deepEqual(getPaginationItems(1,1),[1]);
});

test('small page counts keep every page directly reachable without an ellipsis', () => {
  assert.deepEqual(getPaginationItems(5,1),[1,2,3,4,5]);
});
