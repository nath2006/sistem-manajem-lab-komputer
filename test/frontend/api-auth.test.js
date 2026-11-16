import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import process from 'node:process';

test('logout mengirim bearer token agar logout dan log aktivitas mengenali user', async () => {
  const result = await build({ stdin: { contents: `import api from './src/utils/api.js'; module.exports = api;`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'cjs', write: false, define: { 'import.meta.env': '{}' } });
  const module = { exports: {} };
  const previousDocument = globalThis.document;
  globalThis.document = { cookie: 'auth_token=test-access-token' };
  try {
    new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
    let authorization;
    const api = module.exports;
    api.defaults.adapter = async config => {
      authorization = config.headers.Authorization;
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };
    await api.post('/auth/logout');
    assert.equal(authorization, 'Bearer test-access-token');
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
