import test from 'node:test';
import assert from 'node:assert/strict';
import {renderUI} from './helpers/renderUI.js';

test('uploaded school logo resolves against API origin without rewriting canonical settings',async()=>{
  const file='/uploads/branding/'+ 'a'.repeat(32)+'.png';
  const html=await renderUI(`import React from 'react';import{renderToStaticMarkup}from'react-dom/server';import{MemoryRouter}from'react-router-dom';import{SettingsProvider,useSettings}from'./src/Context/SettingsContext';import{AuthContext}from'./src/Context/AuthContext';import Dashboard from './src/Layouts/Dashboard';const original=React.useState;let slot=0;const settings={school_name:'Uji logo',logo_url:${JSON.stringify(file)},primary_color:'#245799',schedule_start:'07:00',schedule_end:'17:00',lesson_duration:60};React.useState=initial=>original(slot++===0?settings:initial);function Raw(){return <span>{useSettings().settings.logo_url}</span>}try{module.exports=renderToStaticMarkup(<MemoryRouter><SettingsProvider><AuthContext.Provider value={{state:{role:'Admin'},dispatch:()=>{}}}><Dashboard><Raw/></Dashboard></AuthContext.Provider></SettingsProvider></MemoryRouter>)}finally{React.useState=original}`);
  assert.ok(html.includes('src="http://example.invalid'+file+'"'));
  assert.ok(html.includes('<span>'+file+'</span>'));
});
