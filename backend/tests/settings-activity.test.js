import test from 'node:test';
import assert from 'node:assert/strict';

const service = () => import('../services/settingsService.js');
test('settings routes expose public defaults, enforce admin, validate writes and paginate logs', async () => {
  const express = (await import('express')).default;
  const { createSettingsRouter } = await import('../router/settingsRoutes.js');
  const { createActivityLogRouter } = await import('../router/activityLogRoutes.js');
  const { DEFAULT_SETTINGS } = await service();
  const queries = [];
  const db = { query: async (sql, args) => { queries.push([sql, args]); return [sql.includes('COUNT') ? [{ total: 2 }] : []]; } };
  const app = express(); app.use(express.json());
  app.use((req, res, next) => { if (req.headers['x-test-role']) req.user = { id: 1, role: req.headers['x-test-role'] }; next(); });
  const authenticate = (req, res, next) => req.user ? next() : res.status(401).end();
  app.use('/api/settings', createSettingsRouter({ db, authenticate }));
  app.use('/api/activity-logs', createActivityLogRouter({ db, authenticate }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    let res = await fetch(`${base}/api/settings/public`); assert.deepEqual((await res.json()).data, DEFAULT_SETTINGS);
    assert.equal((await fetch(`${base}/api/settings`)).status, 401);
    assert.equal((await fetch(`${base}/api/settings`, { headers: { 'x-test-role': 'Guru' } })).status, 403);
    const admin = { 'x-test-role': 'Admin', 'content-type': 'application/json' };
    res = await fetch(`${base}/api/settings`, { method: 'PUT', headers: admin, body: JSON.stringify(DEFAULT_SETTINGS) }); assert.equal(res.status, 200);
    res = await fetch(`${base}/api/settings`, { method: 'PUT', headers: admin, body: '{}' }); assert.equal(res.status, 400);
    assert.equal((await fetch(`${base}/api/activity-logs`)).status, 401);
    res = await fetch(`${base}/api/activity-logs?page=1&limit=10`, { headers: admin });
    const result = await res.json(); assert.equal(result.pagination.total, 2); assert.equal(result.pagination.limit, 10);
    assert.equal((await fetch(`${base}/api/activity-logs?page=-1`, { headers: admin })).status, 400);
    assert.ok(queries.some(([sql]) => sql.includes('INSERT INTO school_settings')));
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
test('audit finishing context omits request secrets and survives writer errors', async () => {
  const { createActivityLog } = await import('../middleware/activityLog.js');
  const { EventEmitter } = await import('node:events');
  let entry;
  const req = { method: 'GET', originalUrl: '/api/user?token=SECRET', body: { password: 'SECRET' }, headers: { authorization: 'SECRET' } };
  const res = new EventEmitter(); res.statusCode = 200; res.locals = {};
  let next = false;
  createActivityLog({ write: async value => { entry = value; } })(req, res, () => { next = true; });
  req.user = { id: 12, role: 'Admin', username: 'admin' };
  req.route = { path: '/:id' }; req.baseUrl = '/api/user';
  res.emit('finish');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(next, true); assert.equal(entry.user_id, 12);
  assert.equal(entry.path, '/api/user/:id'); assert.ok(!JSON.stringify(entry).includes('SECRET'));
  const failed = new EventEmitter(); failed.statusCode = 200; failed.locals = {};
  createActivityLog({ write: async () => { throw Error('offline'); }, onError: () => {} })(req, failed, () => {});
  failed.emit('finish'); await new Promise(resolve => setImmediate(resolve));
});
test('public defaults and strict settings validation', async () => {
  const { DEFAULT_SETTINGS, validateSettings, createSettingsService } = await service();
  assert.equal(DEFAULT_SETTINGS.school_name, 'Sekolah Anda');
  assert.equal(DEFAULT_SETTINGS.schedule_start, '07:00');
  const db = { query: async () => [[]] };
  assert.deepEqual(await createSettingsService(db).get(), DEFAULT_SETTINGS);
  assert.equal(validateSettings({ ...DEFAULT_SETTINGS, school_name: ' SMK ' }).school_name, 'SMK');
  for (const logo_url of ['data:image/svg+xml,x', 'javascript:alert(1)', 'https://example.com/a.svg', 'http://localhost/x.png', 'https://u:p@example.com/a.png']) {
    assert.throws(() => validateSettings({ ...DEFAULT_SETTINGS, logo_url }), /logo/i);
  }
  assert.throws(() => validateSettings({ ...DEFAULT_SETTINGS, schedule_end: '06:00' }));
  assert.throws(() => validateSettings({ ...DEFAULT_SETTINGS, lesson_duration: 0 }));
  assert.throws(() => validateSettings({ ...DEFAULT_SETTINGS, primary_color: 'red' }));
});
