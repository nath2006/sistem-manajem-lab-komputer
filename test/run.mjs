import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const suites = {
  backend: { directory: 'backend', cwd: 'backend' },
  frontend: { directory: 'frontend', cwd: 'frontend' },
  shared: { directory: 'shared', cwd: '.' },
  contracts: { directory: 'contracts', cwd: '.' },
};
const requested = process.argv[2] || 'all';
if (process.argv.length > 3 || (requested !== 'all' && !Object.hasOwn(suites, requested))) {
  console.error('Usage: node test/run.mjs [all|frontend|backend|shared|contracts]');
  process.exit(2);
}

function discover(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return discover(path);
    return /\.test\.(?:mjs|js)$/.test(entry.name) ? [path] : [];
  }).sort();
}

// Keep the former frontend command's shared scheduling coverage, without
// running those tests twice when the complete root suite is selected.
const selected = requested === 'all' ? Object.keys(suites)
  : requested === 'frontend' ? ['frontend', 'shared'] : [requested];
let failed = false;
for (const name of selected) {
  const suite = suites[name];
  const files = discover(join(root, 'test', suite.directory));
  if (!files.length) {
    console.error(`No tests found in test/${suite.directory}.`);
    failed = true;
    continue;
  }
  console.log(`\n=== ${name}: ${files.length} test files ===`);
  const result = spawnSync(process.execPath, ['--test', ...files], {
    cwd: resolve(root, suite.cwd),
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) console.error(result.error.message);
  if (result.error || result.signal || result.status !== 0) failed = true;
}
process.exitCode = failed ? 1 : 0;
