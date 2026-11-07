import test from 'node:test';
import assert from 'node:assert/strict';
import { createTicketController } from '../controllers/ticketController.js';

test('three imported findings share one transaction-local policy read and preserve identity, deadlines and idempotency', async () => {
  const calls = [];
  const imported = new Set();
  let transaction = 0;
  let sourceIds = [1, 2, 3];
  let responseMinutes = 240;
  const db = {
    async getConnection() { return this; },
    async beginTransaction() { transaction++; },
    async commit() {},
    async rollback() {},
    release() {},
    async query(sql, args = []) {
      calls.push({ sql, args, transaction });
      if (sql.includes('FROM pengecekan pc')) {
        return [sourceIds.map(n => ({
          pengecekan_id: n, user_id: n + 10, perangkat_id: n,
          tanggal_pengecekan: '2026-01-01 00:00:00', ditemukan_kerusakan: `fault ${n}`,
        }))];
      }
      if (sql.includes('WHERE pengecekan_id=?')) return [imported.has(args[0]) ? [{ ticket_id: args[0] }] : []];
      if (sql.includes('ticket_sla_policies')) return [[{ priority: 'P3', response_minutes: responseMinutes, resolution_minutes: 1440 }]];
      if (sql.includes('FROM user WHERE')) return [[{ user_id: args[0] }]];
      if (sql.includes('FROM perangkat')) return [[{ perangkat_id: args[0] }]];
      if (sql.startsWith('INSERT INTO service_tickets')) {
        const keys = sql.match(/\(([^)]+)\)/)[1].split(',');
        const row = Object.fromEntries(keys.map((key, i) => [key, args[i]]));
        imported.add(row.pengecekan_id);
        return [{ insertId: row.pengecekan_id }];
      }
      return [[]];
    },
  };
  const controller = createTicketController(db, () => new Date('2026-02-01T00:00:00Z'));
  const request = { user: { id: 8, role: 'Teknisi' } };
  const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } });
  let res = response();
  await controller.importMaintenance(request, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.data.imported, 3);
  assert.equal(calls.filter(call => call.sql.includes('ticket_sla_policies')).length, 1);
  const inserts = calls.filter(call => call.sql.startsWith('INSERT INTO service_tickets'));
  for (const [index, call] of inserts.entries()) {
    const keys = call.sql.match(/\(([^)]+)\)/)[1].split(',');
    const row = Object.fromEntries(keys.map((key, i) => [key, call.args[i]]));
    assert.equal(row.reporter_id, index + 11);
    assert.equal(row.priority, 'P3');
    assert.equal(row.response_due_at, '2026-01-01 04:00:00.000');
    assert.equal(row.resolution_due_at, '2026-01-02 00:00:00.000');
  }
  assert.deepEqual(calls.filter(call => call.sql.startsWith('INSERT INTO ticket_events')).map(call => call.args[5]), [8, 8, 8]);
  res = response();
  await controller.importMaintenance(request, res);
  assert.equal(res.body.data.imported, 0);
  assert.equal(calls.filter(call => call.sql.startsWith('INSERT INTO service_tickets')).length, 3);
  assert.ok(!calls.some(call => /^UPDATE (pengecekan|perangkat|pemeriksaan)/.test(call.sql)));
  assert.equal(calls.filter(call => call.sql.includes('ticket_sla_policies')).length, 1);
  // A later transaction must read fresh policy, not reuse the earlier import's snapshot.
  sourceIds = [4];
  responseMinutes = 120;
  res = response();
  await controller.importMaintenance(request, res);
  assert.equal(res.body.data.imported, 1);
  const policyReads = calls.filter(call => call.sql.includes('ticket_sla_policies'));
  assert.deepEqual(policyReads.map(call => call.transaction), [1, 3]);
  const lastInsert = calls.filter(call => call.sql.startsWith('INSERT INTO service_tickets')).at(-1);
  const lastKeys = lastInsert.sql.match(/\(([^)]+)\)/)[1].split(',');
  const lastRow = Object.fromEntries(lastKeys.map((key, i) => [key, lastInsert.args[i]]));
  assert.equal(lastRow.response_due_at, '2026-01-01 02:00:00.000');
});
