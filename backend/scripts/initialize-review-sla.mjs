// Explicit, narrow repair for an existing schema-only review clone. No accounts/tickets are seeded.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeReviewSla, parseReviewArguments } from './start-review.mjs';

const options = parseReviewArguments(process.argv.slice(2));
process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
await import('dotenv/config');
const { default: mysql } = await import('mysql2/promise');
let connection;
try {
  connection = await mysql.createConnection({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: options.database });
  const policies = options.check
    ? (await connection.query('SELECT priority,response_minutes,resolution_minutes FROM ticket_sla_policies ORDER BY priority'))[0]
    : await initializeReviewSla(connection, options.database);
  console.log(JSON.stringify({ database: options.database, policies, read_only: options.check }));
} catch {
  console.error('Inisialisasi SLA review gagal. Periksa nama database review, akses MySQL, dan migrasi tiket. Data akun/tiket tidak direset.');
  process.exitCode = 1;
} finally {
  await connection?.end();
}
