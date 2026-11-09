import test from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import { createServer as createHttpServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer, resolveConfig } from 'vite';

test('development exposes same-origin API and assets rather than browser localhost', async () => {
  const config = await resolveConfig({ configFile: 'vite.config.js', mode: 'development', logLevel: 'silent' }, 'serve');
  assert.ok(config.server.proxy?.['/api'], 'API requests must proxy through the reachable frontend origin');
  assert.ok(config.server.proxy?.['/uploads'], 'Uploaded images must proxy through the same frontend origin');
  assert.equal(config.define['import.meta.env.VITE_BASE_URL'], JSON.stringify('/api'));
  assert.equal(config.define['import.meta.env.VITE_ASSET_BASE_URL'], 'window.location.origin');
});

test('production build keeps the explicitly configured API and asset endpoints', async () => {
  const config = await resolveConfig({ configFile: 'vite.config.js', mode: 'production', logLevel: 'silent' }, 'build');
  assert.equal(config.define['import.meta.env.VITE_BASE_URL'], undefined);
  assert.equal(config.define['import.meta.env.VITE_ASSET_BASE_URL'], undefined);
});

test('real Vite proxy forwards API, query strings and binary uploads with configured path prefixes', async () => {
  const received = [];
  const bytes = Buffer.from([0, 1, 2, 255]);
  const upstream = createHttpServer((request, response) => {
    received.push(request.url);
    if (request.url.startsWith('/media/')) {
      response.setHeader('Content-Type', 'application/octet-stream');
      response.end(bytes);
    } else {
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ data: { primary_color: '#16734d' } }));
    }
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const previous = [process.env.VITE_BASE_URL, process.env.VITE_ASSET_BASE_URL];
  const cache = await mkdtemp(join(process.env.TMPDIR || tmpdir(), 'lan-proxy-cache-'));
  let vite;
  try {
    const origin = `http://127.0.0.1:${upstream.address().port}`;
    process.env.VITE_BASE_URL = origin + '/backend-api';
    process.env.VITE_ASSET_BASE_URL = origin + '/media';
    const config = await resolveConfig({ configFile: 'vite.config.js', mode: 'development', logLevel: 'silent' }, 'serve');
    // Exercise the real proxy options without starting unrelated app-plugin watchers.
    vite = await createServer({ configFile: false, root: cache, cacheDir: join(cache, 'vite'), logLevel: 'silent', server: { proxy: config.server.proxy, host: '127.0.0.1', port: 0, hmr: false, watch: null } });
    await vite.listen();
    const frontend = `http://127.0.0.1:${vite.httpServer.address().port}`;
    const settings = await fetch(frontend + '/api/settings/public?check=lan');
    assert.equal(settings.status, 200);
    assert.equal((await settings.json()).data.primary_color, '#16734d');
    const upload = await fetch(frontend + '/uploads/branding/example.png');
    assert.equal(upload.status, 200);
    assert.deepEqual(Buffer.from(await upload.arrayBuffer()), bytes);
    assert.deepEqual(received, ['/backend-api/settings/public?check=lan', '/media/uploads/branding/example.png']);
  } finally {
    for (const [index, key] of ['VITE_BASE_URL', 'VITE_ASSET_BASE_URL'].entries()) {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    }
    await vite?.close();
    upstream.closeAllConnections();
    await new Promise(resolve => upstream.close(resolve));
    await rm(cache, { recursive: true, force: true });
  }
});
