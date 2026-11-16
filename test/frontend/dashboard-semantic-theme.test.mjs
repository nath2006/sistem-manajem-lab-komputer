import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardTokens, contrastRatio } from '../../frontend/src/utils/dashboardTheme.js';

const themes = ['#ffff00', '#f8fafc', '#000000', '#07152e', '#ff0000', '#2563eb', '#15803d'];
test('every semantic card tone follows live primary while preserving AA foreground and chart contrast', () => {
  for (const tone of ['info', 'success', 'warning', 'danger']) {
    const colors = themes.map(primary => {
      const tokens = dashboardTokens(primary);
      const color = tokens[`--dashboard-${tone}`];
      assert.ok(contrastRatio(tokens[`--dashboard-on-${tone}`], color) >= 4.5, `${primary} ${tone} text`);
      assert.ok(contrastRatio(color, tokens['--dashboard-surface']) >= 3, `${primary} ${tone} graph`);
      return color;
    });
    assert.equal(new Set(colors).size, themes.length, `${tone} must respond to every primary, not a static palette`);
  }
});
