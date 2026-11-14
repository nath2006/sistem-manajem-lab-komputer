import test from 'node:test';
import assert from 'node:assert/strict';
import { renderUI } from './helpers/renderUI.js';

test('all role shells consolidate Bantuan into the preserved ticketing route and tour target', async () => {
  const results = await renderUI(`import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {MemoryRouter} from 'react-router-dom'; import {AuthContext} from './src/Context/AuthContext'; import {SettingsProvider} from './src/Context/SettingsContext'; import {DashboardShell} from './src/Layouts/Dashboard'; module.exports=['Admin','Guru','Kepala Lab','Koordinator Lab','Teknisi'].map(role=>renderToStaticMarkup(<MemoryRouter><AuthContext.Provider value={{state:{role,fullName:'Synthetic'}}}><SettingsProvider><DashboardShell title="Uji" /></SettingsProvider></AuthContext.Provider></MemoryRouter>));`);
  assert.equal(results.length, 5);
  for (const html of results) {
    assert.match(html, /<a\b[^>]*aria-label="Bantuan"[^>]*data-tour-path="\/ticketing"[^>]*href="\/ticketing"/);
    assert.equal((html.match(/href="\/ticketing"/g) || []).length, 1);
    assert.doesNotMatch(html, /href="\/bantuan"/);
  }
});
