import test from 'node:test';
import assert from 'node:assert/strict';
import { createTicketController } from '../controllers/ticketController.js';

test('policy save rejects unrepresentable SLA deadlines before entering a database transaction', async () => {
  for (const resolution_minutes of [Number.MAX_SAFE_INTEGER, 5_000_000_000]) {
    let accessed = false;
    const controller = createTicketController({ getConnection() { accessed = true; throw new Error('Database must not be accessed'); } }, () => new Date('2026-01-01T00:00:00Z'));
    const response = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await controller.policies({ user: { id: 1, role: 'Admin' }, body: { note: 'Invalid deadline limits', policies: ['P1', 'P2', 'P3', 'P4'].map(priority => ({ priority, response_minutes: 1, resolution_minutes })) } }, response);
    assert.equal(response.code, 400);
    assert.equal(accessed, false);
  }
});
