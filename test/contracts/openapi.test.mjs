import assert from 'node:assert/strict';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = name => readFileSync(path.join(root, name), 'utf8');
const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
// Evaluate ONLY router registration source in a restricted context. All external
// imports are inert stubs; no controller, DB, upload, dotenv or server is loaded.
// Following router imports preserves the actual shared mutable router instance.
export function mountedInventory() {
  const cache = new Map();
  const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub });
  let activeFile;
  const Router = () => {
    const r = { registrations: [], use: () => r };
    for (const method of methods) r[method] = (route) => {
      assert.equal(typeof route, 'string', 'Dynamic route requires inventory adapter');
      r.registrations.push({ method, route, source: activeFile }); return r;
    };
    return r;
  };
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const context = { __default: undefined };
    let text = read(file);
    text = text.replace(/import\s+([^;'" ](?:[^;'" ]|\s)*?)\s*from\s*['"]([^'"]+)['"]\s*;?/g, (_, bindings, target) => {
      const isRouter = target.startsWith('./') && file.startsWith('backend/router/');
      const imported = isRouter ? load(path.posix.normalize(path.posix.join(path.posix.dirname(file), target))) : null;
      if (bindings.trim().startsWith('{')) {
        for (const binding of bindings.replace(/\/\/[^\n]*/g, '').replace(/[{}]/g, '').split(',')) {
          const [name, alias] = binding.trim().split(/\s+as\s+/);
          if (name) context[alias || name] = name === 'Router' ? Router : imported ? vm.runInContext(name, imported.context) : stub;
        }
      } else context[bindings.trim()] = target === 'express' ? { Router } : imported ? imported.default : stub;
      return '';
    });
    text = text.replace(/export\s+default\s+/g, '__default = ').replace(/export\s+(?=(?:async\s+)?function|const|let|class)/g, '');
    vm.createContext(context);
    const previous = activeFile; activeFile = file;
    vm.runInContext(text, context, { filename: file, timeout: 1000 });
    activeFile = previous;
    const result = { context, default: context.__default }; cache.set(file, result); return result;
  }
  const index = read('backend/index.js');
  const imports = new Map([...index.matchAll(/import\s+(\w+|\{[^}]+\})\s+from\s+['"]\.\/(router\/[^'"]+)['"]/g)].map(m => [m[1].replace(/[{}\s]/g, ''), `backend/${m[2]}`]));
  // ESM completes all imports before mounting: essential for laporan/device alias.
  for (const file of imports.values()) load(file);
  const result = [];
  for (const match of index.matchAll(/app\.use\(\s*(?:['"]([^'"]+)['"]\s*,\s*)?(\w+)(\([^;]*?\))?\s*\);/g)) {
    const [, prefix = '', name, args] = match;
    if (!imports.has(name)) continue;
    const file = imports.get(name), module = load(file);
    activeFile = file;
    const router = args ? vm.runInContext(`${name}(__stub, __stub)`, Object.assign(module.context, { __stub: stub }), { timeout: 1000 }) : module.default;
    assert.ok(router?.registrations, `Unrecognized router mount ${name}`);
    for (const registration of router.registrations) {
      const url = (prefix + (registration.route === '/' ? '' : registration.route)) || '/';
      result.push({ ...registration, path: url.replace(/:([A-Za-z_][\w]*)/g, '{$1}'), mount: name });
    }
  }
  for (const match of index.matchAll(/app\.(get|post|put|patch|delete|head|options)\(\s*['"]([^'"]+)['"]/g)) result.push({ method: match[1], path: match[2], source: 'backend/index.js', mount: 'app' });
  assert.ok(result.length > 80, 'Mount discovery unexpectedly incomplete');
  assert.equal(imports.size, 20, 'New router import: review mount inventory adapter');
  return result;
}

