import test from 'node:test';
import assert from 'node:assert/strict';
import {renderUI} from './helpers/renderUI.js';
test('activity view exposes accessible server filters and five native columns',async()=>{
 const result=await renderUI(`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import * as page from './src/features/LogAktivitas/LogAktivitas.jsx';module.exports = typeof page.ActivityLogView === 'function' ? renderToStaticMarkup(<page.ActivityLogView filters={{actor:'',category:'',date:''}} onFilter={()=>{}} onReset={()=>{}} result={{data:[{id:1,username:'<script>evil</script>',role:'Admin',action:'write',method:'DELETE',path:'/api/komputer/:id',status_code:200,duration_ms:3,created_at:'2026-11-11T00:00:00Z'}],pagination:{total:41,total_pages:3}}} page={1} onPage={()=>{}} onRefresh={()=>{}} />) : '';`);
 assert.match(result,/min-width:900px/);assert.match(result,/Siapa/);assert.match(result,/Kategori/);assert.match(result,/Tanggal/);assert.equal((result.match(/<th scope="col"/g)||[]).length,5);assert.match(result,/41 catatan/);assert.match(result,/&lt;script&gt;/);assert.match(result,/200/);assert.match(result,/DELETE/);
});
