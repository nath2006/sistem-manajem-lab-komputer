import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSettingsRequest, resolveLogoUrl, validateLogoSelection } from '../src/features/Pengaturan/settingsLogo.mjs';
test('one save keeps JSON compatibility or sends all fields and one file without JSON content type', () => {
  const form = { school_name: 'School', logo_url: '', lesson_duration: 60 };
  assert.deepEqual(buildSettingsRequest(form, null), { data: form, config: undefined });
  const file = new File(['png'], 'logo.png', { type: 'image/png' });
  const request = buildSettingsRequest(form, file);
  assert.equal(request.data.get('school_name'), 'School'); assert.equal(request.data.get('lesson_duration'), '60');
  assert.equal(request.data.get('logo').name, 'logo.png'); assert.equal(request.config.headers['Content-Type'], undefined);
});
test('logo display resolves server paths using asset base or API origin, leaving remote URLs unchanged', () => {
  const local = '/uploads/branding/' + 'a'.repeat(32) + '.png';
  assert.equal(resolveLogoUrl(local, 'https://assets.example/base/', 'https://api.example/api'), 'https://assets.example/base' + local);
  assert.equal(resolveLogoUrl(local, '', 'https://api.example/api'), 'https://api.example' + local);
  assert.equal(resolveLogoUrl('https://school.example/logo.png'), 'https://school.example/logo.png');
});
test('selection rejects SVG, mismatched extensions and oversized images before save', () => {
  assert.equal(validateLogoSelection(new File(['a'], 'logo.png', { type: 'image/png' })), '');
  for (const file of [new File(['a'], 'logo.svg', { type: 'image/svg+xml' }), new File(['a'], 'logo.jpg', { type: 'image/png' }), { name: 'logo.png', type: 'image/png', size: 2097153 }]) assert.ok(validateLogoSelection(file));
});
