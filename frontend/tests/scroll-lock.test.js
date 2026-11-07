import test from 'node:test';
import assert from 'node:assert/strict';
import { acquireBodyScrollLock } from '../src/utils/scrollLock.js';

test('overlapping mobile drawers/dialogs retain scroll lock until the final owner releases it', () => {
  const body = {style:{overflow:'auto'}};
  const releaseDrawer = acquireBodyScrollLock(body);
  const releaseModal = acquireBodyScrollLock(body);
  assert.equal(body.style.overflow,'hidden');
  releaseDrawer();
  assert.equal(body.style.overflow,'hidden');
  releaseDrawer();
  assert.equal(body.style.overflow,'hidden');
  releaseModal();
  assert.equal(body.style.overflow,'auto');
});

test('scroll locks are independent for different documents and safe without a browser body', () => {
  const body = {style:{overflow:''}};
  const release = acquireBodyScrollLock(body);
  acquireBodyScrollLock(undefined)();
  assert.equal(body.style.overflow,'hidden');
  release();
  assert.equal(body.style.overflow,'');
});
