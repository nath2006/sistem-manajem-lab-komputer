import test from 'node:test';
import assert from 'node:assert/strict';
import { renderUI } from './helpers/renderUI.js';
import { dashboardTokens, contrastRatio } from '../src/utils/dashboardTheme.js';
import * as theme from '../src/utils/dashboardTheme.js';
const conditionTone = label => theme.conditionTone?.(label);
test('condition labels cannot mistake perbaikan for baik', () => {
 assert.equal(conditionTone('Perlu perbaikan'),'warning');
 assert.equal(conditionTone('Baik'),'success');
 assert.equal(conditionTone('Rusak berat'),'warning');
 assert.equal(conditionTone('Tidak diketahui'),'info');
});
test('confident brand surfaces and coordinated series are derived from the configured theme', () => {
 const t=dashboardTokens('#2563eb');
 assert.equal(t['--dashboard-card-medium'], '#bed0f9');
 assert.equal(t['--dashboard-chart-fill'], '#6692f1');
 assert.equal(t['--dashboard-series-0'],t['--dashboard-accent']);
 assert.ok(contrastRatio(t['--dashboard-on-card-medium'],t['--dashboard-card-medium'])>=4.5);
});
test('real chart module renders named canvas and visible numeric data alternative', async () => {
 const html = await renderUI(`import React from 'react';import{renderToStaticMarkup}from'react-dom/server';import{DashboardInsightsView}from'./src/Components/DashboardInsights.jsx';module.exports=renderToStaticMarkup(<DashboardInsightsView role="Guru" data={{assets:null,tickets:{available:true,rows:[{label:'new',count:7}]}}}/>);`);
 assert.match(html, /<canvas[^>]*role="img"/);
 assert.match(html, /aria-label="Tiket per status/);
 assert.match(html, /<details/);
 assert.match(html, /Baru/);
 assert.match(html, />7</);
});
test('soft surfaces follow primary but readable outlines do not rely on pastel contrast', () => {
 for (const primary of ['#2563eb','#15803d','#ff0000','#ffff00','#f8fafc','#000000','#07152e']) {
  const t = dashboardTokens(primary);
  assert.match(t['--dashboard-soft'], /^#[a-f0-9]{6}$/i);
  assert.ok(contrastRatio(t['--dashboard-accent'], t['--dashboard-soft']) >= 4.5);
 }
});
test('chart fills use solid semantic tokens and update with the selected primary', () => {
 const primaries = ['#2563eb', '#15803d', '#ff0000', '#ffff00', '#f8fafc', '#000000', '#07152e'];
 for (const primary of primaries) {
  const tokens = dashboardTokens(primary);
  for (const tone of ['info', 'success', 'warning', 'danger']) {
   assert.equal(tokens[`--dashboard-fill-${tone}`], tokens[`--dashboard-${tone}`]);
   assert.ok(contrastRatio(tokens[`--dashboard-fill-${tone}`], tokens['--dashboard-surface']) >= 3);
  }
  assert.equal(tokens['--dashboard-chart-0'], primary);
  for (const [index, tone] of ['info', 'success', 'warning'].entries()) {
   assert.equal(tokens[`--dashboard-chart-${index + 1}`], tokens[`--dashboard-${tone}`]);
  }
 }
 for (const tone of ['info', 'success', 'warning', 'danger']) {
  assert.notEqual(dashboardTokens(primaries[0])[`--dashboard-fill-${tone}`], dashboardTokens(primaries[1])[`--dashboard-fill-${tone}`]);
 }
});
