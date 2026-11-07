/* eslint-disable react-refresh/only-export-components -- standalone QA entry, not a component module */
import React, { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '../../src/Context/AuthContext';
import { SettingsProvider } from '../../src/Context/SettingsContext';
import DashboardLayout from '../../src/Layouts/DashboardLayout';
import api from '../../src/utils/api';
import '../../src/index.css';

const params = new URLSearchParams(location.search);
const role = params.get('role') || 'Guru';
const color = params.get('color') || '#2563eb';
window.fixtureErrors = [];
window.addEventListener('error', event => window.fixtureErrors.push(event.message));
window.addEventListener('unhandledrejection', event => window.fixtureErrors.push(String(event.reason)));
window.fixtureBoot = crypto.randomUUID();
// Actual providers/shell/tour; no backend requests or database connection.
api.defaults.adapter = async config => {
  if (!config.url.includes('/settings/public')) throw new Error('Unexpected fixture API request: ' + config.url);
  return { status: 200, statusText: 'OK', headers: {}, config, data: { data: {
    school_name: params.get('school') || 'Sekolah <img src=x onerror=alert(1)> Uji', primary_color: color,
    logo_url: '', schedule_start: '07:00', schedule_end: '17:00', lesson_duration: 60,
  } } };
};
function Fixture() {
  const [state, setState] = useState({ isAuthenticated: true, isLoading: false, userId: 'fixture-7', role, fullName: 'Pengguna Uji' });
  const [mounted, setMounted] = useState(true);
  window.fixtureAccount = patch => setState(value => ({ ...value, ...patch }));
  window.fixtureUnmount = () => setMounted(false);
  return <AuthContext.Provider value={{ state, dispatch: () => {} }}>
    <SettingsProvider><MemoryRouter><Routes><Route element={mounted ? <DashboardLayout /> : <p>Unmounted</p>}>
      <Route path="*" element={<section style={{ minHeight: 1600 }}><p>Data fixture saja — bukan UAT terautentikasi.</p><button type="button" className="min-h-11 p-3">Kontrol konten</button></section>} />
    </Route></Routes></MemoryRouter></SettingsProvider>
  </AuthContext.Provider>;
}
createRoot(document.getElementById('root')).render(<StrictMode><Fixture /></StrictMode>);
