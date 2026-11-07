import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { renderUI } from './helpers/renderUI.js';
const path = '../src/features/Ticketing/ticketingHelpers.js';
test('ticket route is protected for all logged-in roles and sidebar appends once', async () => {
  const app = readFileSync('src/App.jsx','utf8');
  assert.match(app, /<Route path="\/ticketing" element=\{<Ticketing \/>\} \/>/);
  assert.ok(app.indexOf('path="/ticketing"') > app.indexOf('<Route element={<ProtectedRoute />}'));
  assert.ok(app.indexOf('path="/ticketing"') < app.indexOf('/* Admin Only */'));
  const menus = await renderUI(`import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {MemoryRouter} from 'react-router-dom'; import Dashboard from './src/Layouts/Dashboard.jsx'; import {AuthContext} from './src/Context/AuthContext.jsx'; module.exports=['Admin','Guru','Kepala Lab','Koordinator Lab','Teknisi'].map(role=>({role,html:renderToStaticMarkup(<MemoryRouter><AuthContext.Provider value={{state:{role},dispatch:()=>{}}}><Dashboard title="Test"><p>Konten</p></Dashboard></AuthContext.Provider></MemoryRouter>)}));`);
  for (const { role, html } of menus) assert.equal((html.match(/href="\/ticketing"/g) || []).length, 1, `${role} must have exactly one ticket link`);
});
const helpers = async () => existsSync(new URL(path, import.meta.url)) ? import(path) : {};
test('action payload requires a reason, version and resolution or assignee as appropriate', async () => {
  const { actionPayload } = await helpers();
  assert.equal(typeof actionPayload, 'function');
  assert.throws(() => actionPayload({action:'pending',note:'  '},{version:3},{}), /catatan/i);
  assert.throws(() => actionPayload({action:'resolve',note:'done'},{version:3},{}), /resolusi/i);
  assert.throws(() => actionPayload({action:'assign',note:'team'},{version:3},{role:'Admin'}), /teknisi/i);
  assert.deepEqual(actionPayload({action:'assign',note:' claim '},{version:3},{role:'Teknisi',userId:8}), {action:'assign',note:'claim',version:3,assignee_id:8});
  assert.deepEqual(actionPayload({action:'resolve',note:' fixed ',resolution:' reboot ',root_cause:' power '},{version:4},{}), {action:'resolve',note:'fixed',version:4,resolution:'reboot',root_cause:'power'});
});
test('actions follow role, ownership and lifecycle, not every technician can verify', async () => {
  const { availableActions } = await helpers();
  assert.equal(typeof availableActions, 'function', 'missing ticket lifecycle helper');
  const ticket = {status:'resolved',reporter_id:1,assignee_id:2};
  assert.deepEqual(availableActions(ticket,{role:'Teknisi',userId:2}), []);
  assert.deepEqual(availableActions(ticket,{role:'Guru',userId:1}), ['close','reopen']);
  assert.ok(availableActions({...ticket,status:'new',assignee_id:null},{role:'Teknisi',userId:2}).includes('assign'));
  assert.ok(!availableActions({...ticket,status:'assigned'},{role:'Teknisi',userId:3}).includes('start'));
  assert.ok(availableActions({...ticket,status:'pending'},{role:'Admin',userId:3}).includes('resume'));
  assert.deepEqual(availableActions({...ticket,status:'cancelled'},{role:'Admin',userId:3}), []);
});
test('offered actions match backend prerequisites and independent verification', async () => {
  const { availableActions } = await helpers();
  assert.ok(!availableActions({status:'new',reporter_id:1,assignee_id:null},{role:'Admin',userId:9}).includes('start'));
  const selfReported = availableActions({status:'resolved',reporter_id:2,assignee_id:2},{role:'Teknisi',userId:2});
  assert.ok(!selfReported.includes('close'));
  assert.ok(selfReported.includes('reopen'));
  assert.ok(!availableActions({status:'assigned',reporter_id:1,assignee_id:2,escalated_at:'2026-01-01T00:00:00Z'},{role:'Guru',userId:1}).includes('escalate'));
});
test('detail conflicts expose reload of the current ticket rather than only refreshing the list', () => {
  const page = readFileSync('src/features/Ticketing/Ticketing.jsx','utf8');
  assert.match(page, /onClick=\{\(\) => openDetail\(detail.ticket_id\)\}[\s\S]{0,150}Muat ulang detail/);
});
