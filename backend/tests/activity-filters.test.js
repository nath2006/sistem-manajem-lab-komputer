import test from 'node:test';
import assert from 'node:assert/strict';
import { createActivityLogController } from '../controllers/activityLogController.js';
async function run(query) {
 const calls=[]; let status=200, body;
 await createActivityLogController({query:async(sql,args)=>{calls.push({sql,args}); return [sql.includes('COUNT')?[{total:41}]:[]];}})({query},{status(n){status=n;return this;},json(v){body=v;}},e=>{throw e;});
 return {calls,status,body};
}
test('filters bind actor/category/Jakarta day on count and paginated rows',async()=>{
 const r=await run({page:'2',limit:'20',actor:'12',category:'delete',date:'2026-11-11'});
 assert.equal(r.status,200); assert.match(r.calls[0].sql,/WHERE/);
 assert.deepEqual(r.calls[0].args,[12,'delete',Date.parse('2026-11-10T17:00:00Z')/1000,Date.parse('2026-11-11T17:00:00Z')/1000]);
 assert.match(r.calls[0].sql,/path LIKE '%\/approve'/);
 assert.deepEqual(r.calls[1].args,[...r.calls[0].args,20,20]); assert.equal(r.body.pagination.total,41);
});
test('rejects invalid filters before database access',async()=>{
 for(const query of [{actor:'1 OR 1=1'},{actor:['1']},{category:'oops'},{date:'2026-02-30'},{date:'2026-1-1'},{facets:'yes'}]){const r=await run(query);assert.equal(r.status,400);assert.equal(r.calls.length,0);}
});
test('optional facets expose only historical actor identity',async()=>{
 const r=await run({facets:'1'}); assert.equal(r.calls.length,3);assert.match(r.calls[2].sql,/FROM activity_logs/);assert.doesNotMatch(r.calls[2].sql,/users|password|SELECT \*/i);assert.deepEqual(r.body.facets,{actors:[]});
});
