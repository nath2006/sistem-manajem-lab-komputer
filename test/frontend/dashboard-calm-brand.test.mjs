import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardTokens, contrastRatio, DEFAULT_CHART_COLORS } from '../../frontend/src/utils/dashboardTheme.js';

test('bright dashboard brands use calm solid surfaces with white foreground rather than black text', () => {
  const surfaces = new Set();
  for (const brand of ['#ff0000', '#ffff00', '#3b82f6', '#0000ff', '#f8fafc', '#000000', '#15803d']) {
    const tokens = dashboardTokens(brand);
    assert.equal(tokens['--dashboard-on-primary'], '#ffffff', brand);
    assert.equal(tokens['--dashboard-brand'], brand, 'original selected brand remains available');
    assert.ok(contrastRatio('#ffffff', tokens['--dashboard-primary']) >= 6, brand);
    assert.deepEqual(Array.from({length:7}, (_,i) => tokens[`--dashboard-chart-${i}`]), DEFAULT_CHART_COLORS);
    assert.deepEqual(dashboardTokens(brand), tokens, 'live changes are deterministic');
    surfaces.add(tokens['--dashboard-primary']);
  }
  assert.equal(surfaces.size, 7, 'different school colors do not collapse into one surface');
});
