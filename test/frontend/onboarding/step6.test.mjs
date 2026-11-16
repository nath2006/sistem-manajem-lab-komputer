import test from 'node:test';
import assert from 'node:assert/strict';
import { ROLE_STEPS } from '../../../frontend/src/Components/Onboarding/onboardingData.js';
import { renderUI } from '../helpers/renderUI.js';

test('feature tour v3 re-offers v2 users without erasing unrelated or previous completion', async () => {
  const api = await renderUI(`import * as api from './src/utils/onboarding.js'; module.exports=api;`);
  const auth = { isAuthenticated: true, isLoading: false, userId: 7, role: 'Guru' };
  const previous = 'lab:onboarding:v2:7:Guru';
  const values = new Map([[previous, 'done'], ['unrelated', 'preserve']]);
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const key = api.getOnboardingKey(auth);
  assert.equal(key, 'lab:onboarding:v3:7:Guru');
  assert.equal(api.isOnboardingComplete(key, storage), false);
  assert.equal(api.completeOnboarding(key, 'done', storage), true);
  assert.equal(values.get(previous), 'done');
  assert.equal(values.get('unrelated'), 'preserve');
  assert.equal(values.size, 3);
});

test('tour branding keeps readable text and focus accents for extreme configured colors', async () => {
  const api = await import('../../../frontend/src/Components/Onboarding/onboardingData.js');
  const luminance = hex => {
    const rgb = hex.match(/[a-f0-9]{2}/gi).map(value => parseInt(value, 16) / 255);
    const c = rgb.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  };
  const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
  for (const color of ['#ffff00', '#fafafa', '#000020', '#ff0000', '#2563eb', '#16a34a']) {
    const tokens = api.getTourColors(color);
    assert.ok(ratio(color, tokens.foreground) >= 4.5, color);
    assert.ok(ratio(tokens.hover, tokens.hoverForeground) >= 4.5, color);
    assert.ok(ratio('#ffffff', tokens.accent) >= 4.5, color);
  }
  assert.deepEqual(api.getTourColors('invalid'), api.getTourColors('#800000'));
});

