// Synthetic browser contract fixture with actual shell and installed Driver
// Uses in memory server state only and does not contact the backend
import React, { StrictMode } from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter, Routes, Route} from 'react-router-dom';
import {AuthContext} from '../../../frontend/src/Context/AuthContext';
import {SettingsProvider} from '../../../frontend/src/Context/SettingsContext';
import DashboardLayout from '../../../frontend/src/Layouts/DashboardLayout';
import api from '../../../frontend/src/utils/api';
const role=new URLSearchParams(location.search).get('role')||'Guru';
window.qa={get:0,claim:0,errors:[]};
window.addEventListener('error',event=>window.qa.errors.push(event.message));
window.addEventListener('unhandledrejection',event=>window.qa.errors.push(String(event.reason)));
api.defaults.adapter=async config=>{
 let data;
 if(config.url.includes('/settings/public'))data={data:{school_name:'Sekolah Uji',primary_color:'#800000'}};
 else if(config.url==='/onboarding'){window.qa.get++;data={data:{seen:sessionStorage.getItem('fixtureSeen')==='yes'}};}
 else if(config.url==='/onboarding/claim'){window.qa.claim++;const should_show=sessionStorage.getItem('fixtureSeen')!=='yes';sessionStorage.setItem('fixtureSeen','yes');data={data:{should_show}};}
 else throw new Error('Unexpected fixture request');
 return {status:200,statusText:'OK',headers:{},config,data};
};
createRoot(document.getElementById('root')).render(<StrictMode><AuthContext.Provider value={{state:{isAuthenticated:true,isLoading:false,userId:'browser-fixture',role,token:'synthetic',fullName:'Pengguna Uji'}}}><SettingsProvider><MemoryRouter><Routes><Route element={<DashboardLayout/>}><Route path="*" element={<section style={{minHeight:1500}}>Konten sintetis<div data-tour="dashboard-charts">Grafik sintetis</div></section>}/></Route></Routes></MemoryRouter></SettingsProvider></AuthContext.Provider></StrictMode>);
