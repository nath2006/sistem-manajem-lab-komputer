import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('inventory export router is mounted after audit while presence remains before audit', async () => {
  const source = await readFile(new URL('../../backend/index.js', import.meta.url),'utf8');
  assert.match(source,/import \{ createInventoryExportRouter \} from ['"]\.\/router\/inventoryExportRoutes\.js['"]/);
  const mount = source.indexOf("app.use('/api/inventory-exports', createInventoryExportRouter(db, verifyToken))");
  const audit = source.indexOf("app.use('/api', activityLog)");
  assert.ok(mount > audit && audit > source.indexOf("app.use('/api/presence'"));
});
