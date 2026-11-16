import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { readFileSync } from 'node:fs';

async function serve(db, run, actor = { id: 7, role: 'Guru' }) {
  const module = await import('../../backend/router/onboardingRoutes.js').catch(() => ({}));
  assert.equal(typeof module.createOnboardingRouter, 'function', 'onboarding router exists');
  const app = express(); app.use(express.json());
  app.use('/api/onboarding', module.createOnboardingRouter(db, (req, res, next) => {
    if (!req.headers.authorization) return res.sendStatus(403);
    req.user = actor; req.user_id = 99; next();
  }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api/onboarding`;
  try { await run((path = '', options = {}) => fetch(base + path, { ...options, headers: { Authorization: 'fixture', ...options.headers } })); }
  finally { await new Promise(r => server.close(r)); }
}
test('production wiring and additive migration persist on the existing user model', () => {
  const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
  assert.match(read('backend/index.js'), /app.use\('\/api\/onboarding', createOnboardingRouter\(db, verifyToken\)\)/);
  assert.match(read('backend/prisma/schema.prisma'), /onboarding_seen_at\s+DateTime\?\s+@db.DateTime\(0\)/);
  const sql = read('backend/migrations/20261116_onboarding.sql');
  assert.match(sql, /information_schema.COLUMNS/);
  assert.match(sql, /ALTER TABLE user ADD COLUMN onboarding_seen_at DATETIME NULL/);
  assert.doesNotMatch(sql, /CREATE DATABASE|FOREIGN KEY|UPDATE user|DROP TABLE/i);
});
test('authentication and invalid verified actors fail before any DB access', async () => {
  const db = { query() { assert.fail('DB accessed before authentication'); } };
  for (const actor of [null, {}, { id: 0 }, { id: -1 }, { id: '7' }, { id: 1.5 }, { user_id: 7 }]) {
    await serve(db, async request => {
      for (const [path, method] of [['', 'GET'], ['/claim', 'POST']]) {
        const unauth = await request(path, { method, headers: { Authorization: '' } });
        assert.equal(unauth.status, 403); assert.equal(unauth.headers.get('cache-control'), 'private, no-store');
        assert.equal((await request(path, { method })).status, 401);
      }
    }, actor);
  }
});
test('unknown accounts return 404 and schema/read failures never pretend unseen or leak SQL', async () => {
  const missing = fixture(); missing.users.delete(7);
  await serve(missing, async request => {
    assert.equal((await request()).status, 404);
    assert.equal((await request('/claim', { method: 'POST' })).status, 404);
  });
  for (const columns of [[], [{ DATA_TYPE: 'timestamp', IS_NULLABLE: 'YES', COLUMN_DEFAULT: null }], [{ DATA_TYPE: 'datetime', IS_NULLABLE: 'NO', COLUMN_DEFAULT: null }]]) {
    const calls = []; const db = { async query(sql) { calls.push(sql); return [columns]; } };
    await serve(db, async request => {
      for (const [path, method] of [['', 'GET'], ['/claim', 'POST']]) {
        const response = await request(path, { method }); assert.equal(response.status, 503);
        assert.equal((await response.json()).code, 'ONBOARDING_SCHEMA_REQUIRED');
      }
    });
    assert.ok(calls.every(sql => /information_schema/.test(sql)));
  }
  await serve({ async query() { throw new Error('SELECT secret_password FROM private_table'); } }, async request => {
    const response = await request(); assert.equal(response.status, 500);
    assert.doesNotMatch(JSON.stringify(await response.json()), /SELECT|secret_password|private_table/);
  });
});
function fixture() {
  const users = new Map([[7, null], [8, null]]); const calls = [];
  return { users, calls, async query(sql, params) {
    calls.push([sql, params]);
    if (/information_schema/i.test(sql)) return [[{ DATA_TYPE: 'datetime', IS_NULLABLE: 'YES', COLUMN_DEFAULT: null }]];
    assert.deepEqual(params, [7], 'only verified req.user.id is selected');
    if (/^UPDATE/.test(sql)) {
      assert.match(sql, /SET onboarding_seen_at=UTC_TIMESTAMP\(\) WHERE user_id=\? AND onboarding_seen_at IS NULL/);
      const won = users.has(params[0]) && users.get(params[0]) === null;
      if (won) users.set(params[0], '2026-11-16T01:02:03Z');
      return [{ affectedRows: won ? 1 : 0 }];
    }
    assert.match(sql, /DATE_FORMAT/);
    return [users.has(params[0]) ? [{ seen_at: users.get(params[0]) }] : []];
  } };
}
test('concurrent claims have exactly one winner and persist across reads and role changes', async () => {
  const db = fixture();
  for (const role of ['Guru', 'Teknisi', 'Admin', 'Kepala Lab', 'Koordinator Lab']) {
    await serve(db, async request => {
      const responses = await Promise.all(Array.from({ length: 12 }, () => request('/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: 8, id: 8, seen_at: null }) })));
      const payloads = await Promise.all(responses.map(async response => { assert.equal(response.status, 200); return response.json(); }));
      assert.equal(payloads.filter(p => p.data.should_show).length, role === 'Guru' ? 1 : 0);
      for (const p of payloads) assert.equal(p.data.seen_at, '2026-11-16T01:02:03Z');
      assert.deepEqual(await (await request()).json(), { data: { seen: true, seen_at: '2026-11-16T01:02:03Z' } });
    }, { id: 7, role });
  }
  assert.equal(db.users.get(8), null);
});
test('onboarding GET reads persisted state without consuming the display attempt', async () => {
  const db = fixture();
  await serve(db, async request => {
    for (let i = 0; i < 2; i++) {
      const response = await request(); assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      assert.deepEqual(await response.json(), { data: { seen: false, seen_at: null } });
    }
    assert.equal(db.calls.some(([sql]) => /^UPDATE/.test(sql)), false);
  });
});
