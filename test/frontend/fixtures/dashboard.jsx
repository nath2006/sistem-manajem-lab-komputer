import React, { useEffect } from 'react';
import { Chart } from 'chart.js';
window.dashboardChartInstances = () => Object.values(Chart.instances);
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Cookies from 'js-cookie';
import { AuthContext } from '../../../frontend/src/Context/AuthContext';
import { SettingsProvider, useSettings } from '../../../frontend/src/Context/SettingsContext';
import Admin from '../../../frontend/src/pages/admin/AdminDashboard';
import Guru from '../../../frontend/src/pages/Guru/GuruDashboard';
import Kepala from '../../../frontend/src/pages/KepalaLab/KepalaLabDashboard';
import Koordinator from '../../../frontend/src/pages/KoordinatorLab/KoordinatorLabDashboard';
import Teknisi from '../../../frontend/src/pages/Teknisi/TeknisiDashboard';
import '../../../frontend/src/index.css';
const session=await (await fetch('/__dashboard_session')).json();
const role=new URLSearchParams(location.search).get('role')||'Admin';
const pages={'Admin':Admin,'Guru':Guru,'Kepala Lab':Kepala,'Koordinator Lab':Koordinator,'Teknisi':Teknisi};
const keys={'Admin':'admin','Guru':'teacher','Kepala Lab':'head','Koordinator Lab':'manager','Teknisi':'tech'};
Cookies.set('auth_token',session.tokens[role]);
const state={role,userId:session.users[keys[role]],token:session.tokens[role],isAuthenticated:true,isLoading:false,fullName:'Synthetic '+role};
function Review(){const {settings,updateSettings}=useSettings();useEffect(()=>{window.setDashboardTheme=color=>updateSettings({...settings,primary_color:color});},[settings,updateSettings]);const Page=pages[role];return <Page/>;}
let root;
window.mountDashboardFixture = () => {
  root = createRoot(document.getElementById('root'));
  root.render(<React.StrictMode><MemoryRouter><AuthContext.Provider value={{state,dispatch:()=>{}}}><SettingsProvider><Review/></SettingsProvider></AuthContext.Provider></MemoryRouter></React.StrictMode>);
};
window.unmountDashboardFixture = () => root.unmount();
window.mountDashboardFixture();
