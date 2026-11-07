import test from 'node:test';
import assert from 'node:assert/strict';
import { parseReviewArguments, reviewEnvironment } from '../scripts/start-review.mjs';

test('review startup refuses source names, absent database, unknown flags and invalid ports', () => {
  for (const args of [[], ['--database=production'], ['--database=simlab_review_20261103123456', '--port=0'], ['--database=simlab_review_20261103123456', '--port=65536'], ['--database=simlab_review_20261103123456', '--port=5e3'], ['--database=simlab_review_20261103123456', '--migrate']]) {
    assert.throws(() => parseReviewArguments(args));
  }
});

test('review startup isolates mysql2 and Prisma without modifying the input environment', () => {
  const args = parseReviewArguments(['--database=simlab_review_20261103123456', '--port=5002', '--check']);
  assert.deepEqual(args, { database: 'simlab_review_20261103123456', port: 5002, check: true });
  const original = { DB_NAME: 'source_untouched', DATABASE_URL: 'mysql://unused.invalid/source', DB_USER: 'fixture', DB_PASSWORD: 'fixture-only', DB_HOST: 'localhost', DB_PORT: '3306' };
  const env = reviewEnvironment(original, args);
  assert.equal(original.DB_NAME, 'source_untouched');
  assert.equal(original.DATABASE_URL, 'mysql://unused.invalid/source');
  assert.equal(env.DB_NAME, args.database);
  assert.equal(new URL(env.DATABASE_URL).pathname, '/' + args.database);
  assert.equal(env.PORT, '5002');
});

test('an explicitly empty review port is not silently replaced by a default', () => {
  assert.throws(() => parseReviewArguments(['--database=simlab_review_20261103123456', '--port=']));
});
