import test from 'node:test';
import assert from 'node:assert/strict';
import { renderUI } from './helpers/renderUI.js';

test('coordinator dashboard distinguishes initial loading from an empty laboratory list', async () => {
  const html=await renderUI(`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {MemoryRouter} from 'react-router-dom';import Page from './src/pages/KoordinatorLab/KoordinatorLabDashboard.jsx';import {AuthContext} from './src/Context/AuthContext.jsx';module.exports=renderToStaticMarkup(<MemoryRouter><AuthContext.Provider value={{state:{role:'Koordinator Lab'},dispatch:()=>{}}}><Page/></AuthContext.Provider></MemoryRouter>);`);
  assert.ok(html.includes('Memuat data lab...'));
  assert.ok(!html.includes('Kapasitasnpm'));
});
