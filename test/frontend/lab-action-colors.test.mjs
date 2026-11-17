import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../../', import.meta.url));

async function mount(role) {
  const calls = [];
  const result = await build({
    stdin: { contents: `import React from 'react';import {MemoryRouter} from 'react-router-dom';import Lab from './frontend/src/features/KelolaLaboratorium/Laboratorium.jsx';export default function Fixture(){return <MemoryRouter><Lab/></MemoryRouter>}`, resolveDir: root, loader: 'jsx' },
    bundle: true, platform: 'node', format: 'cjs', write: false,
    external: ['react', 'react-dom', 'react/jsx-runtime', 'react-router-dom'],
    define: { 'import.meta.env': '{}' },
    plugins: [{ name: 'lab-boundaries', setup(b) {
      b.onResolve({ filter: /(?:Layouts\/Dashboard|Context\/AuthContext|utils\/api|utils\/useTitle|useDeletionDialog|DataLab\/(?:Detail|Edit)Laboratorium)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, ({path}) => ({ loader: 'jsx', contents:
        path.endsWith('AuthContext') ? `import React from 'react';export const AuthContext=React.createContext({state:{role:${JSON.stringify(role)}}});` :
        path.endsWith('/api') ? `export async function get(path){globalThis.__labCalls.push(['get',path]);return {data:[{lab_id:37,nama_lab:'Lab Sintetis',status:'Tersedia'}]}};export function deleteData(path){globalThis.__labCalls.push(['delete',path]);}` :
        path.endsWith('useDeletionDialog') ? `export default options=>({requestDeletion:id=>{globalThis.__labCalls.push(['deletion',options.resource,id]);return options.onDelete(id)},dialog:null});` :
        path.endsWith('useTitle') ? 'export default ()=>{};' :
        path.includes('DataLab/') ? `import React from 'react';export default ({id,onClose})=><section data-modal="${path.includes('Detail') ? 'detail' : 'edit'}" data-id={id}><button onClick={onClose}>Tutup</button></section>;` :
        `import React from 'react';export default ({children})=><main>{children}</main>;`
      }));
    }}]
  });
  const module = { exports: {} };
  new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports);
  globalThis.__labCalls = calls;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const React = require('react');
  const {create,act} = require('react-test-renderer');
  let renderer;
  await act(async()=>{renderer=create(React.createElement(module.exports.default));});
  return {renderer,act,calls,async close(){await act(async()=>renderer.unmount());delete globalThis.__labCalls;}};
}

for (const role of ['Admin','Koordinator Lab','Guru']) {
  test(`mounted Lab real Table keeps semantic row actions and permissions for ${role}`, async()=>{
    const h=await mount(role);
    try {
      assert.deepEqual(h.calls,[['get','/lab']]);
      assert.equal(h.renderer.root.findAllByType('table').length,1);
      const actions=h.renderer.root.findAll(node=>node.type==='button' && /laboratorium Lab Sintetis$/.test(node.props['aria-label'] || ''));
      assert.equal(actions.length,role==='Guru'?1:3);
      for (const [index,action] of actions.entries()) {
        const color=['blue','amber','red'][index];
        assert.match(action.props.className,new RegExp(`text-${color}-600`));
        assert.match(action.props.className,new RegExp(`hover:bg-${color}-50`));
        assert.match(action.props.className,new RegExp(`focus-visible:ring-${color}-500`));
        assert.match(action.props.className,/min-h-11 min-w-11/);
        assert.equal(action.props.type,'button');
        assert.equal(action.props.title,['Lihat Detail','Edit Data','Hapus Data'][index]);
        const svg=action.findByType('svg');
        assert.equal(Number(svg.props.width),[18,17,17][index]);
      }
      await h.act(async()=>actions[0].props.onClick({}));
      assert.equal(h.renderer.root.findByProps({'data-modal':'detail'}).props['data-id'],37);
      await h.act(async()=>h.renderer.root.findAllByType('button').find(n=>n.props.children==='Tutup').props.onClick());
      if(role!=='Guru') {
        await h.act(async()=>actions[1].props.onClick({}));
        assert.equal(h.renderer.root.findByProps({'data-modal':'edit'}).props['data-id'],37);
        await h.act(async()=>actions[2].props.onClick({}));
        assert.deepEqual(h.calls.slice(1),[['deletion','laboratorium',37],['delete','/lab/delete/37']]);
      }
    } finally { await h.close(); }
  });
}