const spec = JSON.parse(read('openapi.json'));
const inventory = mountedInventory();
const keys = [...new Set(inventory.map(r => `${r.method} ${r.path}`))].sort();
const documented = Object.entries(spec.paths).flatMap(([p, item]) => methods.filter(m => item[m]).map(m => `${m} ${p}`)).sort();
test('single root specification exactly covers mounted method/path registrations', () => {
  assert.equal(existsSync(path.join(root, 'docs/openapi.json')), false);
  assert.deepEqual(documented, keys);
  const ids = new Set();
  for (const key of documented) {
    const [method, p] = key.split(' '), op = spec.paths[p][method];
    assert.equal(op['x-mounted'], true, key);
    assert.ok(op.responses && Object.keys(op.responses).length, key);
    assert.ok(op['x-source']?.length, key);
    assert.ok(op.operationId && !ids.has(op.operationId), key); ids.add(op.operationId);
    for (const name of [...p.matchAll(/\{([^}]+)\}/g)].map(m => m[1])) assert.ok([...(op.parameters || []), ...(spec.paths[p].parameters || [])].some(x => x.in === 'path' && x.name === name && x.required), key);
  }
});
test('shared router aliases and shadowed report handlers remain explicit', () => {
  for (const prefix of ['/api/perangkat', '/api/laporan/perangkat']) {
    assert.equal(inventory.filter(r => r.path === prefix && r.method === 'get').length, 2);
    assert.ok(spec.paths[prefix].get['x-shadowed']?.length);
    assert.ok(spec.paths[`${prefix}/{id}/detail`].get);
  }
});
test('public/security boundaries, condition guard and nullable metadata are retained', () => {
  for (const p of ['/api/asset-qr/{publicId}', '/api/settings/public', '/api/pengumuman', '/']) assert.deepEqual(spec.paths[p].get.security, []);
  assert.ok(spec.paths['/api/jadwal-lab'].get.security.length);
  const props = spec.paths['/api/assets/{id}'].put.requestBody.content['application/json'].schema.properties;
  assert.deepEqual(props.status.enum, ['Baik', 'Rusak', 'Perlu Perbaikan', 'Dalam Perbaikan']);
  assert.equal(props.harga_beli.nullable, true);
  assert.ok(spec.paths['/api/assets/{id}'].put.responses['409']);
  assert.ok(spec.paths['/api/settings'].put.requestBody.content['multipart/form-data'].schema.properties.logo);
  assert.ok(spec.components.schemas.TicketAction);
});
test('legacy update documentation conditions status conflicts on active findings', () => {
  for (const prefix of ['/api/perangkat', '/api/laporan/perangkat']) {
    const op = spec.paths[`${prefix}/update/{id}`].put;
    assert.doesNotMatch(op.description, /status must equal stored status|409 otherwise/i);
    assert.match(op.description, /Manual condition change with active findings returns 409/);
    assert.match(op.description, /Update omission preserves existing values\/photo/);
    assert.match(op.description, /unchanged condition and metadata updates remain allowed/);
    assert.ok(op.responses['409']);
  }
});

test('schedule approval conflict reaches rejection rather than waiting', () => {
  const diagrams = [...read('README.md').matchAll(/```mermaid\s*\n([\s\S]*?)```/g)].map(m => m[1]);
  const diagram = diagrams.find(d => /subgraph Jadwal/.test(d));
  assert.ok(diagram, 'Schedule activity diagram exists');
  assert.match(diagram, /CF\s+--\s+Tidak\s+-->\s+RJ\b/);
  assert.doesNotMatch(diagram, /CF\s+--\s+Tidak\s+-->\s+ME\b/);
  assert.match(diagram, /RJ\[Ditolak; Guru melihat status\]/);
});

test('all OpenAPI Markdown references resolve to existing root README sections', () => {
  const readme = read('README.md');
  const anchors = new Set([...readme.matchAll(/^#{1,6}\s+(.+)$/gm)].map(m => m[1].trim().toLowerCase().replace(/[^\p{L}\p{N}_\-\s]/gu, '').replace(/\s/g, '-')));
  const strings = [];
  function visit(value, location = '$') {
    if (typeof value === 'string') strings.push([location, value]);
    else if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) visit(child, `${location}/${key}`);
  }
  visit(spec);
  const references = strings.flatMap(([location, value]) => [...value.matchAll(/(?:[\w.-]+\/)*[\w.-]+\.md(?:#[\w-]+)?/g)].map(m => [location, m[0]]));
  assert.ok(references.length >= 17, 'Keep the consolidated documentation references');
  for (const [location, reference] of references) {
    assert.match(reference, /^README\.md#[\w-]+$/, `${location}: ${reference}`);
    assert.ok(anchors.has(reference.split('#')[1]), `${location}: missing section ${reference}`);
  }
});

// Optional scratch evidence output, never needed by the root test runner.
if (process.env.OPENAPI_INVENTORY_OUTPUT) writeFileSync(process.env.OPENAPI_INVENTORY_OUTPUT, JSON.stringify({ registrations: inventory, uniqueOperations: keys.length, paths: Object.keys(spec.paths).length, documentedOperations: documented.length }, null, 2));
