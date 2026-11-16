import test from 'node:test';
import assert from 'node:assert/strict';
import { renderUI } from './helpers/renderUI.js';

test('legacy async detail loader renders an accessible Flowbite skeleton instead of a spinner', async () => {
  const html=await renderUI(`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import Loading from './src/Components/DetailModal/LoadingSpinner';module.exports=renderToStaticMarkup(<Loading/>);`);
  assert.ok(html.includes('animate-pulse'));
  assert.ok(html.includes('role="status"'));
  assert.ok(!html.includes('animate-spin'));
});
test('shared table distinguishes loading from empty results and does not show fake data', async () => {
  const html=await renderUI(`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {MemoryRouter} from 'react-router-dom';import Table from './src/Layouts/Table';module.exports=renderToStaticMarkup(<MemoryRouter><Table isLoading title="Perangkat" data={[]} headers={[{judul:'Nama'},{judul:'Aksi'}]}/></MemoryRouter>);`);
  assert.ok(html.includes('animate-pulse'));
  assert.ok(html.includes('aria-busy="true"'));
  assert.ok(!html.includes('Tidak ada data yang tersedia.'));
});

test('counter skeleton has an intrinsic width inside shrink-to-fit statistics headings', async () => {
  const html=await renderUI(`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import Skeleton from './src/Components/Loading/Skeleton';module.exports=renderToStaticMarkup(<h2><Skeleton variant="text" rows={1}/></h2>);`);
  assert.ok(html.includes('w-24 max-w-full'));
});

test('background table refresh keeps populated records visible instead of flashing skeletons', async () => {
  const html=await renderUI(`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {MemoryRouter} from 'react-router-dom';import Table from './src/Layouts/Table';module.exports=renderToStaticMarkup(<MemoryRouter><Table isLoading title="Perangkat" data={[{id:1,name:'PC-01'}]} headers={[{judul:'Nama'}]} renderRow={row=><tr key={row.id}><td>{row.name}</td></tr>}/></MemoryRouter>);`);
  assert.ok(html.includes('PC-01'));
  assert.ok(!html.includes('animate-pulse'));
  assert.ok(html.includes('aria-busy="true"'));
});

test('synchronous head dashboard shortcuts do not get fake placeholders for undisplayed statistics', async () => {
  const html=await renderUI(`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {MemoryRouter} from 'react-router-dom';import Page from './src/pages/KepalaLab/KepalaLabDashboard';import {AuthContext} from './src/Context/AuthContext';module.exports=renderToStaticMarkup(<MemoryRouter><AuthContext.Provider value={{state:{role:'Kepala Lab',isLoading:false,fullName:'Penguji'},dispatch:()=>{}}}><Page/></AuthContext.Provider></MemoryRouter>);`);
  assert.ok(html.includes('Cek Pengajuan Lab'));
  assert.ok(!html.includes('data-skeleton='));
});
