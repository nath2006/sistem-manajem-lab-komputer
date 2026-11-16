import test from 'node:test';
import assert from 'node:assert/strict';
import { renderUI } from '../helpers/renderUI.js';

const roles = ['Admin', 'Guru', 'Kepala Lab', 'Koordinator Lab', 'Teknisi'];
const load = () => renderUI(`
  import React from 'react';
  import {renderToStaticMarkup} from 'react-dom/server';
  import {MemoryRouter} from 'react-router-dom';
  import {AuthContext} from './src/Context/AuthContext';
  import {SettingsProvider} from './src/Context/SettingsContext';
  import {DashboardShell} from './src/Layouts/Dashboard';
  import {ROLE_STEPS} from './src/Components/Onboarding/onboardingData.js';
  module.exports = {steps: ROLE_STEPS, shells: ${JSON.stringify(roles)}.map(role => renderToStaticMarkup(
    <MemoryRouter><AuthContext.Provider value={{state:{role,fullName:'Pengguna'}}}>
      <SettingsProvider><DashboardShell title="Uji" onReplayOnboarding={()=>{}} /></SettingsProvider>
    </AuthContext.Provider></MemoryRouter>))};
`);

test('each role tours every actual rendered sidebar leaf exactly once including dashboard', async () => {
  const {steps, shells} = await load();
  roles.forEach((role, index) => {
    const anchors = [...shells[index].matchAll(/<a\b[^>]*data-tour-path="([^"]+)"[^>]*href="([^"]+)"/g)];
    assert.ok(anchors.length >= 5, `${role} must render real sidebar anchors`);
    const rendered = anchors.map(match => { assert.equal(match[1], match[2]); return match[1]; });
    const targets = steps[role].filter(step => step.element.startsWith('[data-tour-path='));
    const paths = targets.map(step => step.element.match(/^\[data-tour-path="([^"]+)"\]$/)[1]);
    assert.equal(paths.length, new Set(paths).size, `${role} duplicates a sidebar feature`);
    assert.deepEqual([...paths].sort(), [...rendered].sort(), `${role} misses a rendered sidebar feature`);
    assert.ok(targets.every(step => !step.optional), `${role} sidebar steps cannot silently disappear`);
  });
});

test('visible tour copy stays short and free of punctuation for every role', async () => {
  const {steps} = await load();
  for (const role of roles) for (const step of steps[role]) {
    for (const key of ['title', 'description']) {
      assert.doesNotMatch(step[key], /[.,;:\-—–→/]/, `${role} ${key} ${step[key]}`);
      assert.ok(step[key].trim().length > 0);
    }
    assert.ok(step.title.split(/\s+/).length <= 6);
    assert.ok(step.description.split(/\s+/).length <= 36, `${role} copy is too long`);
    assert.doesNotMatch(step.description, /ISO|semantik|cakupan|peramban|browser/i);
  }
});

test('copy preserves operational asset and ticket permissions and account based replay', async () => {
  const {steps} = await load();
  const description = (role, path) => steps[role].find(step => step.element === `[data-tour-path="${path}"]`).description;
  for (const role of roles) {
    const asset = description(role, '/aset-it');
    assert.match(asset, /Operasional/);
    assert.doesNotMatch(asset, /Pembelajaran|seluruh aset/);
    assert.match(asset, /QR.*sekali.*cetak ulang/);
    const copy = steps[role].map(step => step.description).join(' ');
    assert.match(copy, /pengadaan.*akses akun/);
    assert.match(copy, /otomatis.*sekali.*akun/);
    assert.match(copy, /Panduan awal.*menu profil.*kapan pun/);
  }
  assert.match(description('Admin', '/aset-it'), /Kelola/);
  for (const role of roles.filter(role => role !== 'Admin')) assert.match(description(role, '/aset-it'), /Lihat/);
  assert.match(description('Kepala Lab', '/kelola-perangkat'), /Pembelajaran.*lab yang Anda pimpin/);
  assert.match(description('Guru', '/ticketing'), /tiket Anda/);
  assert.match(description('Kepala Lab', '/ticketing'), /tiket Anda.*lab yang Anda pimpin/);
  assert.match(description('Teknisi', '/ticketing'), /semua tiket.*ditugaskan/);
  for (const role of ['Admin', 'Koordinator Lab']) assert.match(description(role, '/ticketing'), /tiket sekolah.*penanggung jawab/);
});
