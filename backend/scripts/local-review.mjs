// Explicit opt-in: creates a NEW schema-only database, never writes to the source.
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
const reuse = process.argv.find(arg => arg.startsWith('--reuse-db='))?.slice('--reuse-db='.length);
if (reuse && (!/^simlab_review_\d{14}$/.test(reuse) || reuse === process.env.DB_NAME)) throw new Error('Only an isolated review database can be reused.');
const database = reuse || `simlab_review_${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}`;
const quote = name => '`' + name.replaceAll('`', '``') + '`';
let target;
let child;
let originalFingerprint;
const checks = [];
const result = { database, created_at: new Date().toISOString(), source_unchanged: false, server_stopped: false, checks };
const check = (name, condition) => { assert.ok(condition, name); checks.push({ name, passed: true }); };
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
  originalFingerprint = await fingerprint();
  target = await mysql.createConnection({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, multipleStatements: false });
  // No IF NOT EXISTS: an existing database must never be reused accidentally.
  if (!reuse) await target.query(`CREATE DATABASE ${quote(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await target.changeUser({ database });
  if (!reuse) {
    await target.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const [, ddl] of originalFingerprint.schema) await target.query(ddl);
    await target.query('SET FOREIGN_KEY_CHECKS = 1');
  }
  const migration = await readFile(resolve(backend, 'migrations/20261102_school_settings_activity_logs.sql'), 'utf8');
  for (const statement of migration.replace(/^\s*--.*$/gm, '').split(';').map(s => s.trim()).filter(Boolean)) await target.query(statement);
  check('new database contains school settings and audit tables', (await target.query('SELECT COUNT(*) AS n FROM school_settings'))[0][0].n === 1);

  const password = randomBytes(24).toString('hex');
  const hashed = await bcrypt.hash(password, 4);
  const users = {};
  const run = randomBytes(3).toString('hex');
  for (const [username, role] of [['review_admin', 'Admin'], ['review_head', 'Kepala Lab'], ['review_tech', 'Teknisi'], ['review_guru', 'Guru']]) {
    const name = `${username}_${run}`;
    const [row] = await target.query('INSERT INTO user (username,password,nama_lengkap,email,role) VALUES (?,?,?,?,?)', [name, hashed, name, `${name}@example.invalid`, role]);
    users[role] = { id: row.insertId, username: name };
  }
  const [lab] = await target.query('INSERT INTO laboratorium (nama_lab,lokasi,kapasitas,kepala_lab_id,jam_tutup) VALUES (?,?,?,?,?)', ['Lab Review', 'Database terisolasi', 30, users['Kepala Lab'].id, '17:00']);
  const [device] = await target.query('INSERT INTO perangkat (nama_perangkat,lab_id,nomor_inventaris) VALUES (?,?,?)', ['PC Review', lab.insertId, `REVIEW-${run}`]);
  const socket = createServer();
  socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
  const port = socket.address().port;
  await new Promise((resolve, reject) => socket.close(error => error ? reject(error) : resolve()));
  // Do not reuse or rewrite the user's datasource URL; construct an isolated one.
  const prismaUrl = new URL(`mysql://${encodeURIComponent(process.env.DB_USER || '')}:${encodeURIComponent(process.env.DB_PASSWORD || '')}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}/${database}`);
  const childEnv = { ...process.env, DB_NAME: database, DATABASE_URL: prismaUrl.toString(), PORT: String(port), JWT_SECRET: randomBytes(32).toString('hex') };
  child = spawn(process.execPath, ['index.js'], { cwd: backend, env: childEnv, stdio: ['ignore', 'ignore', 'ignore'] });
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base + '/')).ok) { ready = true; break; } } catch {}
    if (child.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  check('backend starts against isolated database', ready);
  const tokens = {};
  async function request(path, { role, method = 'GET', body, status = 200 } = {}) {
    const response = await fetch(base + '/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(role ? { Authorization: `Bearer ${tokens[role]}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const json = await response.json();
    assert.equal(response.status, status, `${method} ${path}: expected ${status}, received ${response.status}`);
    return json;
  }
  for (const role of Object.keys(users)) {
    const data = await request('/auth/login', { method: 'POST', body: { username: users[role].username, password } });
    assert.ok(data.token); tokens[role] = data.token;
  }
  check('real login works for admin, head, technician and teacher', true);
  await request('/settings', { status: 403 });
  await request('/settings', { role: 'Guru', status: 403 });
  await request('/settings', { role: 'Admin', method: 'PUT', body: { school_name: 'Sekolah Review', primary_color: '#245799', logo_url: '', schedule_start: '07:00', schedule_end: '17:00', lesson_duration: 30 } });
  const settings = await request('/settings/public');
  check('admin settings persist and public branding reflects them', settings.data.school_name === 'Sekolah Review' && settings.data.lesson_duration === 30);
  const inspect = { perangkat_id: device.insertId, tanggal_pemeriksaan: '2026-11-02', hasil_pemeriksaan: 'Bermasalah', catatan: 'Pengujian review: PSU' };
  const inspection = await request('/pemeriksaan/create', { role: 'Kepala Lab', method: 'POST', body: inspect, status: 201 });
  const inspectionId = inspection.data.pemeriksaan_id;
  let dashboard = await request('/dashboard/teknisi/stats', { role: 'Teknisi' });
  const ticket = dashboard.data.antrian.find(row => row.pemeriksaan_id === inspectionId);
  check('problem inspection automatically reaches technician queue', Boolean(ticket));
  const repair = { pengecekan_id: ticket.pengecekan_id, tanggal_perbaikan: '2026-11-02', tindakan: 'Uji PSU', hasil_perbaikan: 'Gagal' };
  await request('/perbaikan/create', { role: 'Teknisi', method: 'POST', body: repair, status: 201 });
  await request('/perbaikan/create', { role: 'Teknisi', method: 'POST', body: { ...repair, tindakan: 'Ganti PSU', hasil_perbaikan: 'Berhasil' }, status: 201 });
  const detail = await request(`/pemeriksaan/${inspectionId}`, { role: 'Kepala Lab' });
  check('failed and successful repair attempts are retained in history', detail.data.perbaikan.length === 2);
  check('successful repair synchronizes inspection and device', detail.data.hasil_pemeriksaan === 'Baik' && detail.data.status_perangkat_saat_ini === 'Baik');
  dashboard = await request('/dashboard/teknisi/stats', { role: 'Teknisi' });
  check('resolved problem leaves active queue but remains in repair history', !dashboard.data.antrian.some(row => row.pengecekan_id === ticket.pengecekan_id) && dashboard.data.riwayat.filter(row => row.pengecekan_id === ticket.pengecekan_id).length === 2);
  await request(`/perbaikan/delete/${detail.data.perbaikan[0].perbaikan_id}`, { role: 'Teknisi', method: 'DELETE', status: 409 });
  check('repair history cannot be accidentally deleted', true);
  const submit = { lab_id: lab.insertId, tanggal_pakai: '2026-11-03', kelas: 'X Review', mata_pelajaran: 'Informatika', kegiatan: 'Praktik review' };
  for (const [jam_mulai, jam_selesai] of [['07:00', '09:00'], ['09:00', '10:00']]) await request('/pengajuan/create', { role: 'Guru', method: 'POST', body: { ...submit, jam_mulai, jam_selesai }, status: 201 });
  check('adjacent lesson submissions are accepted without shifting', true);
  await request('/pengajuan/create', { role: 'Guru', method: 'POST', body: { ...submit, jam_mulai: '10:15', jam_selesai: '11:00' }, status: 400 });
  check('backend rejects times outside configured lesson boundaries', true);
  await request('/auth/logout', { role: 'Guru', method: 'POST' });
  await new Promise(resolve => setTimeout(resolve, 200));
  const audit = await request('/activity-logs?limit=100', { role: 'Admin' });
  const entries = audit.data;
  check('audit persists login, logout and feature actions', Array.isArray(entries) && entries.some(row => row.action === 'login') && entries.some(row => row.action === 'logout') && entries.some(row => row.method === 'POST' && row.path.includes('pemeriksaan')));
  check('audit never stores raw credentials or tokens', !JSON.stringify(entries).includes(password) && !Object.values(tokens).some(token => JSON.stringify(entries).includes(token)));
  // Exercise Prisma user reads with DATABASE_URL independently pointed at the new DB.
  const userList = await request('/user', { role: 'Admin' });
  check('Prisma and mysql2 both read the isolated database', Object.values(users).every(user => userList.data.some(row => row.user_id === user.id)));
} catch (error) {
  result.error = error.message;
  process.exitCode = 1;
} finally {
  if (child) {
    const exited = once(child, 'exit').catch(() => {});
    child.kill(); await exited;
    result.server_stopped = true;
  }
  if (originalFingerprint) {
    result.source_unchanged = (await fingerprint()).hash === originalFingerprint.hash;
    if (!result.source_unchanged) { result.error = 'Source fingerprint changed; inspect concurrent database activity.'; process.exitCode = 1; }
  }
  await target?.end();
  await source.end();
  await writeFile(resolve(backend, '../docs/local-review-result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
}
