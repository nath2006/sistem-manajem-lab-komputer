import test from 'node:test';
import assert from 'node:assert/strict';
import { createObjectUrlLease } from '../src/utils/useObjectUrl.js';

test('preview resource can be read before release but is revoked when retired', async () => {
  const lease=createObjectUrlLease(new Blob(['image-fixture']));
  assert.equal(typeof lease.url,'string');
  assert.equal(await (await fetch(lease.url)).text(),'image-fixture');
  lease.release();
  await assert.rejects(fetch(lease.url));
  assert.doesNotThrow(()=>lease.release());
});

test('retiring an old preview does not revoke its replacement and an empty selection allocates nothing', async () => {
  const first=createObjectUrlLease(new Blob(['first']));
  const second=createObjectUrlLease(new Blob(['replacement']));
  first.release();
  assert.equal(await (await fetch(second.url)).text(),'replacement');
  second.release();
  const empty=createObjectUrlLease(null);
  assert.equal(empty.url,null);
  assert.doesNotThrow(()=>empty.release());
});
