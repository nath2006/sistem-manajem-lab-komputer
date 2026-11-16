import test from 'node:test';
import assert from 'node:assert/strict';
import * as helpers from '../src/features/Ticketing/ticketingHelpers.js';

import { build } from 'esbuild';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

test('page blocks creation on incomplete SLA, guides Admin, and recovers after policy refresh', async () => {
  const result = await build({ stdin: { contents: `import React from 'react'; import {MemoryRouter} from 'react-router-dom'; import Page from './src/features/Ticketing/Ticketing.jsx'; import {AuthContext} from './src/Context/AuthContext'; export const render = () => <MemoryRouter><AuthContext.Provider value={{state:{role:'Admin',userId:1}}}><Page/></AuthContext.Provider></MemoryRouter>;`, resolveDir: process.cwd(), loader: 'jsx' }, bundle: true, platform: 'node', format: 'cjs', write: false, jsx: 'automatic', external: ['react', 'react-dom', 'react-dom/server', 'react-test-renderer'], plugins: [{ name:'boundaries',setup(b) {
    b.onResolve({filter:/Layouts\/Dashboard$/},()=>({path:'layout',namespace:'test'}));
    b.onResolve({filter:/Context\/AuthContext$/},()=>({path:'auth',namespace:'test'}));
    b.onResolve({filter:/utils\/api$/},()=>({path:'api',namespace:'test'}));
    b.onLoad({filter:/.*/,namespace:'test'},({path})=>({contents:path==='layout'?'export default function Layout({children}){return children}':path==='auth'?"import {createContext} from 'react';export const AuthContext=createContext();":"export default {get: (...args) => globalThis.__slaApi(...args)};",resolveDir:process.cwd()}));
  }}] });
  const module = {exports:{}};
  new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports);
  const {act, create} = require('react-test-renderer');
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let currentPolicies = [];
  globalThis.__slaApi = async path => ({data: path === '/tickets/options' ? {data:{ policies:currentPolicies, technicians:[], devices:[] }} : {data:[],summary:{},pagination:{page:1,pages:1,total:0}}});
  let root;
  try {
    await act(async()=>{ root=create(module.exports.render()); });
    const createButton = () => root.root.findAllByType('button').find(node => node.children.includes('Buat Tiket'));
    assert.equal(createButton().props.disabled, true);
    assert.match(JSON.stringify(root.toJSON()), /SLA belum siap/);
    assert.match(JSON.stringify(root.toJSON()), /Admin/);
    currentPolicies = policies;
    const reload = root.root.findAllByType('button').find(node => node.children.includes('Muat ulang SLA'));
    assert.ok(reload, 'readiness must offer an options refresh');
    await act(async()=>{reload.props.onClick();});
    assert.equal(createButton().props.disabled, false);
    assert.doesNotMatch(JSON.stringify(root.toJSON()), /SLA belum siap/);
  } finally { if(root) await act(async()=>root.unmount()); delete globalThis.__slaApi; }
});

const policies = [
  { priority: 'P1', response_minutes: 15, resolution_minutes: 240 },
  { priority: 'P2', response_minutes: 60, resolution_minutes: 480 },
  { priority: 'P3', response_minutes: 240, resolution_minutes: 1440 },
  { priority: 'P4', response_minutes: 480, resolution_minutes: 4320 },
];
test('ticket readiness explains missing or invalid SLA and guides Admin without inventing deadlines', () => {
  assert.equal(typeof helpers.slaReadinessMessage, 'function');
  assert.equal(helpers.slaReadinessMessage(policies), '');
  assert.match(helpers.slaReadinessMessage([]), /SLA belum siap/);
  assert.match(helpers.slaReadinessMessage([]), /Admin/);
  assert.match(helpers.slaReadinessMessage([]), /Kebijakan SLA/);
  assert.match(helpers.slaReadinessMessage(policies.slice(1)), /P1–P4/);
  for (const change of [{ response_minutes: 0 }, { response_minutes: 300, resolution_minutes: 1 }, { resolution_minutes: Number.MAX_SAFE_INTEGER }, { response_minutes: '15' }]) {
    assert.match(helpers.slaReadinessMessage(policies.map((row, i) => i === 0 ? {...row,...change} : row)), /SLA belum siap/);
  }
  assert.deepEqual(policies[0], { priority: 'P1', response_minutes: 15, resolution_minutes: 240 });
});
