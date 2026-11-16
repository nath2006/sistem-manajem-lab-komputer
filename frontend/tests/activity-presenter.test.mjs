import test from 'node:test';
import assert from 'node:assert/strict';
import { presentActivity, activityParams } from '../src/features/LogAktivitas/activityPresenter.mjs';
test('actual audit methods and route yield honest lab actions, not reference payments',()=>{
 const row=presentActivity({action:'write',method:'DELETE',path:'/api/komputer/:id',created_at:'2026-11-10T18:30:00Z'});
 assert.equal(row.category,'delete');assert.equal(row.resource,'Komputer');assert.match(row.date,/11/);assert.match(row.time,/01.30/);
 assert.equal(presentActivity({action:'login',method:'POST',path:'/api/auth/login'}).category,'login');
});
test('approval and ticket actions do not pretend to create records',()=>{
 assert.equal(presentActivity({method:'POST',action:'write',path:'/api/pengajuan/:id/approve'}).category,'update');
 assert.equal(presentActivity({method:'POST',action:'write',path:'/api/tickets/:id/actions'}).category,'update');
});
test('all filters are server params, empty filters omitted',()=>{
 assert.deepEqual(activityParams(2,{actor:'12',category:'delete',date:'2026-11-11'}),{page:2,limit:20,facets:'1',actor:'12',category:'delete',date:'2026-11-11'});
 assert.deepEqual(activityParams(1,{actor:'',category:'',date:''}),{page:1,limit:20,facets:'1'});
});
