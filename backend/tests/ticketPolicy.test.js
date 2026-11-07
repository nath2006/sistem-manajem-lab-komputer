import test from 'node:test';
import assert from 'node:assert/strict';
const load = async () => import('../utils/ticketPolicy.js').catch(() => ({}));
test('identifiers reject exponent, signed, zero, fractions and unsafe values',async()=>{const {id}=await load();for(const v of ['1e1','+1','-1','0','1.5','9007199254740992',' 1'])assert.throws(()=>id(v),{status:400});assert.equal(id('12'),12);});
test('priority matrix and original UTC SLA deadlines', async () => {
 const p = await load(); assert.equal(typeof p.priorityFor,'function');
 for (const [i,u,expected] of [['high','high','P1'],['high','medium','P2'],['medium','high','P2'],['high','low','P3'],['medium','medium','P3'],['low','high','P3'],['low','low','P4']]) assert.equal(p.priorityFor(i,u),expected);
 assert.equal(p.deadlines('2026-01-01T00:00:00Z',{response_minutes:15,resolution_minutes:240}).resolution_due_at,'2026-01-01 04:00:00.000');
});
test('SLA deadlines reject overflow and dates outside the MySQL datetime range', async () => {
 const { deadlines } = await load();
 for (const [created, policy] of [
  ['2026-01-01T00:00:00Z', { response_minutes: 1, resolution_minutes: Number.MAX_SAFE_INTEGER }],
  ['9999-12-31T23:59:00Z', { response_minutes: 1, resolution_minutes: 2 }],
  ['2026-01-01T00:00:00Z', { response_minutes: 0, resolution_minutes: 2 }],
 ]) assert.throws(() => deadlines(created, policy), { status: 400 });
});
