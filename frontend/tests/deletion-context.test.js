import test from 'node:test';
import assert from 'node:assert/strict';
import {filterTableData} from '../src/utils/tableData.js';
import {renderUI} from './helpers/renderUI.js';
import {deletionRelation} from '../src/utils/deletionContext.js';

test('related-data view filters actual foreign keys rather than unrelated matching IDs/text',()=>{
  const rows=[{perangkat_id:7,lab_id:1,name:'Lab 7'},{perangkat_id:8,lab_id:7,name:'PC lain'},{perangkat_id:9,lab_id:7,name:'PC target'}];
  assert.deepEqual(filterTableData(rows,'',{fields:['lab_id'],id:7}),[rows[1],rows[2]]);
  assert.deepEqual(filterTableData(rows,'target',{fields:['lab_id'],id:7}),[rows[2]]);
  assert.equal(rows.length,3);
});
test('related repair view includes either retained snapshot or linked device reference',()=>{
  const rows=[{id:1,perangkat_id_snapshot:7},{id:2,perangkat_id:7},{id:7,perangkat_id:6}];
  assert.deepEqual(filterTableData(rows,'',{fields:['perangkat_id_snapshot','perangkat_id'],id:7}),[rows[0],rows[1]]);
});

test('related navigation scopes the actual shared table and explains how to clear it',async()=>{
  const html=await renderUI(`import React from 'react';import{renderToStaticMarkup}from'react-dom/server';import{MemoryRouter}from'react-router-dom';import Table from './src/Layouts/Table';const data=[{id:1,lab_id:7,name:'PC terkait'},{id:2,lab_id:8,name:'PC tidak terkait'}];module.exports=renderToStaticMarkup(<MemoryRouter initialEntries={[{pathname:'/kelola-perangkat',state:{deletionContext:{resource:'laboratorium',id:7,label:'Lab uji'}}}]}><Table data={data} headers={[{judul:'Nama'}]} renderRow={row=><tr key={row.id}><td>{row.name}</td></tr>}/></MemoryRouter>);`);
  assert.ok(html.includes('PC terkait'));
  assert.ok(!html.includes('PC tidak terkait'));
  assert.ok(html.includes('Lab uji') && html.includes('Tampilkan semua'));
});

test('announcement creator context follows the actual nested API creator shape',()=>{
  const rows=[{id:1,created_by:{user_id:7,nama_lengkap:'Pemilik'}},{id:7,created_by:{user_id:8}}];
  const relation=deletionRelation('/kelola-pengumuman',{resource:'user',id:7,label:'Pemilik'});
  assert.deepEqual(filterTableData(rows,'',relation),[rows[0]]);
});
