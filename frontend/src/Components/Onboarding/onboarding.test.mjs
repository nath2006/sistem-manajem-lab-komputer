import test from 'node:test';
import assert from 'node:assert/strict';
import { renderUI } from '../../../tests/helpers/renderUI.js';

test('completion is isolated by stable account, role and version; denied storage is safe', async () => {
  const api = await renderUI(`import * as api from './src/utils/onboarding.js'; module.exports=api;`);
  const memory = new Map();
  const storage = {getItem:key=>memory.get(key), setItem:(key,value)=>memory.set(key,value)};
  const auth = {isAuthenticated:true,isLoading:false,userId:7,role:'Guru'};
  const key=api.getOnboardingKey(auth);
  assert.ok(key);
  assert.equal(api.getOnboardingKey({...auth,isLoading:true}),null);
  for(const userId of [null,undefined,'']) assert.equal(api.getOnboardingKey({...auth,userId}),null);
  assert.equal(api.getOnboardingKey({...auth,role:'Unknown'}),null);
  assert.equal(api.getOnboardingKey({...auth,isAuthenticated:false}),null);
  assert.equal(api.isOnboardingComplete(key,storage),false);
  assert.equal(api.completeOnboarding(key,'next',storage),false);
  assert.equal(memory.size,0);
  assert.equal(api.completeOnboarding(key,'skip',storage),true);
  assert.equal(api.isOnboardingComplete(key,storage),true);
  assert.equal(api.isOnboardingComplete(api.getOnboardingKey({...auth,userId:8}),storage),false);
  assert.equal(api.isOnboardingComplete(api.getOnboardingKey({...auth,role:'Admin'}),storage),false);
  assert.equal(api.isOnboardingComplete(key+'-new-version',storage),false);
  assert.equal(api.completeOnboarding(key,'done',storage),true);
  assert.equal(api.isOnboardingComplete(key,{getItem(){throw Error('denied');}}),false);
  assert.equal(api.completeOnboarding(key,'done',{setItem(){throw Error('denied');}}),false);
  assert.deepEqual([...memory.values()],['done']);
});
