import test from 'node:test';
import assert from 'node:assert/strict';
import { renderUI } from './helpers/renderUI.js';
import { dashboardTokens, contrastRatio } from '../src/utils/dashboardTheme.js';
import * as theme from '../src/utils/dashboardTheme.js';
const conditionTone = label => theme.conditionTone?.(label);
test('condition labels cannot mistake perbaikan for baik', () => {
 assert.equal(conditionTone('Perlu perbaikan'),'warning');
 assert.equal(conditionTone('Baik'),'success');
 assert.equal(conditionTone('Rusak berat'),'danger');
 assert.equal(conditionTone('Dalam Perbaikan'),'info');
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
test('chart fills stay at official defaults while selected primary updates metric tokens', () => {
 for (const primary of ['#2563eb','#15803d','#ff0000','#ffff00','#f8fafc','#000000','#07152e']) {
  const tokens = dashboardTokens(primary);
  assert.equal(tokens['--dashboard-primary'],primary);
  for (const [tone,index] of Object.entries({info:0,success:4,warning:3,danger:1})) assert.equal(tokens[`--dashboard-fill-${tone}`],theme.DEFAULT_CHART_COLORS[index]);
 }
});