test('Skip hover foreground contrasts with the actual CSS background blend, not assumed white', async () => {
  const { readFile } = await import('node:fs/promises');
  const { default: postcss } = await import('postcss');
  const css = postcss.parse(await readFile(new URL('../../../frontend/src/Components/Onboarding/onboarding.css', import.meta.url), 'utf8'));
  const declarations = selector => {
    const values = {};
    css.walkRules(rule => {
      if (rule.selectors.includes(selector)) rule.walkDecls(decl => { values[decl.prop] = decl.value; });
    });
    return values;
  };
  const normal = declarations('.lab-tour button.lab-tour-skip');
  const hover = { ...normal, ...declarations('.lab-tour button.lab-tour-skip:hover') };
  const rgb = hex => hex.slice(1).match(/../g).map(value => parseInt(value, 16));
  const luminance = channels => channels.map(value => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
  const failures = [];
  for (const primary of ['#ff0000', '#16a34a', '#ffff00', '#fafafa', '#000020']) {
    const tokens = (await import('../../../frontend/src/Components/Onboarding/onboardingData.js')).getTourColors(primary);
    const foreground = rgb(hover.color.replace(/var\(--tour-accent, var\(--color-maroon\)\)/, tokens.accent));
    const mix = hover.background.match(/^color-mix\(in srgb, var\(--color-maroon\) ([\d.]+)%, white\)$/);
    const background = mix ? rgb(primary).map(c => c * Number(mix[1]) / 100 + 255 * (1 - Number(mix[1]) / 100)) : rgb(hover.background === 'white' ? '#ffffff' : hover.background);
    const a = luminance(foreground), b = luminance(background);
    const contrast = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    if (contrast < 4.5) failures.push({ primary, foreground, background, contrast });
  }
  assert.deepEqual(failures, [], JSON.stringify(failures));
});

const assetTarget = '[data-tour-path="/aset-it"]';
test('QR guidance distinguishes scoped issuance, existing label printing and private procurement', () => {
  for (const [role, steps] of Object.entries(ROLE_STEPS)) {
    const qr = steps.find(step => step.title === 'QR dan verifikasi aset');
    assert.ok(qr, role);
    assert.equal(qr.element, assetTarget);
    assert.match(qr.description, /verifikasi publik/);
    assert.match(qr.description, /pengadaan.*privat/);
    if (role === 'Admin') assert.match(qr.description, /Terbitkan QR.*seluruh aset/);
    else if (role === 'Kepala Lab') assert.match(qr.description, /Terbitkan QR hanya.*Pembelajaran.*lab yang Anda pimpin/);
    else {
      assert.match(qr.description, /Lihat QR yang sudah ada dan cetak label/);
      assert.doesNotMatch(qr.description, /[Tt]erbitkan|[Bb]uat QR/);
    }
    assert.ok(qr.description.length < 300, role);
  }
});
test('Bantuan keeps the existing ticket route and explains each role workflow', () => {
  const descriptions = [];
  for (const [role, steps] of Object.entries(ROLE_STEPS)) {
    const help = steps.find(step => step.title === 'Bantuan (Ticketing)');
    assert.ok(help, role);
    assert.equal(help.element, '[data-tour-path="/ticketing"]');
    for (const word of ['kategori', 'prioritas', 'status', 'aset', 'komentar', 'riwayat']) {
      assert.ok(help.description.includes(word), `${role}: ${word}`);
    }
    if (['Admin', 'Koordinator Lab'].includes(role)) assert.match(help.description, /penanggung jawab/);
    else if (role === 'Teknisi') assert.match(help.description, /ditugaskan/);
    else assert.match(help.description, /tiket Anda/);
    descriptions.push(help.description);
  }
  assert.equal(new Set(descriptions).size, 5);
});

test('dashboard chart steps are role-tailored and optional outside the dashboard', async () => {
  const api = await import('../../../frontend/src/Components/Onboarding/onboardingData.js');
  const descriptions = new Set();
  for (const [role, steps] of Object.entries(ROLE_STEPS)) {
    const charts = steps.find(step => step.element === '[data-tour="dashboard-charts"]');
    assert.ok(charts, role);
    assert.equal(charts.title, 'Grafik dashboard');
    assert.equal(charts.optional, true);
    assert.match(charts.description, /grafik/i);
    if (role === 'Guru') assert.match(charts.description, /status tiket yang Anda laporkan/);
    else {
      assert.match(charts.description, /kategori dan kondisi aset/);
      assert.match(charts.description, /status tiket/);
      if (role === 'Kepala Lab') assert.match(charts.description, /laporan Anda.*lab yang Anda pimpin/);
    }
    descriptions.add(charts.description);
    assert.deepEqual(api.getTourSteps(role, () => true), steps);
    const withoutCharts = api.getTourSteps(role, () => false);
    assert.equal(withoutCharts.length, steps.length - 1);
    assert.equal(withoutCharts.at(-1).element, '[data-tour="profile"]');
    assert.ok(withoutCharts.some(step => step.title === 'Aset IT Sekolah'));
  }
  assert.equal(descriptions.size, 5);
  assert.deepEqual(api.getTourSteps('Unknown', () => true), []);
});

test('all five roles learn asset categories and their actual write scope', () => {
  assert.equal(Object.keys(ROLE_STEPS).length, 5);
  for (const [role, steps] of Object.entries(ROLE_STEPS)) {
    const asset = steps.find(step => step.title === 'Aset IT Sekolah');
    assert.ok(asset, role);
    assert.equal(asset.element, assetTarget);
    for (const word of ['Pembelajaran', 'Operasional', 'printer', 'jaringan']) {
      assert.ok(asset.description.includes(word), `${role}: ${word}`);
    }
    if (role === 'Admin') assert.match(asset.description, /kelola seluruh aset/);
    else if (role === 'Kepala Lab') assert.match(asset.description, /hanya.*Pembelajaran.*lab yang Anda pimpin/);
    else {
      assert.match(asset.description, /baca saja/);
      assert.doesNotMatch(asset.description, /tambah|ubah|kelola/);
    }
  }
});
