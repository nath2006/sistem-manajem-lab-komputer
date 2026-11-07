import test from 'node:test';
import assert from 'node:assert/strict';
import { createTicketService } from '../services/ticketService.js';
import { createTicketWorkflowService } from '../services/ticketWorkflowService.js';

const actor = { id: 8, role: 'Admin' };
const row = { ticket_id: 1, version: 2, status: 'new', reporter_id: 4, assignee_id: 9, perangkat_id: 3, created_at: '2026-01-01 00:00:00', response_due_at: '2026-01-01 04:00:00', resolution_due_at: '2026-01-02 00:00:00' };
const body = { title: 'broken', description: 'fault', type: 'incident', category: 'hardware', impact: 'medium', urgency: 'medium' };
const policies = ['P1','P2','P3','P4'].map(priority => ({priority,response_minutes:15,resolution_minutes:240}));
function harness({missingUser, missingDevice = false, beforeQuery} = {}) {
  const calls = [];
  const c = {
    async beginTransaction(){calls.push(['begin']);}, async commit(){calls.push(['commit']);}, async rollback(){calls.push(['rollback']);}, release(){calls.push(['release']);},
    async query(sql,args = []) {
      calls.push([sql,args]);
      const override = await beforeQuery?.(sql,args);
      if (override) return override;
      if (/FROM user WHERE user_id=\?/.test(sql)) return [args[0] === missingUser ? [] : [{user_id:args[0],role:'Teknisi'}]];
      if (/FROM perangkat WHERE/.test(sql)) return [missingDevice ? [] : [{perangkat_id:args[0]}]];
      if (sql.includes('FROM pengecekan pc')) return [[{pengecekan_id:7,user_id:4,perangkat_id:3,tanggal_pengecekan:'2026-01-01 00:00:00',ditemukan_kerusakan:'fault'}]];
      if (sql.includes('WHERE pengecekan_id=?')) return [[]];
      if (sql.includes('FROM service_tickets')) return [[row]];
      if (sql.includes('ticket_sla_policies')) return [policies];
      return [{insertId:1}];
    }
  };
  const db = {async getConnection(){return c;},query(){throw Error('global pool used');}};
  const base = createTicketService(db,()=>new Date('2026-01-01T00:00:00Z'));
  return {calls,base,workflow:createTicketWorkflowService(base,db,()=>new Date('2026-01-01T00:00:00Z'))};
}
test('comment locks and revalidates all logical parents before mutation, retaining locks until commit', async()=>{
  const h=harness();
  await h.base.action(actor,1,{action:'comment',version:2,note:'checked'});
  const firstWrite=h.calls.findIndex(([s])=>s.startsWith('UPDATE'));
  const locks=h.calls.slice(0,firstWrite).filter(([s])=>/FROM (user|perangkat) WHERE/.test(s));
  assert.deepEqual(locks.map(([,a])=>a[0]),[4,8,9,3]);
  assert.ok(locks.every(([s])=>s.endsWith('FOR UPDATE')));
  assert.ok(h.calls.findIndex(([s])=>s==='commit')>h.calls.findIndex(([s])=>s.startsWith('INSERT INTO ticket_events')));
});
test('workflow writers reject deleted actors before ticket, classification, import or policy writes', async()=>{
  for (const run of [h=>h.workflow.create(actor,{...body,perangkat_id:3}), h=>h.workflow.reclassify(actor,1,{...body,version:2,note:'reassess'}), h=>h.workflow.importMaintenance(actor), h=>h.workflow.updatePolicies(actor,{note:'targets',policies})]) {
    const h=harness({missingUser:8});
    await assert.rejects(()=>run(h),{status:400});
    assert.ok(!h.calls.some(([s])=>/^(INSERT|UPDATE)/.test(s)));
  }
});

test('delayed create after an earlier snapshot waits for deletion then rejects the missing current parent', async()=>{
  let releaseDelete;
  const deletionCommitted = new Promise(resolve=>{releaseDelete=resolve;});
  let reachedLock;
  const atLock = new Promise(resolve=>{reachedLock=resolve;});
  const h=harness({beforeQuery:async(sql)=>{
    if (sql.includes('FROM user WHERE')) {
      assert.ok(h.calls.some(([s])=>s.includes('FROM ticket_sla_policies')),'earlier transaction snapshot already exists');
      assert.match(sql,/FOR UPDATE$/);
      reachedLock();
      await deletionCommitted;
      return [[]];
    }
  }});
  const writing=h.workflow.create(actor,body);
  await atLock;
  assert.ok(!h.calls.some(([s])=>s.startsWith('INSERT')));
  releaseDelete();
  await assert.rejects(()=>writing,{status:400});
  assert.ok(h.calls.some(([s])=>s==='rollback'));
  assert.ok(!h.calls.some(([s])=>s.startsWith('INSERT')));
});

