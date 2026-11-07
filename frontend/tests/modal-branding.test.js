import { setImmediate } from 'node:timers';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderUI } from './helpers/renderUI.js';

test('device modal primary action keeps brand on hover and visible keyboard focus', async () => {
  const edit = await readFile(new URL('../src/Components/Perangkat/EditPerangkat.jsx', import.meta.url), 'utf8');
  assert.match(edit, /hover:bg-maroon\/90/);
  assert.match(edit, /focus-visible:ring-maroon/);
  for (const name of ['AddPerangkat', 'EditPerangkat', 'DetailPerangkat']) {
    const source = await readFile(new URL(`../src/Components/Perangkat/${name}.jsx`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /hover:(?:bg|text|border)-red-/);
  }
});

test('cancel never deletes and failures retain semantic icon and onError', async () => {
  const { Swal, DeleteConfirmation } = await loadDelete();
  let deletes = 0;
  Swal.fire = async () => ({ isConfirmed: false });
  DeleteConfirmation({ onDelete: () => { deletes++; } })(9);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(deletes, 0);
  const failure = new Error('delete rejected');
  const dialogs = [], errors = [];
  Swal.fire = async config => { dialogs.push(config); return { isConfirmed: true }; };
  const originalError = console.error;
  console.error = () => {};
  try {
    DeleteConfirmation({ onDelete: async () => { throw failure; }, onError: error => errors.push(error) })(9);
    await new Promise(resolve => setImmediate(resolve));
  } finally { console.error = originalError; }
  assert.deepEqual(errors, [failure]);
  assert.equal(dialogs[1].icon, 'error');
  assert.equal(dialogs[1].iconColor, undefined);
  assert.match(dialogs[1].customClass.confirmButton, /bg-maroon/);
});

test('device detail renders the shared branded modal frame', async () => {
  const { markup } = await renderUI(`
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import DetailPerangkat from './src/Components/Perangkat/DetailPerangkat.jsx';
    export const markup = renderToStaticMarkup(<DetailPerangkat id={1} onClose={() => {}} />);
  `);
  assert.match(markup, /Detail Perangkat/);
  assert.match(markup, /maroon/);
  assert.doesNotMatch(markup, /hover:bg-red-/);
});

const loadDelete = () => renderUI(`
  import Swal from 'sweetalert2';
  import DeleteConfirmation from './src/Components/Notification/DeleteConfirmation.jsx';
  export { Swal, DeleteConfirmation };
`);

test('delete confirmation themes warning frame and every action without changing callbacks', async () => {
  const { Swal, DeleteConfirmation } = await loadDelete();
  const dialogs = [];
  const deleted = [], succeeded = [];
  Swal.fire = async config => { dialogs.push(config); return { isConfirmed: true }; };
  DeleteConfirmation({ onDelete: async id => deleted.push(id), onSuccess: id => succeeded.push(id), itemName: 'perangkat' })(42);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(deleted, [42]);
  assert.deepEqual(succeeded, [42]);
  assert.match(dialogs[0].confirmButtonText, /hapus/i);
  assert.equal(dialogs[0].iconColor, 'var(--color-maroon)');
  assert.match(dialogs[0].customClass.popup, /border-maroon/);
  for (const dialog of dialogs) {
    assert.equal(dialog.buttonsStyling, false);
    assert.match(dialog.customClass.confirmButton, /bg-maroon/);
    assert.match(dialog.customClass.confirmButton, /hover:bg-maroon/);
    assert.doesNotMatch(JSON.stringify(dialog.customClass), /(?:bg|border|text|ring)-red-/);
  }
  assert.match(dialogs[0].customClass.cancelButton, /border-maroon/);
});
