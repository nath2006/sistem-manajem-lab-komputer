import React, { useState, useEffect, useContext } from 'react';
import LoadingSkeleton from '../Loading/Skeleton';
import { useNavigate } from 'react-router-dom';
import { post, get } from '../../utils/api';
import Dashboard from '../../Layouts/Dashboard';
import FormContainer from '../FormContainer';
import ModalContainer from '../DetailModal/ModalContainer';
import { AuthContext } from '../../Context/AuthContext';

// Inline mode avoids the legacy Admin-only add route for technicians.
const AddPengecekan = ({ onClose, onSuccess } = {}) => {
  const navigate = useNavigate();
  const { state: authState } = useContext(AuthContext);
  const [formData, setFormData] = useState({ perangkat_id: '', tanggal_pengecekan: new Date().toLocaleDateString('en-CA'), ditemukan_kerusakan: '' });
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    get('/perangkat').then(response => { if (active) setDevices(response.data || []); })
      .catch(() => { if (active) setError('Gagal memuat daftar perangkat. Tutup dan coba lagi.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const close = () => onClose ? onClose() : navigate('/kelola-pengecekan');
  const change = e => setFormData(previous => ({ ...previous, [e.target.name]: e.target.value }));
  const submit = async e => {
    e?.preventDefault();
    if (saving) return;
    if (!formData.perangkat_id || !formData.tanggal_pengecekan || !formData.ditemukan_kerusakan.trim()) { setError('Perangkat, tanggal dan temuan kerusakan wajib diisi.'); return; }
    setSaving(true); setError('');
    try {
      const response = await post('/pengecekan/create', formData);
      if (onSuccess) { onSuccess(response); onClose?.(); }
      else navigate('/kelola-pengecekan', { state: { successMsg: response.message || 'Troubleshoot baru tersimpan.' } });
    } catch (err) { setError(err.response?.data?.message || err.message || 'Gagal menyimpan troubleshoot.'); }
    finally { setSaving(false); }
  };
  const fields = <div className="space-y-4 text-gray-700">
    <p className="rounded bg-blue-50 p-3 text-sm text-blue-800">Pelapor: {authState?.fullName || 'Pengguna aktif'}. Temuan masuk antrian teknisi dengan status Baru.</p>
    {loading ? <LoadingSkeleton variant="form" label="Memuat perangkat..." /> : <>
      <label className="block text-sm font-medium">Perangkat
        <select required name="perangkat_id" value={formData.perangkat_id} onChange={change} disabled={saving} className="mt-1 block w-full rounded-md border border-gray-300 bg-white p-2.5">
          <option value="">Pilih perangkat</option>{devices.map(device => <option key={device.perangkat_id} value={device.perangkat_id}>{device.nama_perangkat} — {device.nama_lab} ({device.nomor_inventaris || '-'})</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium">Tanggal Pengecekan
        <input required type="date" name="tanggal_pengecekan" value={formData.tanggal_pengecekan} onChange={change} disabled={saving} className="mt-1 block w-full rounded-md border border-gray-300 p-2.5" />
      </label>
      <label className="block text-sm font-medium">Temuan Kerusakan
        <textarea required rows={4} name="ditemukan_kerusakan" value={formData.ditemukan_kerusakan} onChange={change} disabled={saving} className="mt-1 block w-full rounded-md border border-gray-300 p-2.5" />
      </label>
    </>}
  </div>;
  if (onClose) return <ModalContainer title="Troubleshoot Baru" onClose={close}
    primaryButton={<button disabled={saving || loading} onClick={submit} className="w-full rounded-md bg-maroon hover:bg-maroon/90 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan Temuan'}</button>}
    secondaryButton={<button disabled={saving} onClick={close} className="w-full rounded-md border px-4 py-2">Batal</button>}>
    {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}<form onSubmit={submit}>{fields}</form>
  </ModalContainer>;
  return <Dashboard title="Troubleshoot Baru"><FormContainer title="Troubleshoot Baru" error={error} isSubmitting={saving || loading} onSubmit={submit} onCancel={close} submitText="Simpan Temuan">{fields}</FormContainer></Dashboard>;
};
export default AddPengecekan;

