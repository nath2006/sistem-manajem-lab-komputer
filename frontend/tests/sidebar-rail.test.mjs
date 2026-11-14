import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderUI} from './helpers/renderUI.js';
test('desktop collapse keeps an accessible 80px navigation rail and matching content offset', async()=>{
 const text=await readFile(new URL('../src/Layouts/Dashboard.jsx',import.meta.url),'utf8');
 assert.match(text,/lg:w-20/); assert.match(text,/lg:ml-20/);
 assert.match(text,/inert=\{!isDesktop && !sidebarExpanded\}/);
 assert.match(text,/<Tooltip content=\{item.name\}/);
});
test('each role uses contextual unique menu icons',async()=>{
 const text=await readFile(new URL('../src/Layouts/Dashboard.jsx',import.meta.url),'utf8');
 for(const name of ['menuAdmin','menuGuru','menuTeknisi','menuKepalaLab','menuKoordinatorLab']){
 const body=text.split(`const ${name} = [`)[1].split('];')[0];
 const icons=[...body.matchAll(/ic: <(\w+)/g)].map(m=>m[1]);
 assert.equal(new Set(icons).size,icons.length,name);
 }
});
test('tooltip preserves its single native accessible trigger on server render',async()=>{
 const html=await renderUI(`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import Tooltip from './src/Components/Tooltip.jsx';module.exports=renderToStaticMarkup(<Tooltip content="Repair"><button aria-label="Repair">Icon</button></Tooltip>);`);
 assert.match(html,/<button aria-label="Repair"/);assert.ok(!html.includes('<span'));
});
