import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderUI } from './helpers/renderUI.js';

test('options refresh is independent of list mutations and search is debounced', () => {
  const page = readFileSync('src/features/Ticketing/Ticketing.jsx', 'utf8');
  assert.match(page, /\}, \[optionsRefresh\]\)/);
  assert.match(page, /useDebouncedValue\(search, 250\)/);
  assert.doesNotMatch(page, /role="dialog"/);
});

test('focused forms consume backend classification options and retain accessible shared UI', async () => {
  const html = await renderUI(`import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import Create from './src/features/Ticketing/CreateTicketForm'; import Action from './src/features/Ticketing/TicketActionForm'; import Classification from './src/features/Ticketing/TicketClassificationForm'; import Policy from './src/features/Ticketing/SlaPolicyForm'; const options={types:['custom_type'], categories:['custom_category'],policies:[{priority:'P1',response_minutes:5,resolution_minutes:60}]}; const props={options,detail:{version:3,status:'assigned',assignee_id:2,type:'custom_type',category:'custom_category',impact:'medium',urgency:'medium'},state:{role:'Admin'},closeModal:()=>{},onSubmit:()=>{}}; module.exports=[Create,Action,Classification,Policy].map(Form=>renderToStaticMarkup(<Form {...props}/>));`);
  assert.match(html[0], /value="custom_type" selected/);
  assert.match(html[0], /value="custom_category" selected/);
  assert.doesNotMatch(html[0], /value="hardware"/);
  assert.match(html[1], /Tindakan tiket/);
  assert.match(html[1], /value="start"/);
  assert.match(html[2], /Alasan perubahan/);
  assert.match(html[3], /value="60"/);
  for (const form of html) { assert.match(form, /<form/); assert.doesNotMatch(form, /role="dialog"/); }
});

test('source-linked notice keeps repair prerequisite and role-specific link', async () => {
  const result = await renderUI(`import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {MemoryRouter} from 'react-router-dom'; import {SourceNotice} from './src/features/Ticketing/Ticketing.jsx'; module.exports = ['Admin','Guru'].map(role => renderToStaticMarkup(<MemoryRouter><SourceNotice sourceId={12} role={role}/></MemoryRouter>));`);
  assert.match(result[0], /Catat perbaikan berhasil/);
  assert.match(result[0], /href="\/kelola-perbaikan"/);
  assert.doesNotMatch(result[1], /href=/);
});

test('repair navigation remains client-side instead of reloading the document', async () => {
  const {SourceNotice}=await renderUI(`export {SourceNotice} from './src/features/Ticketing/Ticketing.jsx';`);
  const notice=SourceNotice({sourceId:12,role:'Admin'});
  const link=notice.props.children.find(child=>child?.props?.children==='Buka Perbaikan Perangkat');
  assert.equal(link.props.to,'/kelola-perbaikan');
  assert.notEqual(link.type,'a');
});
