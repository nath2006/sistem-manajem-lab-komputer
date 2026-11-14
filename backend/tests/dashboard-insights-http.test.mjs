import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
const file = '../router/dashboardInsightsRoutes.js';
test('dashboard insights HTTP keeps envelope, authentication and five role policy',async()=>{
 const mod=await import(file).catch(e=>{if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;return {};});
 assert.equal(typeof mod.createDashboardInsightsRouter,'function','insights router exists');
 const app=express();app.use('/api/dashboard',mod.createDashboardInsightsRouter({query:async sql=>sql.includes('INFORMATION_SCHEMA')?[[]]:[[{label:'Baik',count:2}]]}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const url=`http://127.0.0.1:${server.address().port}/api/dashboard/insights`;
 const previous=process.env.JWT_SECRET;process.env.JWT_SECRET='dashboard-test-only';
 try {
  assert.equal((await fetch(url)).status,403);
  for(const role of ['Admin','Koordinator Lab','Kepala Lab','Teknisi','Guru','Guest']) {
   const response=await fetch(url,{headers:{Authorization:`Bearer ${jwt.sign({id:29,role},process.env.JWT_SECRET)}`}});
   assert.equal(response.status,role==='Guest'?403:200);
   if(response.ok){const body=await response.json();assert.equal(typeof body.message,'string');assert.equal(body.data.tickets.available,false);assert.equal(response.headers.get('cache-control'),'no-store');}
  }
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));if(previous===undefined) delete process.env.JWT_SECRET;else process.env.JWT_SECRET=previous;}
});
