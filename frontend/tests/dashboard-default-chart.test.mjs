import test from 'node:test';
import fs from 'node:fs';
import { conditionTone } from '../src/utils/dashboardTheme.js';
const official = ['rgb(54, 162, 235)', 'rgb(255, 99, 132)', 'rgb(255, 159, 64)', 'rgb(255, 205, 86)', 'rgb(75, 192, 192)', 'rgb(153, 102, 255)', 'rgb(201, 203, 207)'];
test('exact installed Chart.js default palette stays brand independent', () => {
 const source=fs.readFileSync(new URL('../node_modules/chart.js/dist/chart.js',import.meta.url),'utf8');
 const block=source.slice(source.indexOf('const BORDER_COLORS = ['),source.indexOf('// Border colors with 50% transparency'));
 assert.deepEqual([...block.matchAll(/'([^']+)'/g)].map(m=>m[1]),official);
 for(const primary of primaries){const t=dashboardTokens(primary);official.forEach((color,i)=>assert.equal(t[`--dashboard-chart-${i}`],color));assert.equal(t['--dashboard-primary'],primary);}
});
test('conditions are distinct and independent of row order',()=>{
 const expected={'Baik':'success','Dalam Perbaikan':'info','Perlu Perbaikan':'warning','Rusak':'danger'};
 for(const labels of [Object.keys(expected),Object.keys(expected).reverse(),['Rusak','Baik'],['Dalam Perbaikan']])for(const label of labels)assert.equal(conditionTone(label),expected[label]);
});
import assert from 'node:assert/strict';
import { dashboardTokens } from '../src/utils/dashboardTheme.js';
const primaries=['#2563eb','#15803d','#800000','#ff0000','#ffff00','#ffffff','#000000','#07152e'];
test('semantic chart pigments use default blue, green, yellow and red',()=>{
 for(const primary of primaries){const t=dashboardTokens(primary);for(const [tone,index] of Object.entries({info:0,success:4,warning:3,danger:1}))assert.equal(t[`--dashboard-fill-${tone}`],official[index]);}
});
