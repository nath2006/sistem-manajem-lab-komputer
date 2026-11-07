import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { renderUI } from './helpers/renderUI.js';

test('ticket rows retain detail actions and mobile labels stay hidden on desktop', async () => {
  const viewPath='src/features/Ticketing/TicketList.jsx';
  let view;
  if (existsSync(viewPath)) {
    view="import TicketList from './src/features/Ticketing/TicketList.jsx'; const View=()=> <TicketList tickets={rows} onDetail={openDetail}/>;";
  } else {
    const page=readFileSync('src/features/Ticketing/Ticketing.jsx','utf8');
    const start=page.indexOf('<div className="mt-4 overflow-x-auto">');
    const end=page.indexOf('\n          )}',start);
    assert.ok(start>=0 && end>start,'Ticket list renderer must exist');
    view=`const View=()=>(${page.slice(start,end)});`;
  }
  const html=await renderUI(`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {button,labels} from './src/features/Ticketing/ticketingUi';const rows=[{ticket_id:7,ticket_number:'TKT-000007',title:'PC perlu diperiksa',status:'new',type:'incident',priority:'P3',reporter_name:'Pelapor'}];const openDetail=()=>{};${view} module.exports=renderToStaticMarkup(<View/>);`);
  const mobileLabels=html.match(/<span\b[^>]*class="[^"]*mobile-cell-label[^"]*"[^>]*>/g)||[];
  assert.equal(mobileLabels.length,5);
  assert.ok(mobileLabels.every(label=>label.includes('sm:hidden')),'Mobile labels must not duplicate desktop column headings');
  assert.ok(html.includes('TKT-000007') && html.includes('Detail'));
});
