import test from 'node:test';
import assert from 'node:assert/strict';
import { createTicketController } from '../../backend/controllers/ticketController.js';

test('ticket options project shared school asset classification without financial fields', async () => {
  let projection;
  const asset = {perangkat_id: 7, nama_perangkat: 'Printer Tata Usaha', kategori: 'Printer', penggunaan: 'Operasional', lokasi: 'Tata Usaha', nomor_inventaris: 'PR-7', nama_lab: null};
  const db = {async query(sql) {
    if (sql.includes('FROM perangkat')) {
      projection = sql;
      // Mimic SQL projection, not a pre-baked full response.
      return [[Object.fromEntries(Object.entries(asset).filter(([key]) => sql.includes(`d.${key}`) || key === 'nama_lab'))]];
    }
    return [[]];
  }};
  const res = {json(body) {this.body = body;}, status() {return this;}};
  await createTicketController(db).options({user: {id: 1, role: 'Guru'}}, res);
  assert.deepEqual(res.body.data.devices, [asset]);
  assert.doesNotMatch(projection, /harga_beli|sumber_dana|d\.\*/);
});
