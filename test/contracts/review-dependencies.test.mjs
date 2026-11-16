import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const scripts = new URL('../backend/scripts/', import.meta.url);

// Resolve without executing review tools, loading dotenv, or opening a database.
// Include static and dynamic bare imports so newly relocated tools are covered.
for (const filename of readdirSync(scripts).filter(name => name.endsWith('.mjs')).sort()) {
  const tool = new URL(filename, scripts);
  const source = readFileSync(tool, 'utf8');
  const dependencies = new Set(Array.from(
    source.matchAll(/\bimport\s*(?:\(\s*|(?:[^'";\n]*?\s+from\s*)?)["']([^"']+)["']/g),
    match => match[1],
  ).filter(specifier => !specifier.startsWith('.') && !specifier.startsWith('node:')));
  for (const dependency of dependencies) {
    test(`${filename} resolves ${dependency} from its relocated path`, () => {
      assert.doesNotThrow(() => createRequire(tool).resolve(dependency));
    });
  }
}

// The generated Prisma client intentionally belongs to the backend installation.
test('review seed resolves Prisma from the backend package anchor', () => {
  const backend = new URL('../../backend/package.json', import.meta.url);
  assert.doesNotThrow(() => createRequire(backend).resolve('@prisma/client'));
});
