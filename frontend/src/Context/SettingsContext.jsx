import { minutes } from '../../../shared/schedule.mjs';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api from '../utils/api';
import { resolveLogoUrl } from '../utils/resolveLogoUrl';

const defaults = Object.freeze({ school_name: 'Sekolah Anda', logo_url: '', primary_color: '#800000', schedule_start: '07:00', schedule_end: '17:00', lesson_duration: 60 });
const validSchedule = data => !!data
  && Number.isFinite(minutes(data.schedule_start))
  && Number.isFinite(minutes(data.schedule_end))
  && minutes(data.schedule_end) > minutes(data.schedule_start)
  && Number.isInteger(Number(data.lesson_duration))
  && Number(data.lesson_duration) > 0;
// Branding can still render on invalid responses; never publish an unsafe grid step.
const withSafeSchedule = data => validSchedule(data) ? { ...defaults, ...data } : {
  ...defaults, ...data,
  schedule_start: defaults.schedule_start,
  schedule_end: defaults.schedule_end,
  lesson_duration: defaults.lesson_duration,
};
const noop = async () => {};
const SettingsContext = createContext({ settings: defaults, logoSrc: '', loading: false, loaded: false, error: '', updateSettings: noop, reloadSettings: noop, refreshSettings: noop });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const revision = useRef(0);
  const updateSettings = useCallback(data => {
    revision.current++;
    setSettings(withSafeSchedule(data));
    setLoaded(validSchedule(data));
    setError(validSchedule(data) ? '' : 'Konfigurasi jadwal tidak valid.');
    setLoading(false);
  }, []);
  const reloadSettings = useCallback(async () => {
    const current = ++revision.current;
    setLoading(true); setLoaded(false); setError('');
    try {
      const response = await api.get('/settings/public', { _skipAuth: true, _skipRefresh: true });
      if (current === revision.current) {
        const data = response.data.data;
        setSettings(withSafeSchedule(data));
        setLoaded(validSchedule(data));
        if (!validSchedule(data)) setError('Konfigurasi jadwal tidak valid.');
      }
    } catch {
      if (current === revision.current) setError('Pengaturan sekolah belum dapat dimuat. Menggunakan pengaturan bawaan.');
    } finally { if (current === revision.current) setLoading(false); }
  }, []);
  const invalidateRequest = useCallback(() => { revision.current++; }, []);
  useEffect(() => { reloadSettings(); return invalidateRequest; }, [reloadSettings, invalidateRequest]);
  useEffect(() => {
    const color = /^#[a-f\d]{6}$/i.test(settings.primary_color) ? settings.primary_color : defaults.primary_color;
    const root = document.documentElement;
    const previous = root.style.getPropertyValue('--color-maroon');
    root.style.setProperty('--color-maroon', color);
    return () => { if (previous) root.style.setProperty('--color-maroon', previous); else root.style.removeProperty('--color-maroon'); };
  }, [settings.primary_color]);
  const value = useMemo(() => ({ settings, logoSrc: resolveLogoUrl(settings.logo_url, import.meta.env?.VITE_ASSET_BASE_URL, import.meta.env?.VITE_BASE_URL), loading, loaded, error, updateSettings, reloadSettings, refreshSettings: reloadSettings }), [settings, loading, loaded, error, updateSettings, reloadSettings]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

// Required public context API intentionally colocates provider and hook.
// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  return useContext(SettingsContext);
}
