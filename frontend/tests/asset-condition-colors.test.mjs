import test from 'node:test';
import assert from 'node:assert/strict';
import {renderUI} from './helpers/renderUI.js';
test('inventory native table shows four distinct labeled semantic badges', async()=>{
 const render=await renderUI(`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {MemoryRouter} from 'react-router-dom';import AssetTable from './src/features/AsetIT/AssetTable.jsx';module.exports=(status)=>renderToStaticMarkup(<MemoryRouter><AssetTable data={[{perangkat_id:1,status,nama_perangkat:'Fixture'}]} user={{role:'Guru'}}/></MemoryRouter>);`);
 for(const [status,color] of [['Baik','emerald'],['Dalam Perbaikan','blue'],['Perlu Perbaikan','amber'],['Rusak','red']]){const html=render(status);assert.match(html,/<table/);assert.match(html,new RegExp(`bg-${color}-50 text-${color}-700`));assert.ok(html.includes(status));}
});
test('public verification distinguishes in-repair blue from repair-needed amber', async()=>{
 const render=await renderUI(`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {MemoryRouter} from 'react-router-dom';import {VerificationView} from './src/features/AsetIT/AssetVerification.jsx';module.exports=(status)=>renderToStaticMarkup(<MemoryRouter><VerificationView asset={{status,nama_perangkat:'Fixture',specifications:[]}}/></MemoryRouter>);`);
 for(const [status,color] of [['Baik','emerald'],['Dalam Perbaikan','blue'],['Perlu Perbaikan','amber'],['Rusak','red']])assert.match(render(status),new RegExp(`bg-${color}-50 text-${color}-700`));
});
