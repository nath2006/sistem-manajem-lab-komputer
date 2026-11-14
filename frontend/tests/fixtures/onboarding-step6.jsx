/* eslint-disable react-refresh/only-export-components -- standalone synthetic QA entry */
import React, { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '../../src/Context/AuthContext';
import { SettingsProvider } from '../../src/Context/SettingsContext';
import DashboardLayout from '../../src/Layouts/DashboardLayout';
import api from '../../src/utils/api';
import '../../src/index.css';

const params = new URLSearchParams(location.search);
window.fixtureErrors = [];
window.addEventListener('error', event => window.fixtureErrors.push(event.message));
window.addEventListener('unhandledrejection', event => window.fixtureErrors.push(String(event.reason)));
window.fixtureBoot = crypto.randomUUID();
// Real shell, providers and installed Driver.js; synthetic auth/settings/chart target.
// No login, backend, database, uploaded logo or production dashboard data.
api.defaults.adapter = async config => {
  if (!config.url.includes('/settings/public')) throw new Error('Unexpected fixture API request: ' + config.url);
  return { status: 200, statusText: 'OK', headers: {}, config, data: { data: {
    school_name: 'Sekolah <img src=x onerror=alert(1)> Uji',
    primary_color: params.get('color') || '#2563eb', logo_url: '',
    schedule_start: '07:00', schedule_end: '17:00', lesson_duration: 60,
  } } };
};
function Fixture() {
  const [state, setState] = useState({ isAuthenticated: true, isLoading: false, userId: 'step6-fixture', role: params.get('role') || 'Guru', fullName: 'Pengguna Uji' });
  const [mounted, setMounted] = useState(true);
  const [charts, setCharts] = useState(params.get('charts') !== 'absent');
  window.fixtureAccount = patch => setState(value => ({ ...value, ...patch }));
  window.fixtureUnmount = () => setMounted(false);
  window.fixtureCharts = setCharts;
  return <AuthContext.Provider value={{ state, dispatch: () => {} }}>
    <SettingsProvider><MemoryRouter><Routes><Route element={mounted ? <DashboardLayout /> : <p>Unmounted</p>}>
      <Route path="*" element={<section style={{ minHeight: 1600 }}>
        <p>Data sintetis — bukan UAT login produksi.</p>
        {charts && <section data-tour="dashboard-charts" aria-label="Target grafik sintetis" className="my-6 rounded-xl border border-gray-200 bg-white p-5">
          <h2>Grafik contoh sintetis</h2><p>Target kontrak saja; data dashboard tidak diuji di fixture ini.</p>
        </section>}
        <button type="button" className="min-h-11 p-3">Kontrol konten</button>
      </section>} />
    </Route></Routes></MemoryRouter></SettingsProvider>
  </AuthContext.Provider>;
}
createRoot(document.getElementById('root')).render(<StrictMode><Fixture /></StrictMode>);
