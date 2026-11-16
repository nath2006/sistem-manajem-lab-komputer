import test from 'node:test';
import assert from 'node:assert/strict';
import { renderUI } from './helpers/renderUI.js';
import { readFile } from 'node:fs/promises';
test('all roles render scoped data charts with readable labels, totals, and native accessible data',async()=>{
 const source=await readFile(new URL('../src/Components/DashboardInsights.jsx',import.meta.url),'utf8').catch(()=> '');
 assert.ok(source,'shared dashboard insights exists');
 for(const role of ['Admin','Koordinator Lab','Kepala Lab','Teknisi','Guru']) {
 const html=await renderUI(`import React from 'react';import{renderToStaticMarkup}from'react-dom/server';import{DashboardInsightsView}from'./src/Components/DashboardInsights.jsx';module.exports=renderToStaticMarkup(<DashboardInsightsView role={${JSON.stringify(role)}} data={{tickets:{available:true,rows:[{label:'new',count:7},{label:'resolved',count:2}]},assets:${role==='Guru'?'null':"{categories:[{label:'Printer',count:3}],conditions:[{label:'Baik',count:3}]}"}}}/>);`);
 assert.match(html,/data-tour="dashboard-charts"/);assert.match(html,/Baru/);assert.match(html,/Diselesaikan/);assert.match(html,/role="img"/);assert.match(html,/>7</);assert.match(html,/Tiket terlihat/);
 if(role!=='Guru'){assert.match(html,/Aset per kategori/);assert.match(html,/Kondisi aset/);assert.match(html,/Printer/);}
 else assert.doesNotMatch(html,/Aset per kategori/);
 }
});
test('shared admin statistic cards retain compact neutral structure and readable labels',async()=>{
 const html=await renderUI(`import React from 'react';import{renderToStaticMarkup}from'react-dom/server';import Card from './src/Components/cardDashboard/CardStatAdmin.jsx';module.exports=renderToStaticMarkup(<Card icon={()=> <svg/>} count={1234567890} label="Perangkat"/>);`);
 assert.match(html,/dashboard-stat-card/);assert.match(html,/1234567890/);assert.match(html,/Perangkat/);
});
test('each real role page mounts the shared charts and scoped theme without changing persistent layout',async()=>{
 for(const path of ['admin/AdminDashboard','Guru/GuruDashboard','KepalaLab/KepalaLabDashboard','KoordinatorLab/KoordinatorLabDashboard','Teknisi/TeknisiDashboard']) {
  const source=await readFile(new URL(`../src/pages/${path}.jsx`,import.meta.url),'utf8');
  assert.match(source,/<DashboardInsights\s*\/>/,path);
  assert.match(source,/<DashboardTheme>/,path);
 }
});
