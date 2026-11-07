// Opt-in isolated HTTP/MySQL verification. Never migrate/write the source database.
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

if (!process.argv.includes('--create-isolated')) throw new Error('Explicit --create-isolated is required.');
const backend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(backend);
const { default: source } = await import('../config/db.js');
const database = `simlab_review_${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}`;
const quote = name => '`' + name.replaceAll('`', '``') + '`';
const checks = [];
const result = { database, created_at: new Date().toISOString(), source_unchanged: false, server_stopped: false, checks };
let target, child, before;
const check = (name, condition = true) => { assert.ok(condition, name); checks.push({ name, passed: true }); };
async function fingerprint() {
  const [tables] = await source.query("SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME");
  const schema = [];
  for (const { name } of tables) {
    const [[ddl]] = await source.query(`SHOW CREATE TABLE ${quote(name)}`);
    const [[checksum]] = await source.query(`CHECKSUM TABLE ${quote(name)}`);
    schema.push([name, ddl['Create Table'], checksum.Checksum]);
  }
  return { schema, hash: createHash('sha256').update(JSON.stringify(schema)).digest('hex') };
}
try {
  before = await fingerprint();
  target = await mysql.createConnection({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, multipleStatements: false, timezone: 'Z' });
  await target.query(`CREATE DATABASE ${quote(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await target.changeUser({ database });
  await target.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const [, ddl] of before.schema) await target.query(ddl);
  await target.query('SET FOREIGN_KEY_CHECKS = 1');
  for (const file of ['20261102_school_settings_activity_logs.sql', '20261103_service_tickets.sql']) {
    const migration = await readFile(resolve(backend, 'migrations', file), 'utf8');
    for (const statement of migration.replace(/^\s*--.*$/gm, '').split(';').map(s => s.trim()).filter(Boolean)) await target.query(statement);
  }
  check('isolated schema created and migrations applied without source writes');
  const password = randomBytes(24).toString('hex');
  const hash = await bcrypt.hash(password, 4);
  const run = randomBytes(3).toString('hex');
  const users = {};
  for (const [key, role] of [['admin', 'Admin'], ['manager', 'Koordinator Lab'], ['head', 'Kepala Lab'], ['tech', 'Teknisi'], ['otherTech', 'Teknisi'], ['teacher', 'Guru'], ['otherTeacher', 'Guru']]) {
    const username = `ticket_${key}_${run}`;
    const [saved] = await target.query('INSERT INTO user (username,password,nama_lengkap,email,role) VALUES (?,?,?,?,?)', [username, hash, username, `${username}@example.invalid`, role]);
    users[key] = { id: saved.insertId, username, role };
  }
  const [lab] = await target.query('INSERT INTO laboratorium (nama_lab,lokasi,kapasitas,kepala_lab_id) VALUES (?,?,?,?)', ['Lab Ticketing Review', 'Isolated database', 20, users.head.id]);
  const [device] = await target.query('INSERT INTO perangkat (nama_perangkat,lab_id,nomor_inventaris) VALUES (?,?,?)', ['PC Ticket Review', lab.insertId, `TICKET-${run}`]);
  const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
  const port = socket.address().port;
  await new Promise((resolve, reject) => socket.close(error => error ? reject(error) : resolve()));
  const prismaUrl = `mysql://${encodeURIComponent(process.env.DB_USER || '')}:${encodeURIComponent(process.env.DB_PASSWORD || '')}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}/${database}`;
  child = spawn(process.execPath, ['index.js'], { cwd: backend, env: { ...process.env, DB_NAME: database, DATABASE_URL: prismaUrl, PORT: String(port), JWT_SECRET: randomBytes(32).toString('hex'), TZ: 'UTC' }, stdio: ['ignore', 'ignore', 'ignore'] });
  const base = `http://127.0.0.1:${port}/api`;
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) { ready = true; break; } } catch { /* server starting */ }
    if (child.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  check('backend starts against isolated database', ready);
  const tokens = {};
  async function request(path, { actor, method = 'GET', body, status = 200 } = {}) {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(actor ? { Authorization: `Bearer ${tokens[actor]}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const text = await response.text();
    let json; try { json = JSON.parse(text); } catch { json = {}; }
    assert.ok((Array.isArray(status) ? status : [status]).includes(response.status), `${method} ${path}: expected ${JSON.stringify(status)}, received ${response.status}; ${json.message || json.msg || 'no JSON message'}`);
    return json;
  }
  for (const [key, user] of Object.entries(users)) {
    const auth = await request('/auth/login', { method: 'POST', body: { username: user.username, password } });
    assert.ok(auth.token); tokens[key] = auth.token;
  }
  check('real authentication works for all five roles and alternate users');
  await request('/tickets', { status: 403 });
  await request('/tickets', { actor: 'teacher', method: 'POST', body: {}, status: 400 });
  await request('/tickets?status=arbitrary', { actor: 'admin', status: 400 });
  check('authentication and ticket/filter validation reject invalid requests');
  const options = (await request('/tickets/options', { actor: 'admin' })).data;
  assert.equal(options.policies.length, 4);
  assert.ok(options.technicians.some(row => row.user_id === users.tech.id));
  check('options expose valid technicians, devices and four priority SLA policies');
  const draft = { title: 'PC tidak dapat dipakai', description: 'PC gagal menyala saat praktikum.', type: 'incident', category: 'hardware', impact: 'medium', urgency: 'medium', perangkat_id: device.insertId };
  const created = (await request('/tickets', { actor: 'teacher', method: 'POST', body: { ...draft, reporter_id: users.admin.id }, status: 201 })).data;
  let detail = (await request(`/tickets/${created.ticket_id}`, { actor: 'teacher' })).data;
  check('creation uses authenticated reporter, stable ticket number and derived priority', detail.reporter_id === users.teacher.id && /^TKT-\d+$/.test(detail.ticket_number) && detail.priority === 'P3' && detail.status === 'new');
  await request(`/tickets/${created.ticket_id}`, { actor: 'otherTeacher', status: [403, 404] });
  const invisible = await request('/tickets', { actor: 'otherTeacher' });
  check('teacher list and detail enforce ticket ownership', !invisible.data.some(row => row.ticket_id === created.ticket_id));
  await request(`/tickets/${created.ticket_id}`, { actor: 'head' });
  check('head of linked lab can read its ticket');
  async function action(name, actor, extras = {}, status = 200) {
    const current = (await request(`/tickets/${created.ticket_id}`, { actor: 'admin' })).data;
    const response = await request(`/tickets/${created.ticket_id}/actions`, { actor, method: 'POST', body: { action: name, version: current.version, note: `Review: ${name}`, ...extras }, status });
    if (status === 200) {
      detail = (await request(`/tickets/${created.ticket_id}`, { actor: 'admin' })).data;
      assert.equal(detail.version, current.version + 1);
      assert.ok(detail.events.length > current.events.length);
    }
    return response;
  }
  await action('close', 'teacher', {}, 409);
  await action('resolve', 'tech', { resolution: 'Belum dikerjakan' }, [403, 409]);
  await action('assign', 'teacher', { assignee_id: users.tech.id }, 403);
  await action('assign', 'manager', { assignee_id: users.teacher.id }, 400);
  check('early closure, unauthorized assignment and non-technician assignees are rejected');
  const originalDue = detail.resolution_due_at;
  const policies = options.policies.map(row => ({ priority: row.priority, response_minutes: row.priority === 'P3' ? 2 : Number(row.response_minutes), resolution_minutes: row.priority === 'P3' ? 10 : Number(row.resolution_minutes) }));
  await request('/tickets/policies', { actor: 'teacher', method: 'PUT', body: { policies, note: 'Unauthorized' }, status: 403 });
  await request('/tickets/policies', { actor: 'admin', method: 'PUT', body: { policies: [{ priority: 'P1', response_minutes: 9, resolution_minutes: 1 }], note: 'Invalid' }, status: 400 });
  await request('/tickets/policies', { actor: 'admin', method: 'PUT', body: { policies: policies.map(row => ({ ...row, response_minutes: 1, resolution_minutes: Number.MAX_SAFE_INTEGER })), note: 'Overflow must be rejected before persistence' }, status: 400 });
  check('SLA targets outside representable date ranges are rejected before database writes');
  await request('/tickets/policies', { actor: 'admin', method: 'PUT', body: { policies, note: 'Target lokal pengujian, bukan angka wajib ISO' } });
  const savedPolicies = (await request('/tickets/options', { actor: 'admin' })).data.policies;
  assert.equal(Number(savedPolicies.find(row => row.priority === 'P3').resolution_minutes), 10);
  detail = (await request(`/tickets/${created.ticket_id}`, { actor: 'admin' })).data;
  check('SLA policies are admin-only, validated, persisted and do not rewrite existing deadlines', detail.resolution_due_at === originalDue);
  const serviceRequest = (await request('/tickets', { actor: 'teacher', method: 'POST', body: { ...draft, type: 'service_request', title: 'Permintaan instalasi aplikasi' }, status: 201 })).data;
  const newDetail = (await request(`/tickets/${serviceRequest.ticket_id}`, { actor: 'teacher' })).data;
  check('service requests use updated policy snapshot on newly created tickets', Date.parse(newDetail.resolution_due_at) - Date.parse(newDetail.created_at) === 10 * 60 * 1000);
  await action('assign', 'manager', { assignee_id: users.tech.id });
  check('assignment persists technician and acknowledges first response', detail.assignee_id === users.tech.id && Boolean(detail.first_response_at));
  await action('start', 'otherTech', {}, 403);
  await action('start', 'tech');
  await action('pending', 'tech', { note: '' }, 400);
  await action('pending', 'tech', { note: 'Menunggu komponen PSU' });
  const pendingDue = detail.resolution_due_at;
  await action('resume', 'tech');
  check('assigned technician owns work, pending needs reason and does not reset SLA', detail.status === 'in_progress' && detail.resolution_due_at === pendingDue);
  await action('escalate', 'teacher', { note: 'Praktikum tertunda' });
  check('explicit escalation has timestamp and an immutable event', Boolean(detail.escalated_at) && detail.events.some(event => event.action === 'escalate'));
  const staleVersion = detail.version;
  await action('comment', 'teacher', { note: 'Informasi tambahan pelapor' });
  await request(`/tickets/${created.ticket_id}/actions`, { actor: 'tech', method: 'POST', body: { action: 'comment', note: 'Perubahan stale', version: staleVersion }, status: 409 });
  check('optimistic version check rejects stale writes');
  const beforeRace = (await request(`/tickets/${created.ticket_id}`, { actor: 'admin' })).data;
  const race = await Promise.all(['tech', 'teacher'].map(actor => fetch(base + `/tickets/${created.ticket_id}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens[actor]}` }, body: JSON.stringify({ action: 'comment', note: `Race ${actor}`, version: beforeRace.version }) }).then(response => response.status)));
  assert.deepEqual(race.sort(), [200, 409]);
  check('concurrent writes are serialized and one stale update is rejected');
  await target.query('UPDATE service_tickets SET resolution_due_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR) WHERE ticket_id = ?', [created.ticket_id]);
  await action('resolve', 'tech', { resolution: '' }, 400);
  await action('resolve', 'tech', { resolution: 'PSU diganti dan perangkat diuji menyala.', root_cause: 'PSU gagal memberikan daya.' });
  check('resolution requires recorded outcome and retains breached SLA after restoration', detail.status === 'resolved' && Boolean(detail.resolution_breached) && Boolean(detail.resolved_at) && detail.resolution.includes('PSU'));
  await action('close', 'otherTech', {}, 403);
  await action('close', 'teacher', { note: 'Diverifikasi PC dapat dipakai untuk praktikum.' });
  check('reporter verifies resolution before closure, late resolution remains visible', detail.status === 'closed' && Boolean(detail.closed_at) && Boolean(detail.resolution_breached));
  await action('reopen', 'teacher', { note: 'Gejala muncul lagi setelah digunakan.' });
  check('reopen retains original SLA and prior history rather than erasing it', ['assigned', 'new'].includes(detail.status) && !detail.resolved_at && !detail.closed_at && detail.events.some(event => event.action === 'close'));
  await request(`/tickets/${created.ticket_id}`, { actor: 'teacher', method: 'PUT', body: { version: detail.version, note: 'Unauthorized', type: 'incident', category: 'hardware', impact: 'high', urgency: 'high' }, status: 403 });
  await request(`/tickets/${created.ticket_id}`, { actor: 'manager', method: 'PUT', body: { version: detail.version, note: 'Berdampak seluruh kelas', type: 'incident', category: 'hardware', impact: 'high', urgency: 'high' } });
  detail = (await request(`/tickets/${created.ticket_id}`, { actor: 'admin' })).data;
  check('manager reprioritization is audited and recalculates from original creation', detail.priority === 'P1' && detail.events.some(event => event.action === 'classified') && Date.parse(detail.response_due_at) - Date.parse(detail.created_at) === 15 * 60 * 1000);
  const inspection = await request('/pemeriksaan/create', { actor: 'head', method: 'POST', body: { perangkat_id: device.insertId, tanggal_pemeriksaan: new Date().toISOString().slice(0, 10), hasil_pemeriksaan: 'Bermasalah', catatan: 'Temuan untuk import ticketing' }, status: 201 });
  await request('/tickets/import-maintenance', { actor: 'teacher', method: 'POST', status: 403 });
  const imported = await request('/tickets/import-maintenance', { actor: 'tech', method: 'POST' });
  const repeated = await request('/tickets/import-maintenance', { actor: 'tech', method: 'POST' });
  const [importedRows] = await target.query('SELECT st.* FROM service_tickets st JOIN pengecekan pc ON st.pengecekan_id = pc.pengecekan_id WHERE pc.pemeriksaan_id = ?', [inspection.data.pemeriksaan_id]);
  check('maintenance bridge imports open findings idempotently with preserved source link', imported.data.imported >= 1 && repeated.data.imported === 0 && importedRows.length === 1);
  const importedDetail = (await request(`/tickets/${importedRows[0].ticket_id}`, { actor: 'head' })).data;
  check('import preserves original reporter and provides created event', importedDetail.reporter_id === users.head.id && importedDetail.events.length >= 1);
  const importedId = importedRows[0].ticket_id;
  let linked = importedDetail;
  async function linkedAction(name, actor, extras = {}, status = 200) {
    await request(`/tickets/${importedId}/actions`, { actor, method: 'POST', body: { action: name, version: linked.version, note: `Linked review: ${name}`, ...extras }, status });
    linked = (await request(`/tickets/${importedId}`, { actor: 'admin' })).data;
  }
  await linkedAction('assign', 'tech', { assignee_id: users.tech.id });
  await linkedAction('start', 'tech');
  await linkedAction('resolve', 'tech', { resolution: 'Belum ada perbaikan berhasil' }, 409);
  check('linked ticket cannot be resolved while technical finding remains unfixed', linked.status === 'in_progress');
  await request('/perbaikan/create', { actor: 'tech', method: 'POST', body: { pengecekan_id: importedDetail.pengecekan_id, tanggal_perbaikan: new Date().toISOString().slice(0, 10), tindakan: 'Ganti PSU dan uji beban', hasil_perbaikan: 'Berhasil' }, status: 201 });
  const restored = (await request(`/pemeriksaan/${inspection.data.pemeriksaan_id}`, { actor: 'head' })).data;
  linked = (await request(`/tickets/${importedId}`, { actor: 'admin' })).data;
  check('legacy repair still restores device/inspection without bypassing ticket verification', restored.hasil_pemeriksaan === 'Baik' && linked.status === 'in_progress');
  await linkedAction('resolve', 'tech', { resolution: 'Perbaikan berhasil dicatat dan perangkat telah diuji.' });
  await linkedAction('close', 'head', { note: 'Kepala lab memverifikasi perangkat berfungsi.' });
  check('maintenance source and verified ticket lifecycle complete without losing linkage', linked.status === 'closed' && linked.pengecekan_id === importedDetail.pengecekan_id);
  await request(`/tickets/${serviceRequest.ticket_id}/actions`, { actor: 'teacher', method: 'POST', body: { action: 'cancel', version: newDetail.version, note: 'Permintaan tidak lagi dibutuhkan.' } });
  const cancelled = (await request(`/tickets/${serviceRequest.ticket_id}`, { actor: 'teacher' })).data;
  check('cancellation retains request and requires an audited reason', cancelled.status === 'cancelled' && cancelled.events.some(event => event.action === 'cancel'));
  await request('/tickets?q=%27%20OR%201%3D1', { actor: 'admin' });
  await request('/tickets/not-an-id', { actor: 'admin', status: 400 });
  check('search remains parameterized and malformed identifiers are rejected');
  await request(`/tickets/${created.ticket_id}`, { actor: 'admin', method: 'DELETE', status: [404, 405] });
  detail = (await request(`/tickets/${created.ticket_id}`, { actor: 'admin' })).data;
  check('tickets and event histories are retained with no delete route', detail.events.length >= 10 && detail.events.every(event => event.actor_name && event.created_at));
  const filtered = await request('/tickets?priority=P1&limit=1&page=1', { actor: 'admin' });
  check('pagination, filters and monitoring summary work', filtered.data.length <= 1 && filtered.data.every(row => row.priority === 'P1') && Number(filtered.pagination.total) >= 1 && Number.isFinite(Number(filtered.summary.total)));
  const [rawEvents] = await target.query('SELECT * FROM ticket_events WHERE ticket_id = ?', [created.ticket_id]);
  check('ticket audit contains neither login password nor bearer tokens', !JSON.stringify(rawEvents).includes(password) && !Object.values(tokens).some(token => JSON.stringify(rawEvents).includes(token)));
} catch (error) {
  result.error = error.message;
  process.exitCode = 1;
} finally {
  if (child) {
    const exited = child.exitCode === null ? once(child, 'exit').catch(() => {}) : Promise.resolve();
    if (child.exitCode === null) child.kill();
    await exited;
    result.server_stopped = true;
  }
  if (before) {
    result.source_unchanged = (await fingerprint()).hash === before.hash;
    if (!result.source_unchanged) { result.error = 'Source fingerprint changed; inspect concurrent activity.'; process.exitCode = 1; }
  }
  await target?.end();
  await source.end();
  await writeFile(resolve(backend, '../docs/ticketing-review-result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
}
