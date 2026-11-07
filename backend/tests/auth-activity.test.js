import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import db from '../config/db.js';
import { login } from '../controllers/authController.js';

test('login berhasil menyediakan identitas tervalidasi untuk log aktivitas tanpa password', async () => {
  const original = db.query;
  const oldSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-only-secret-not-used-outside-tests';
  const password = await bcrypt.hash('test-password', 4);
  db.query = async sql => sql.startsWith('SELECT')
    ? [[{ user_id: 9, username: 'test-user', nama_lengkap: 'Test User', role: 'Guru', password }]] : [{}];
  try {
    const req = { body: { username: 'test-user', password: 'test-password' } };
    let status;
    const res = { cookie() {}, status(code) { status = code; return this; }, json(value) { return value; } };
    await login(req, res);
    assert.equal(status, 200);
    assert.equal(req.user_id, 9);
    assert.equal(req.user.role, 'Guru');
    assert.equal(req.user.password, undefined);
  } finally {
    db.query = original;
    if (oldSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldSecret;
  }
});
