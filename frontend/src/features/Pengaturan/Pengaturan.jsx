import LoadingSkeleton from '../../Components/Loading/Skeleton';
import { useContext, useEffect, useRef, useState } from 'react';
import Dashboard from '../../Layouts/Dashboard';
import FormContainer from '../../Components/FormContainer';
import { AuthContext } from '../../Context/AuthContext';
import { useSettings } from '../../Context/SettingsContext';
import api from '../../utils/api';
import useObjectUrl from '../../utils/useObjectUrl';
import { buildSettingsRequest, resolveLogoUrl, validateLogoSelection } from './settingsLogo.mjs';

const fieldClass = 'mt-1 block w-full rounded-md border border-gray-300 p-2 text-gray-900';
export default function Pengaturan() {
  const { state } = useContext(AuthContext);
  const { settings, updateSettings } = useSettings();
  const [form, setForm] = useState(settings);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(settings);
  const [logoFile, setLogoFile] = useState(null);
  const fileInput = useRef(null);
  const objectUrl = useObjectUrl(logoFile);
  const previewUrl = objectUrl || resolveLogoUrl(form.logo_url, import.meta.env?.VITE_ASSET_BASE_URL, import.meta.env?.VITE_BASE_URL);
  const clearFile = () => { setLogoFile(null); if (fileInput.current) fileInput.current.value = ''; };
  const selectFile = event => {
    const file = event.target.files?.[0] || null;
    const invalid = validateLogoSelection(file);
    if (invalid) { clearFile(); setError(invalid); return; }
    setLogoFile(file); setError(''); setMessage('');
  };
  const admin = state?.role === 'Admin';
  useEffect(() => {
    if (!admin) return;
    let active = true;
    setLoading(true); setLoaded(false); setError('');
    api.get('/settings').then(response => {
      if (active) { setForm(response.data.data); setSaved(response.data.data); setLoaded(true); }
    }).catch(() => { if (active) setError('Gagal memuat pengaturan. Muat ulang halaman sebelum menyimpan.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [admin]);
  const change = event => {
    const { name, value } = event.target;
    if (name === 'logo_url') clearFile();
    setForm(previous => ({ ...previous, [name]: name === 'lesson_duration' ? (value === '' ? '' : Number(value)) : value }));
    setMessage('');
  };
  const submit = async event => {
    event.preventDefault();
    if (loading || saving || !loaded) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const request = buildSettingsRequest(form, logoFile);
      const response = await api.put('/settings', request.data, request.config);
      clearFile();
      updateSettings(response.data.data); setForm(response.data.data); setSaved(response.data.data);
      setMessage('Pengaturan berhasil disimpan.');
    } catch (failure) { setError(failure.response?.data?.message || 'Gagal menyimpan pengaturan.'); }
    finally { setSaving(false); }
  };
  return <Dashboard title="Pengaturan Sekolah">
    {!admin ? <p role="alert">Hanya Admin yang dapat mengakses pengaturan.</p> : <div className="w-full space-y-4">
      {message && <p role="status" className="rounded-md bg-green-100 p-3 text-green-800">{message}</p>}
      {loading && !loaded && <LoadingSkeleton variant="form" label="Memuat pengaturan..." />}
      <FormContainer title="Pengaturan Sekolah" description="Identitas sekolah, warna aplikasi, dan jam pelajaran." error={error} isSubmitting={saving || loading || !loaded} onSubmit={submit} onCancel={() => { setForm(saved); clearFile(); setError(''); setMessage(''); }}>
        <fieldset disabled={saving || loading || !loaded} className="space-y-5">
          <label className="block">Nama sekolah<input className={fieldClass} name="school_name" value={form.school_name} maxLength={150} required onChange={change} /></label>
          <label className="block">URL logo<input className={fieldClass} type="text" inputMode="url" name="logo_url" value={form.logo_url} maxLength={2048} placeholder="https://sekolah.sch.id/logo.png" onChange={change} /><span className="text-sm">Kosongkan untuk logo bawaan. Gunakan URL HTTP(S) publik PNG, JPG, GIF, atau WebP tanpa parameter. SVG dan data URL tidak diizinkan.</span></label>
          <label className="block">Unggah logo<input ref={fileInput} className={fieldClass} type="file" name="logo" accept="image/png,image/jpeg,image/webp,image/gif" onChange={selectFile} /><span className="text-sm">PNG, JPG, WebP, atau GIF maksimal 2 MB. File hanya diunggah saat Simpan; menggantikan URL logo.</span></label>
          {logoFile && <button type="button" onClick={clearFile} className="text-maroon underline">Batalkan pilihan file</button>}
          {previewUrl && <img src={previewUrl} alt="Pratinjau logo sekolah" className="h-24 w-24 object-contain" />}
          <button type="button" onClick={() => { clearFile(); setForm(previous => ({ ...previous, logo_url: '' })); setMessage(''); }} className="text-maroon underline">Gunakan logo bawaan</button>
          <label className="block">Warna utama<input className="mt-1 block h-10 w-20" type="color" name="primary_color" value={form.primary_color} onChange={change} /></label>
          <div className="grid gap-4 md:grid-cols-3">
            <label>Jam mulai<input className={fieldClass} type="time" name="schedule_start" value={form.schedule_start} required onChange={change} /></label>
            <label>Jam selesai<input className={fieldClass} type="time" name="schedule_end" value={form.schedule_end} required onChange={change} /></label>
            <label>Durasi pelajaran (menit)<input className={fieldClass} type="number" name="lesson_duration" value={form.lesson_duration} min={1} max={1439} step={1} required onChange={change} /></label>
          </div>
        </fieldset>
      </FormContainer>
    </div>}
  </Dashboard>;
}
