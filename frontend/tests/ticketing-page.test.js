import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import process from 'node:process';
const require = createRequire(import.meta.url);
test('ticketing renders themed service management, honest SLA and accessible loading state', async () => {
  assert.ok(existsSync('src/features/Ticketing/Ticketing.jsx'), 'ticketing page is missing');
  const result = await build({stdin:{contents:`import React from 'react'; import {MemoryRouter} from 'react-router-dom'; import {renderToStaticMarkup} from 'react-dom/server'; import Page, { SourceNotice } from './src/features/Ticketing/Ticketing.jsx'; import {AuthContext} from './src/Context/AuthContext'; export default renderToStaticMarkup(<MemoryRouter><AuthContext.Provider value={{state:{role:'Admin',userId:1}}}><Page/><SourceNotice sourceId={4} role="Admin"/></AuthContext.Provider></MemoryRouter>); export const restricted = renderToStaticMarkup(<MemoryRouter><SourceNotice sourceId={4} role="Guru"/></MemoryRouter>);`,resolveDir:process.cwd(),loader:'jsx'},bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',external:['react','react-dom/server'],plugins:[{name:'boundaries',setup(b){b.onResolve({filter:/Layouts\/Dashboard$/},()=>({path:'layout',namespace:'test'}));b.onResolve({filter:/Context\/AuthContext$/},()=>({path:'auth',namespace:'test'}));b.onResolve({filter:/utils\/api$/},()=>({path:'api',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},({path})=>({contents:path==='layout'?'export default function Layout({children}){return children}':path==='auth'?"import {createContext} from 'react';export const AuthContext=createContext();":"export default {};",resolveDir:process.cwd()}));}}]});
  const module = {exports:{}}; new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports);
  const html = module.exports.default;
  assert.match(html, /Catat perbaikan berhasil/);
  assert.match(html, /href="\/kelola-perbaikan"/);
  assert.ok(!module.exports.restricted.includes('href='));
  for (const text of ['Tiket Layanan','incident','service request','Memuat tiket','24×7','Impor Temuan Pemeriksaan','Kebijakan SLA']) assert.ok(html.includes(text),text);
  assert.ok(html.includes('bg-maroon')); assert.ok(html.includes('role="status"')); assert.ok(!html.includes('ISO certified'));
});
