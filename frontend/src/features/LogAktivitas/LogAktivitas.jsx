import LoadingSkeleton from '../../Components/Loading/Skeleton';
import { useContext, useEffect, useState } from 'react';
import Dashboard from '../../Layouts/Dashboard';
import { AuthContext } from '../../Context/AuthContext';
import api from '../../utils/api';

export default function LogAktivitas() {
  const { state } = useContext(AuthContext);
  const admin = state?.role === 'Admin';
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState({ data: [], pagination: { total: 0, total_pages: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!admin) return;
    let active = true;
    setLoading(true); setError('');
    api.get('/activity-logs', { params: { page, limit: 20 } }).then(response => {
      if (active) setResult(response.data);
    }).catch(() => { if (active) setError('Gagal mengambil log aktivitas. Silakan coba lagi.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [admin, page, refresh]);
  return <Dashboard title="Log Aktivitas">
    {!admin ? <p role="alert">Hanya Admin yang dapat mengakses log aktivitas.</p> : <section className="w-full rounded-lg bg-white p-6 shadow-md">
      <div className="mb-4 flex items-center justify-between gap-4"><h2 className="text-xl font-semibold">Log Aktivitas User</h2><button type="button" disabled={loading} className="rounded-md bg-maroon px-4 py-2 text-white disabled:opacity-50" onClick={() => setRefresh(value => value + 1)}>Muat ulang</button></div>
      <p className="mb-4 text-sm text-gray-600">Riwayat akses API dan perubahan data. Isi formulir, password, dan token tidak disimpan.</p>
      {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
      {loading && result.data.length === 0 ? <LoadingSkeleton variant="table" label="Memuat log..." /> : !error && <>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm text-gray-900">
          <thead className="bg-gray-100"><tr>{['Waktu', 'User', 'Role', 'Aktivitas', 'Metode', 'Endpoint', 'Status', 'Durasi'].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead>
          <tbody>{result.data.length ? result.data.map(row => <tr key={row.id} className="border-b">
            <td className="whitespace-nowrap px-3 py-3">{new Date(row.created_at).toLocaleString('id-ID')}</td>
            <td className="px-3 py-3">{row.username || (row.user_id ? `User #${row.user_id}` : 'Anonim')}</td>
            <td className="px-3 py-3">{row.role || '—'}</td><td className="px-3 py-3">{row.action}</td>
            <td className="px-3 py-3">{row.method}</td><td className="max-w-sm break-all px-3 py-3">{row.path}</td>
            <td className="px-3 py-3">{row.status_code}</td><td className="whitespace-nowrap px-3 py-3">{row.duration_ms} ms</td>
          </tr>) : <tr><td colSpan={8} className="p-6 text-center">Belum ada aktivitas.</td></tr>}</tbody>
        </table></div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <p role="status">Halaman {page} / {Math.max(1, result.pagination.total_pages)} · {result.pagination.total} aktivitas</p>
          <div className="flex gap-3"><button type="button" className="rounded border px-3 py-2 disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Sebelumnya</button><button type="button" className="rounded border px-3 py-2 disabled:opacity-50" disabled={page >= result.pagination.total_pages} onClick={() => setPage(value => value + 1)}>Berikutnya</button></div>
        </div>
      </>}
    </section>}
  </Dashboard>;
}
