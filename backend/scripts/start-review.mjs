import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function parseReviewArguments(args) {
  if (args.some(arg => !arg.startsWith('--database=') && !arg.startsWith('--port=') && arg !== '--check') ||
      args.filter(arg => arg.startsWith('--database=')).length !== 1 ||
      args.filter(arg => arg.startsWith('--port=')).length > 1) throw new Error('Gunakan --database=simlab_review_YYYYMMDDHHmmss [--port=5001] [--check].');
  const database = args.find(arg => arg.startsWith('--database='))?.slice(11);
  const rawPort = args.find(arg => arg.startsWith('--port='))?.slice(7) ?? '5001';
  if (!/^simlab_review_\d{14}$/.test(database || '') || !/^[1-9]\d{0,4}$/.test(rawPort) || Number(rawPort) > 65535) throw new Error('Nama database review atau port tidak valid.');
  return { database, port: Number(rawPort), check: args.includes('--check') };
}

export function reviewEnvironment(source, options) {
  const host = source.DB_HOST || 'localhost';
  const port = source.DB_PORT || '3306';
  const user = encodeURIComponent(source.DB_USER || '');
  const password = encodeURIComponent(source.DB_PASSWORD || '');
  const hostname = host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
  return { ...source, DB_NAME: options.database, DATABASE_URL: `mysql://${user}:${password}@${hostname}:${port}/${options.database}`, PORT: String(options.port), TZ: 'UTC' };
}

async function main() {
  const options = parseReviewArguments(process.argv.slice(2));
  process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
  await import('dotenv/config');
  Object.assign(process.env, reviewEnvironment(process.env, options));
  const { default: mysql } = await import('mysql2/promise');
  const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: options.database });
  try {
    const [[selected]] = await connection.query('SELECT DATABASE() AS name');
    if (selected.name !== options.database) throw new Error('Database review tidak cocok.');
    for (const table of ['service_tickets', 'ticket_events', 'ticket_sla_policies', 'school_settings', 'activity_logs']) {
      const [rows] = await connection.query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [options.database, table]);
      if (!rows.length) throw new Error(`Migrasi review belum lengkap: ${table}.`);
    }
  } finally { await connection.end(); }
  console.log(`Database review terverifikasi: ${options.database}; port API: ${options.port}. File .env tidak diubah.`);
  if (!options.check) await import('../index.js');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error('Gagal memulai review. Pastikan nama database, akses MySQL dan migrasi review benar. Gunakan --database=simlab_review_YYYYMMDDHHmmss [--port=5001] [--check].'); process.exitCode = 1; });
}
