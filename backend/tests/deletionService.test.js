import test from 'node:test';
import assert from 'node:assert/strict';
const load = () => import('../services/deletionService.js');
function fixture({ linked = {}, row = { label: 'Contoh', lab_id: 4 }, failure } = {}) {
 const calls = [];
 const conn = { async query(sql, args) { calls.push([sql,args]); if (failure && sql.startsWith('DELETE')) throw failure;
 if (sql.includes('information_schema.KEY_COLUMN_USAGE')) return [[]];
 if (sql.includes('information_schema.TABLES')) return [[{TABLE_NAME:'service_tickets'},{TABLE_NAME:'ticket_events'},{TABLE_NAME:'ticket_policy_events'},{TABLE_NAME:'activity_logs'}]];
 if (sql.startsWith('SELECT') && sql.includes(' AS label')) return [row ? [row] : []];
 if (sql.includes('kepala_lab_id FROM laboratorium')) return [[{kepala_lab_id:8}]];
 if (sql.startsWith('SELECT 1')) { const table = sql.match(/FROM `([^`]+)`/)[1]; return [Array.from({length:linked[table] || 0},()=>({1:1}))]; }
 return [{affectedRows:1}]; }, async beginTransaction(){calls.push(['BEGIN']);},async commit(){calls.push(['COMMIT']);},async rollback(){calls.push(['ROLLBACK']);},release(){calls.push(['RELEASE']);} };
 return {calls, pool:{...conn,async getConnection(){return conn;}}};
}
test('preview blocks user cascading schedules without exposing personal records', async()=>{
 const {createDeletionService}=await load(); const f=fixture({linked:{jadwal_lab:2}});
 const data=await createDeletionService({db:f.pool}).preview('user','7',{id:1,role:'Admin'});
 assert.equal(data.can_delete,false); assert.equal(data.blockers.find(b=>b.key==='jadwal_lab.guru_id').count,2);
 assert.ok(!f.calls.some(([s])=>s==='BEGIN'||s.startsWith('DELETE')));
});
const admin={id:1,role:'Admin'};
test('invalid resources and injection-like IDs never query',async()=>{
 const {createDeletionService}=await load(); const f=fixture();const svc=createDeletionService({db:f.pool});
 for(const id of ['0','-1','1 OR 1=1','1.0','1e1',' 1','01','2147483648']) await assert.rejects(svc.preview('user',id,admin),{status:400});
 await assert.rejects(svc.preview('user; DROP TABLE user','2',admin),{status:404});
 await assert.rejects(svc.preview('user','2',null),{status:401});
 await assert.rejects(svc.preview('user','2',{id:3,role:'Guru'}),{status:403});assert.equal(f.calls.length,0);
});
test('head cannot inspect or delete cross-lab device',async()=>{
 const {createDeletionService}=await load();const f=fixture();const svc=createDeletionService({db:f.pool});
 for(const method of ['preview','remove']) await assert.rejects(svc[method]('perangkat','2',{id:9,role:'Kepala Lab'}),{status:403});
 assert.ok(!f.calls.some(([s])=>s.startsWith('DELETE')));assert.ok(f.calls.some(([s])=>s==='ROLLBACK'));assert.equal(f.calls.at(-1)[0],'RELEASE');
});
test('active user and maintenance histories are retained',async()=>{
 const {createDeletionService}=await load();const f=fixture();const svc=createDeletionService({db:f.pool});
 const own=await svc.preview('user','1',admin);assert.equal(own.blockers[0].key,'self');
 for(const r of ['pengecekan','perbaikan']) {await assert.rejects(svc.remove(r,'2',admin),{status:409});}
 assert.ok(!f.calls.some(([s])=>s.startsWith('DELETE')));
});
test('delete rechecks dependencies after an earlier clear preview and never cascades lab/user',async()=>{
 const {createDeletionService}=await load();
 for(const [resource,table] of [['user','pengajuan_lab'],['laboratorium','jadwal_lab'],['perangkat','perbaikan'],['pemeriksaan','pengecekan']]) {
 const linked={};const f=fixture({linked});const svc=createDeletionService({db:f.pool});assert.equal((await svc.preview(resource,'2',admin)).can_delete,true);
 linked[table]=1;await assert.rejects(svc.remove(resource,'2',admin),{status:409});assert.ok(!f.calls.some(([s])=>s.startsWith('DELETE')));
 assert.ok(f.calls.some(([s])=>s.includes('AS label')&&s.endsWith('FOR UPDATE')));assert.equal(f.calls.at(-1)[0],'RELEASE');
 }
});
test('successful removal uses single connection and serializable locking reads before commit',async()=>{
 const {createDeletionService}=await load();const f=fixture();await createDeletionService({db:f.pool}).remove('perangkat','2',admin);
 const statements=f.calls.map(([s])=>s);assert.equal(statements[0],'SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');assert.equal(statements[1],'BEGIN');
 assert.ok(statements.filter(s=>s.startsWith('SELECT 1')).every(s=>s.endsWith('FOR UPDATE')));assert.match(statements.at(-3),/^DELETE FROM `perangkat`/);assert.deepEqual(statements.slice(-2),['COMMIT','RELEASE']);
});
test('SQL deletion failure rolls back and releases without raw SQL leakage',async()=>{
 const {createDeletionService,sendDeletionError}=await load();const f=fixture({failure:Object.assign(new Error('secret SQL'),{errno:1451})});
 await assert.rejects(createDeletionService({db:f.pool}).remove('user','2',admin),e=>{assert.equal(e.status,409);assert.ok(!e.message.includes('secret'));assert.equal(e.data.label,'Contoh');assert.equal(e.data.message,e.message);return true;});
 assert.deepEqual(f.calls.slice(-2).map(([s])=>s),['ROLLBACK','RELEASE']);
 const res={status(n){this.code=n;return this;},json(body){this.body=body;}};sendDeletionError(res,new Error('secret SQL'));assert.equal(res.code,500);assert.ok(!JSON.stringify(res.body).includes('secret'));
});
test('missing target returns 404 and releases its transaction',async()=>{
 const {createDeletionService}=await load();const f=fixture({row:null});await assert.rejects(createDeletionService({db:f.pool}).remove('user','2',admin),{status:404});assert.deepEqual(f.calls.slice(-2).map(([s])=>s),['ROLLBACK','RELEASE']);
});
test('legacy preview skips only absent optional tables and propagates unrelated SQL errors',async()=>{
 const {createDeletionService}=await load();const f=fixture();const original=f.pool.query;
 f.pool.query=async(sql,args)=>sql.includes('information_schema.TABLES')?[[]]:original(sql,args);
 const data=await createDeletionService({db:f.pool}).preview('user','2',admin);assert.equal(data.can_delete,true);
 assert.ok(!f.calls.some(([s])=>/FROM `(?:service_tickets|ticket_events|ticket_policy_events)`/.test(s)));
 f.pool.query=async()=>{throw new Error('Database unavailable');};await assert.rejects(createDeletionService({db:f.pool}).preview('user','2',admin),/Database unavailable/);
});
test('ticket actor and policy history prevent user deletion; snapshots are not removed',async()=>{
 const {createDeletionService}=await load();
 for(const table of ['service_tickets','ticket_events','ticket_policy_events','pengumuman','laboratorium']) {
 const f=fixture({linked:{[table]:1}});await assert.rejects(createDeletionService({db:f.pool}).remove('user','2',admin),e=>e.status===409&&e.data.blockers.some(b=>b.key.startsWith(table+'.')));
 assert.ok(!f.calls.some(([s])=>s.startsWith('DELETE')));
 }
});
test('foreign keys discovered beyond the static list also prevent cascades',async()=>{
 const {createDeletionService}=await load();const f=fixture({linked:{new_child:3}});const original=f.pool.query;
 f.pool.query=async(sql,args)=>sql.includes('information_schema.KEY_COLUMN_USAGE')?[[{TABLE_NAME:'new_child',COLUMN_NAME:'owner_id'}]]:original(sql,args);
 const data=await createDeletionService({db:f.pool}).preview('user','2',admin);assert.equal(data.blockers[0].key,'new_child.owner_id');assert.equal(data.blockers[0].count,3);assert.equal(data.blockers[0].path,null);
});
test('rollback failure still releases the exact connection and preserves original error',async()=>{
 const {createDeletionService}=await load();const f=fixture();const rollbackError=new Error('rollback failed');const originalError=new Error('query failed');let released=false;
 f.pool.getConnection=async()=>({query:async()=>{throw originalError;},beginTransaction:async()=>{},release:()=>{released=true;}});
 await assert.rejects(createDeletionService({db:f.pool}).remove('user','2',admin),e=>e===originalError);assert.equal(released,true);
 const c={query:async(sql)=>{if(sql.startsWith('SET'))return [];throw originalError;},beginTransaction:async()=>{},rollback:async()=>{throw rollbackError;},destroy:()=>{destroyed=true;},release:()=>{released=true;}};
 let destroyed=false;released=false;f.pool.getConnection=async()=>c;await assert.rejects(createDeletionService({db:f.pool}).remove('user','2',admin),e=>e===originalError);assert.equal(destroyed,true);assert.equal(released,false);
});
test('release failure cannot turn a committed deletion into an error response',async()=>{
 const {createDeletionService}=await load();const f=fixture();const original=f.pool.getConnection;let destroyed=false;
 f.pool.getConnection=async()=>{const c=await original();return {...c,release(){throw new Error('release failed');},destroy(){destroyed=true;}};};
 const row=await createDeletionService({db:f.pool}).remove('user','2',admin);assert.equal(row.label,'Contoh');assert.equal(destroyed,true);
});
export {fixture};
