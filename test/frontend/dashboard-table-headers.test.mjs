import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dashboardTokens, contrastRatio } from '../../frontend/src/utils/dashboardTheme.js';

function declarations(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rules = [...css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'g'))];
  return Object.assign({}, ...rules.map(([, body]) => Object.fromEntries([...body.matchAll(/([\w-]+)\s*:\s*([^;]+);/g)].map(([, key, value]) => [key, value.trim()]))));
}

test('dashboard table headers use the same live primary and readable foreground as metric cards', async () => {
  const css = await readFile(new URL('../../frontend/src/Components/dashboardTheme.css', import.meta.url), 'utf8');
  const card = declarations(css, '.dashboard-theme .dashboard-stat-card');
  const header = declarations(css, '.dashboard-theme table thead.bg-maroon');
  const text = declarations(css, '.dashboard-theme table thead.bg-maroon .text-white');
  assert.equal(header.background, card.background);
  assert.equal(header.color, card.color);
  assert.equal(text.color, card.color);
  for (const primary of ['#2563eb', '#15803d', '#ffff00', '#f8fafc', '#000000', '#07152e', '#ff0000']) {
    const tokens = dashboardTokens(primary);
    assert.equal(tokens['--dashboard-brand'], primary);
    assert.equal(tokens['--dashboard-on-primary'], '#ffffff');
    assert.ok(contrastRatio(tokens['--dashboard-on-primary'], tokens['--dashboard-primary']) >= 6, primary);
  }
});
