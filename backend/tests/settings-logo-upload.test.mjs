import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { createSettingsRouter } from '../router/settingsRoutes.js';
import { DEFAULT_SETTINGS } from '../services/settingsService.js';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5XcAAAAASUVORK5CYII=', 'base64');
async function harness(run) {
  const root = await mkdtemp(path.join(process.env.TMPDIR || os.tmpdir(), 'branding-test-'));
  let stored = { ...DEFAULT_SETTINGS }; let writes = 0; let fail = false;
  const db = { query: async (sql, args) => { if (sql.startsWith('SELECT')) return [[stored]]; writes++; if (fail) throw Error('offline'); stored = Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map((key, i) => [key, args[i]])); return [{}]; } };
  const app = express(); app.use(express.json());
  app.use('/settings', createSettingsRouter({ db, logoDirectory: root, authenticate: (req, res, next) => { if (!req.headers.role) return res.sendStatus(401); req.user = { role: req.headers.role }; next(); } }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const send = (data = {}, bytes = png, filename = 'logo.png', type = 'image/png', role = 'Admin') => { const body = new FormData(); for (const [key, value] of Object.entries({ ...DEFAULT_SETTINGS, ...data })) body.append(key, value); if (bytes) body.append('logo', new Blob([bytes], { type }), filename); return fetch(`http://127.0.0.1:${server.address().port}/settings`, { method: 'PUT', headers: role ? { role } : {}, body }); };
  const json = data => fetch(`http://127.0.0.1:${server.address().port}/settings`, {method:'PUT',headers:{role:'Admin','Content-Type':'application/json'},body:JSON.stringify(data)});
  try { await run({ root, send, json, stored: () => stored, writes: () => writes, fail: () => { fail = true; } }); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true, force: true }); }
}
test('rejects invalid settings, SVG, forged MIME/extension, unsafe names, oversize and unauthorized uploads without writes', () => harness(async h => {
  const cases = [
    [{ school_name: '' }, png, 'logo.png', 'image/png'],
    [{}, Buffer.from('<svg/>'), 'logo.png', 'image/png'],
    [{}, png, 'logo.jpg', 'image/jpeg'],
    [{}, png, 'logo.png', 'text/plain'],
    [{}, png, '../logo.png', 'image/png'],
    [{}, Buffer.alloc(2 * 1024 * 1024 + 1), 'logo.png', 'image/png'],
    [{ logo_url: '/uploads/branding/' + 'a'.repeat(32) + '.png' }, null],
    [{ logo_url: '/uploads/../private.png' }, null],
  ];
  for (const args of cases) assert.equal((await h.send(...args)).status, 400);
  assert.equal((await h.send({}, png, 'logo.png', 'image/png', '')).status, 401);
  assert.equal((await h.send({}, png, 'logo.png', 'image/png', 'Guru')).status, 403);
  assert.equal(h.writes(), 0); assert.deepEqual(await readdir(h.root), []);
}));
test('database failure cleans only the new file and preserves previous logo', () => harness(async h => {
  const first = await (await h.send()).json();
  const previous = first.data.logo_url;
  h.fail(); assert.equal((await h.send({ logo_url: previous })).status, 500);
  assert.equal(h.stored().logo_url, previous);
  assert.deepEqual(await readdir(h.root), [path.basename(previous)]);
}));
test('existing owned logo is retained by later multipart settings-only saves', () => harness(async h => {
  const first = await (await h.send()).json();
  const response = await h.send({ logo_url: first.data.logo_url, school_name: 'Updated' }, null);
  assert.equal(response.status, 200); assert.equal(h.stored().logo_url, first.data.logo_url);
  assert.equal((await readdir(h.root)).length, 1);
}));
test('omitted logo_url retains the current owned logo on JSON settings saves', () => harness(async h => {
  const first = await (await h.send()).json();
  const {logo_url: ignored, ...fields} = DEFAULT_SETTINGS;
  assert.equal(ignored, '');
  const response = await h.json({...fields,school_name:'Retain current logo'});
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.logo_url, first.data.logo_url);
  assert.equal(h.stored().logo_url, first.data.logo_url);
  assert.equal((await readdir(h.root)).length, 1);
}));
test('multipart saves logo with all settings in one authenticated write', () => harness(async h => {
  const response = await h.send({ school_name: 'Upload school' }); assert.equal(response.status, 200);
  const { data } = await response.json(); assert.match(data.logo_url, /^\/uploads\/branding\/[a-f0-9]{32}\.png$/);
  assert.equal(data.lesson_duration, 60); assert.equal(h.writes(), 1);
  assert.deepEqual(await readFile(path.join(h.root, path.basename(data.logo_url))), png);
}));
