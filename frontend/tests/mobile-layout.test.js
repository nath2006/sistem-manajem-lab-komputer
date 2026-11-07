import test from 'node:test';
import assert from 'node:assert/strict';
import { renderUI } from './helpers/renderUI.js';

const imports = `import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {MemoryRouter} from 'react-router-dom';`;
test('shared table renders available records immediately and labels mobile cells', async () => {
  const html = await renderUI(`${imports}
    import Table from './src/Layouts/Table.jsx';
    module.exports = renderToStaticMarkup(<MemoryRouter><Table title="Perangkat" headers={[{judul:'Nama'},{judul:'Aksi'}]} data={[{id:1,name:'PC-01'}]} renderRow={row=><tr key={row.id}><td>{row.name}</td><td><button type="button">Detail</button></td></tr>}/></MemoryRouter>);`);
  assert.match(html, /PC-01/);
  assert.match(html, /data-label="Nama"/);
  assert.match(html, /aria-label="Cari data Perangkat"/);
  assert.match(html, /mobile-data-table/);
});

test('mobile navigation is closed initially and content has a constrained main region', async () => {
  const html = await renderUI(`${imports}
    import Dashboard from './src/Layouts/Dashboard.jsx'; import {AuthContext} from './src/Context/AuthContext.jsx';
    module.exports=renderToStaticMarkup(<MemoryRouter><AuthContext.Provider value={{state:{role:'Admin',fullName:'Administrator sekolah dengan nama panjang'},dispatch:()=>{}}}><Dashboard title="Dashboard"><p>Konten utama</p></Dashboard></AuthContext.Provider></MemoryRouter>);`);
  assert.match(html, /aria-controls="logo-sidebar"[^>]*aria-expanded="false"/);
  assert.match(html, /<main[^>]*id="dashboard-content"/);
  assert.match(html, /min-w-0/);
  assert.match(html, /inert=""/);
});

test('shared modal has accessible title and immediate close control while form actions fit mobile', async () => {
  const html = await renderUI(`${imports}
    import Modal from './src/Components/DetailModal/ModalContainer.jsx';import Form from './src/Components/FormContainer/index.jsx';
    module.exports=renderToStaticMarkup(<Modal title="Detail perangkat" onClose={()=>{}}><Form title="Ubah perangkat" onSubmit={()=>{}} onCancel={()=>{}}><label>Nama<input defaultValue="PC-01"/></label></Form></Modal>);`);
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /aria-labelledby=/);
  assert.match(html, /aria-label="Tutup dialog"/);
  assert.match(html, /p-4 sm:p-6/);
  assert.match(html, /min-h-11/);
});

test('shared modal respects an existing disabled cancel action while saving', async () => {
  const html=await renderUI(`${imports}
    import Modal from './src/Components/DetailModal/ModalContainer.jsx';
    module.exports=renderToStaticMarkup(<Modal title="Menyimpan" onClose={()=>{}} primaryButton={<button disabled>Simpan</button>} secondaryButton={<button disabled>Batal</button>}>Proses simpan</Modal>);`);
  const close=html.match(/<button\b[^>]*aria-label="Tutup dialog"[^>]*>/)?.[0] || '';
  assert.ok(/disabled=""/.test(close),'Header dismissal must respect the caller disabled cancel state');
});