for (const action of ['comment','escalate','assign']) {
  test(`${action} rejects missing actor, reporter, assignee, device and assignment target before writes`,async()=>{
    for(const absent of [{missingUser:8},{missingUser:4},{missingUser:9},{missingDevice:true},...(action==='assign'?[{missingUser:12}]:[])]) {
      const h=harness(absent);
      await assert.rejects(()=>h.base.action(actor,1,{action,version:2,note:'checked',assignee_id:12}),{status:400});
      assert.ok(!h.calls.some(([s])=>/^(INSERT|UPDATE)/.test(s)));
    }
  });
}
for (const [name, run, expected] of [
  ['create',h=>h.workflow.create(actor,{...body,perangkat_id:3}),[8,3]],
  ['import',h=>h.workflow.importMaintenance(actor),[4,8,3]],
  ['reclassify',h=>h.workflow.reclassify(actor,1,{...body,version:2,note:'reassess'}),[4,8,9,3]],
  ['policy',h=>h.workflow.updatePolicies(actor,{note:'targets',policies}),[8]],
]) {
  test(`${name} locks expected parents before its first write on the transaction connection`,async()=>{
    // updatePolicies intentionally reads the final result outside the transaction.
    const h=harness();
    if(name==='policy') {
      // The returned pool read happens only after commit; replace that read via
      // a separate workflow's explicit pool while retaining the real tx service.
      h.workflow=createTicketWorkflowService(h.base,{query:async()=>{
        assert.ok(h.calls.some(([s])=>s==='commit'));
        return [policies];
      }});
    }
    await run(h);
    const firstWrite=h.calls.findIndex(([s])=>/^(INSERT|UPDATE)/.test(s));
    const locks=h.calls.slice(0,firstWrite).filter(([s])=>/FROM (user|perangkat) WHERE/.test(s));
    assert.deepEqual([...new Set(locks.map(([,args])=>args[0]))],expected);
    assert.ok(locks.every(([s])=>s.endsWith('FOR UPDATE')));
    assert.ok(h.calls.findIndex(([s])=>s==='commit')>firstWrite);
  });
}

test('create/import/reclassification reject deleted reporter or device before writes',async()=>{
  for(const [absent,run] of [
    [{missingUser:8},h=>h.workflow.create(actor,body)],
    [{missingDevice:true},h=>h.workflow.create(actor,{...body,perangkat_id:3})],
    [{missingUser:4},h=>h.workflow.importMaintenance(actor)],
    [{missingDevice:true},h=>h.workflow.importMaintenance(actor)],
    [{missingUser:4},h=>h.workflow.reclassify(actor,1,{...body,version:2,note:'reassess'})],
    [{missingDevice:true},h=>h.workflow.reclassify(actor,1,{...body,version:2,note:'reassess'})],
  ]) {
    const h=harness(absent);
    await assert.rejects(()=>run(h),{status:400});
    assert.ok(!h.calls.some(([s])=>/^(INSERT|UPDATE)/.test(s)));
  }
});

test('parent-lock deadlock aborts and rolls back without writes or automatic retry',async()=>{
  const deadlock=Object.assign(Error('deadlock'),{code:'ER_LOCK_DEADLOCK'});
  const h=harness({beforeQuery:async(sql)=>{if(sql.includes('FROM user WHERE'))throw deadlock;}});
  await assert.rejects(()=>h.base.action(actor,1,{action:'comment',version:2,note:'checked'}),e=>e===deadlock);
  assert.deepEqual(h.calls.filter(([s])=>['begin','rollback','release','commit'].includes(s)).map(([s])=>s),['begin','rollback','release']);
  assert.ok(!h.calls.some(([s])=>/^(INSERT|UPDATE)/.test(s)));
});

test('missing actor identity cannot bypass optional parent filtering',async()=>{
  for(const identity of [undefined,null,0,'1e2']) {
    const h=harness();
    const invalid={id:identity,role:'Admin'};
    for(const run of [()=>h.base.action(invalid,1,{action:'comment',version:2,note:'ghost'}),()=>h.workflow.create(invalid,body),()=>h.workflow.reclassify(invalid,1,{...body,version:2,note:'ghost'}),()=>h.workflow.importMaintenance(invalid),()=>h.workflow.updatePolicies(invalid,{note:'ghost',policies})]) {
      await assert.rejects(run,{status:400});
      assert.ok(!h.calls.some(([s])=>/^(INSERT|UPDATE)/.test(s)));
    }
  }
});

test('deleted actor cannot append ghost comment history',async()=>{
  const h=harness({missingUser:8});
  await assert.rejects(()=>h.base.action(actor,1,{action:'comment',version:2,note:'checked'}),{status:400});
  assert.ok(!h.calls.some(([s])=>/^(INSERT|UPDATE)/.test(s)));
  assert.ok(h.calls.some(([s])=>s==='rollback'));
});
