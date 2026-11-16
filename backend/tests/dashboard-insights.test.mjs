import test from 'node:test';
import assert from 'node:assert/strict';

// Inject only the SQL adapter; visibility is the real ticket service's policy.
const load = async () => { const mod=await import('../services/dashboardInsightsService.js').catch(e=>{if(e.code!=='ERR_MODULE_NOT_FOUND') throw e;return {};}); assert.equal(typeof mod.createDashboardInsightsService,'function','dashboard insights service is implemented'); return mod.createDashboardInsightsService; };
function database({legacy=false}={}) {
  const calls=[];
  return { calls, async query(sql, args=[]) {
    calls.push({sql,args});
    if(sql.includes('INFORMATION_SCHEMA.COLUMNS')) return [[
      ...['perangkat_id','status',...(legacy?[]:['kategori'])].map(COLUMN_NAME=>({TABLE_NAME:'perangkat',COLUMN_NAME})),
      ...(legacy?[]:['ticket_id','status','reporter_id','assignee_id','perangkat_id'].map(COLUMN_NAME=>({TABLE_NAME:'service_tickets',COLUMN_NAME}))),
    ]];
    if(sql.includes('service_tickets')) return [[{label:'new',count:'3'}]];
    return [[{label:sql.includes('kategori')?'Printer':sql.includes("'Lainnya' AS label")?'Lainnya':'Baik',count:'7'}]];
  }};
}
test('insights aggregate all visible tickets using existing reporter/laboratory scope, never pagination',async()=>{
  const create=await load();
  for(const role of ['Admin','Koordinator Lab','Kepala Lab','Teknisi','Guru']) {
    const db=database(); const result=await create(db).get({id:29,role});
    assert.deepEqual(result.tickets.rows,[{label:'new',count:3}]);
    const q=db.calls.find(x=>x.sql.includes('service_tickets')&&!x.sql.includes('INFORMATION_SCHEMA'));
    if(role==='Guru') {assert.match(q.sql,/WHERE t.reporter_id=\?/);assert.deepEqual(q.args,[29]);}
    if(role==='Kepala Lab') {assert.match(q.sql,/t.reporter_id=\? OR l.kepala_lab_id=\?/);assert.deepEqual(q.args,[29,29]);}
    assert.doesNotMatch(q.sql,/LIMIT/);
    assert.equal(result.assets,role==='Guru'?null:result.assets);
    if(role!=='Guru') assert.deepEqual(result.assets.categories,[{label:'Printer',count:7}]);
  }
});
test('legacy metadata preserves real asset counts in Lainnya; unavailable tickets are not invented zeroes',async()=>{
  const create=await load();const db=database({legacy:true}); const result=await create(db).get({id:29,role:'Admin'});
  assert.deepEqual(result.tickets,{available:false,rows:[],reason:'Skema ticketing belum tersedia.'});
  assert.equal(db.calls.some(x=>x.sql.includes(' FROM service_tickets')),false);
  assert.deepEqual(result.assets.categories,[{label:'Lainnya',count:7}]);
});
test('legacy assets without condition metadata preserve total under Lainnya',async()=>{
 const create=await load();const db=database({legacy:true});const query=db.query.bind(db);
 db.query=async(s,a)=>s.includes('INFORMATION_SCHEMA')?[[{TABLE_NAME:'perangkat',COLUMN_NAME:'perangkat_id'}]]:query(s,a);
 assert.deepEqual((await create(db).get({id:29,role:'Admin'})).assets.conditions,[{label:'Lainnya',count:7}]);
});
test('missing ticket columns fail closed; query faults remain errors',async()=>{
  const create=await load(); const db=database(); const query=db.query.bind(db);
  db.query=async(s,a)=>s.includes('INFORMATION_SCHEMA')?[[{TABLE_NAME:'service_tickets',COLUMN_NAME:'status'},{TABLE_NAME:'perangkat',COLUMN_NAME:'status'}]]:query(s,a);
  assert.equal((await create(db).get({id:29,role:'Guru'})).tickets.available,false);
  await assert.rejects(create({query:async()=>{throw new Error('offline');}}).get({id:29,role:'Admin'}),/offline/);
  await assert.rejects(create(db).get({id:29,role:'Visitor'}),e=>e.status===403);
});
