import test from 'node:test';
import assert from 'node:assert/strict';
import * as startup from './scripts/start-review.mjs';

function databaseFixture(initial = []) {
  const rows = structuredClone(initial);
  let writes = 0;
  return { rows, get writes() { return writes; }, async query(sql, values) {
    if (sql.startsWith('SELECT DATABASE')) return [[{ name: 'simlab_review_20261114190234' }]];
    if (sql.startsWith('SELECT priority')) return [structuredClone(rows)];
    if (sql.startsWith('INSERT INTO ticket_sla_policies')) {
      writes++;
      if (!rows.some(row => row.priority === values[0])) rows.push({ priority: values[0], response_minutes: values[1], resolution_minutes: values[2] });
      return [{ affectedRows: 1 }];
    }
    throw new Error('Unexpected SQL in guarded initializer');
  } };
}

test('partial custom policies survive repeated initialization unchanged', async () => {
  const custom = { priority: 'P2', response_minutes: 23, resolution_minutes: 125 };
  const db = databaseFixture([custom]);
  await startup.initializeReviewSla(db, 'simlab_review_20261114190234');
  const first = structuredClone(db.rows);
  await startup.initializeReviewSla(db, 'simlab_review_20261114190234');
  assert.deepEqual(db.rows, first);
  assert.deepEqual(db.rows.find(row => row.priority === 'P2'), custom);
  assert.equal(db.rows.length, 4);
});

test('initializer rejects original, empty and mismatched selected database before writes', async () => {
  for (const name of ['', undefined, 'sistem-manajemen-lab-fix', 'simlab_review_20261114190235']) {
    const db = databaseFixture();
    await assert.rejects(() => startup.initializeReviewSla(db, name));
    assert.equal(db.writes, 0);
  }
});

test('explicit review preparation initializes first use but check mode remains read-only', async () => {
  const db = databaseFixture();
  assert.equal(typeof startup.prepareReviewSla, 'function');
  await startup.prepareReviewSla(db, { database: 'simlab_review_20261114190234', check: true });
  assert.equal(db.writes, 0);
  await startup.prepareReviewSla(db, { database: 'simlab_review_20261114190234', check: false });
  assert.equal(db.rows.length, 4);
});

test('schema-only review clone receives the four missing SLA policies before first ticket', async () => {
  const db = databaseFixture();
  assert.equal(typeof startup.initializeReviewSla, 'function', 'review startup must initialize missing SLA reference data');
  await startup.initializeReviewSla(db, 'simlab_review_20261114190234');
  assert.deepEqual(db.rows.map(row => [row.priority, row.response_minutes, row.resolution_minutes]), [['P1',15,240],['P2',60,480],['P3',240,1440],['P4',480,4320]]);
});
