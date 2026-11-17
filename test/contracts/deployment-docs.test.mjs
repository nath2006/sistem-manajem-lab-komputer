import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = name => readFileSync(resolve(root, name), 'utf8');

test('project name is consistent in documentation and root metadata', () => {
  const readme = read('README.md');
  assert.match(readme, /^# Sistem Manajemen IT dan Penggunaan Lab\s*$/m);
  assert.doesNotMatch(readme, /letris/i);
  const manifest = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  assert.equal(manifest.name, 'sistem-manajemen-it-dan-penggunaan-lab');
  assert.equal(lock.name, manifest.name);
  assert.equal(lock.packages[''].name, manifest.name);
  assert.equal(JSON.parse(read('openapi.json')).info.title, 'API Sistem Manajemen IT dan Penggunaan Lab');
});

test('development and production each have an explicit documented phase', () => {
  const readme = read('README.md');
  assert.match(readme, /^## .*development/im);
  assert.match(readme, /^## .*production/im);
  assert.match(readme, /CREATE DATABASE/i);
  assert.match(readme, /CREATE USER/i);
  assert.match(readme, /DATABASE_URL/);
  assert.match(readme, /DB_HOST/);
  assert.match(readme, /prisma generate/);
});

test('fresh-install schema instructions reference tracked SQL files and onboarding guard', () => {
  const readme = read('README.md');
  for (const file of ['20250817184415_init/migration.sql', '20261102_school_settings_activity_logs.sql', '20261103_service_tickets.sql']) {
    assert.ok(readme.includes(file), `Missing schema step ${file}`);
  }
  const sources = [...readme.matchAll(/^\s*SOURCE\s+(backend\/[^\s;]+\.sql)\s*;/gm)];
  assert.ok(sources.length >= 3);
  for (const [, file] of sources) assert.ok(existsSync(resolve(root, file)), `Unknown SQL source ${file}`);
  assert.match(readme, /@onboarding_expected_database/);
  assert.match(readme, /qr_public_id/);
  assert.match(readme, /uq_perangkat_qr_public_id/);
});

test('production guide preserves API paths and documents SPA hosting', () => {
  const readme = read('README.md');
  assert.match(readme, /NODE_ENV\s*=\s*production/);
  assert.match(readme, /proxy_pass\s+http:\/\/127\.0\.0\.1:5000\s*;/);
  assert.doesNotMatch(readme, /proxy_pass\s+http:\/\/127\.0\.0\.1:5000\/\s*;/);
  assert.match(readme, /try_files[^;\n]*\/index\.html\s*;/);
  assert.match(readme, /WorkingDirectory=/);
  assert.match(readme, /EnvironmentFile=/);
  assert.match(readme, /https|certbot/i);
});
