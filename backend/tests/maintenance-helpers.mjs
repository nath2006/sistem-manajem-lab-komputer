import { readFile } from 'node:fs/promises';
// Isolated SQL boundary: never imports db.js, dotenv, or connects to user DB.
async function controller(name, database) {
  globalThis.__maintenanceDb = database;
  const url = new URL(`../controllers/${name}Controller.js`, import.meta.url);
  let source = await readFile(url, 'utf8');
  source = source.replace(/import db from ["']\.\.\/config\/db.js["'];/, 'const db = globalThis.__maintenanceDb;');
  source = source.replace(/from (["'])(\.\.?\/[^"']+)\1/g, (_, q, path) => `from ${q}${new URL(path, url).href}${q}`);
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}#${Math.random()}`);
}
function database(replies = []) {
  const calls = [];
  const db = {
    calls,
    async query(sql, args = []) { calls.push({ sql, args }); if (/^\s*SELECT/i.test(sql)) return [replies.shift() || []]; return [{ insertId: 11, affectedRows: 1 }]; },
    async getConnection() { return db; },
    async beginTransaction() { calls.push({ sql: 'BEGIN' }); },
    async commit() { calls.push({ sql: 'COMMIT' }); },
    async rollback() { calls.push({ sql: 'ROLLBACK' }); },
    release() { calls.push({ sql: 'RELEASE' }); },
  };
  return db;
}
function response() { return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }
export { controller, database, response };
