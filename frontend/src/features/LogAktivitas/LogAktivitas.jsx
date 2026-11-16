import LoadingSkeleton from '../../Components/Loading/Skeleton';
import { useContext, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, LogIn, LogOut, Settings, Wrench, CalendarDays, ClipboardList, Eye, RefreshCw } from 'lucide-react';
import { activityParams, presentActivity, CATEGORIES } from './activityPresenter.mjs';
import Dashboard from '../../Layouts/Dashboard';
import { AuthContext } from '../../Context/AuthContext';
import api from '../../utils/api';
import TableScrollRegion from '../../Components/TableScrollRegion';

const EMPTY_FILTERS = { actor: '', category: '', date: '' };
const control = 'min-h-11 w-full min-w-0 rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-900 focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/20';
const button = 'min-h-11 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium focus-visible:outline-maroon disabled:opacity-40';
function ActivityRow({ row }) {
  const item = presentActivity(row);
  const Icon = item.category === 'login' ? LogIn : item.category === 'logout' ? LogOut : item.category === 'delete' ? Trash2 : /settings/.test(item.path) ? Settings : /perbaikan|repair/.test(item.path) ? Wrench : /jadwal|schedule/.test(item.path) ? CalendarDays : /pengajuan|request|ticket/.test(item.path) ? ClipboardList : item.category === 'create' ? Plus : item.category === 'update' ? Pencil : Eye;
  const tone = item.category === 'delete' ? 'bg-red-50 text-red-700' : item.category === 'create' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600';
  const cell = 'px-5 py-4 align-top';
  return <tr className="border-t border-gray-100 hover:bg-gray-50/70">
    <td className={`${cell} whitespace-nowrap`}><p className="font-semibold">{item.time}</p><p className="mt-1 text-xs text-gray-500">{item.date} WIB</p></td>
    <td className={`${cell} max-w-48 break-words`}><p className="font-semibold">{row.username || (row.user_id ? `User #${row.user_id}` : 'Anonim')}</p><p className="mt-1 text-xs text-gray-500">{row.role || 'Tanpa peran'}</p></td>
    <td className={cell}><div className="flex items-center gap-3"><span className={`rounded-xl p-2.5 ${tone}`}><Icon size={19} aria-hidden="true" /></span><div><p className={`whitespace-nowrap font-semibold ${item.category === 'delete' ? 'text-red-700' : item.category === 'create' ? 'text-green-700' : ''}`}>{item.label}</p><p className="mt-1 text-xs text-gray-500">{item.resource}</p></div></div></td>
    <td className={`${cell} max-w-48 break-words`}>{item.resource}</td>
    <td className={`${cell} min-w-64 max-w-sm`}><div className="flex flex-wrap gap-2 text-xs"><span className={`rounded-md px-2 py-1 font-semibold ${row.status_code >= 400 ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'}`}>HTTP {row.status_code}</span><span className="py-1 font-medium">{row.method}</span><span className="py-1 text-gray-500">{row.duration_ms} ms</span></div>{item.path.length > 65 ? <details className="mt-2"><summary className="cursor-pointer text-maroon">Lihat endpoint</summary><p className="mt-2 break-all font-mono text-xs text-gray-600">{item.path}</p></details> : <p className="mt-2 break-all font-mono text-xs text-gray-600">{item.path}</p>}<p className="mt-1 break-all text-xs text-gray-500">Audit: {row.action || '—'}</p></td>
  </tr>;
}
export function ActivityLogView({ filters, onFilter, onReset, result, page, onPage, onRefresh, loading = false, error = '' }) {
  const filtered = Object.values(filters).some(Boolean);
  return <div className="min-w-0 space-y-5 text-gray-900">
    <section aria-label="Filter log aktivitas" className="grid min-w-0 grid-cols-1 gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-[1fr_1fr_220px_auto]">
      <label className="min-w-0 text-sm text-gray-600">Siapa<select className={`${control} mt-2`} value={filters.actor} onChange={e => onFilter('actor', e.target.value)}><option value="">Semua orang</option>{(result.facets?.actors || []).map(actor => <option key={actor.user_id} value={actor.user_id}>{actor.username || `User #${actor.user_id}`} · #{actor.user_id}</option>)}</select></label>
      <label className="min-w-0 text-sm text-gray-600">Kategori<select className={`${control} mt-2`} value={filters.category} onChange={e => onFilter('category', e.target.value)}><option value="">Semua kategori</option>{Object.entries(CATEGORIES).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="min-w-0 text-sm text-gray-600">Tanggal (WIB)<input aria-label="Tanggal (WIB)" type="date" className={`${control} mt-2`} value={filters.date} onChange={e => onFilter('date', e.target.value)} /></label>
      <button type="button" className={`${button} self-end text-maroon`} disabled={!filtered} onClick={onReset}>Reset filter</button>
    </section>
    <section aria-label="Aktivitas" aria-busy={loading} className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-5 py-4"><h2 className="font-semibold">Aktivitas</h2><div className="flex flex-wrap items-center gap-4 text-xs text-gray-500"><span><span aria-hidden="true" className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-green-600" />Penambahan</span><span><span aria-hidden="true" className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-red-600" />Penghapusan</span><span><span aria-hidden="true" className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-gray-400" />Lainnya</span><span role="status">{loading ? 'Memuat…' : error ? 'Hitungan belum diperbarui' : `${result.pagination.total} catatan`}</span></div></header>
      <p className="px-5 pt-4 text-xs text-gray-500">Riwayat akses API dan perubahan data. Isi formulir, password, dan token tidak disimpan.</p>
      {error && <div role="alert" className="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}<button type="button" className={`${button} ml-3`} onClick={onRefresh}>Coba lagi</button>{result.data.length > 0 && <p className="mt-2">Menampilkan hasil terakhir; hasil ini belum sesuai filter terbaru.</p>}</div>}
      {loading && !result.data.length ? <LoadingSkeleton variant="table" columns={5} label="Memuat log aktivitas..." className="p-5" /> : <TableScrollRegion label="Log aktivitas"><table style={{ minWidth: 900 }} className="w-full text-left text-sm"><thead className="text-gray-500"><tr>{['Waktu','Siapa','Aksi','Data','Rincian'].map(label => <th scope="col" className="px-5 py-4 font-medium" key={label}>{label}</th>)}</tr></thead><tbody>{result.data.length ? result.data.map(row => <ActivityRow key={row.id} row={row} />) : <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-500">{error ? 'Data belum tersedia.' : filtered ? 'Tidak ada aktivitas yang cocok dengan filter.' : 'Belum ada aktivitas.'}{filtered && <button className={`${button} ml-3 text-maroon`} type="button" onClick={onReset}>Reset filter</button>}</td></tr>}</tbody></table></TableScrollRegion>}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 p-5 text-sm"><span className="text-gray-500">Halaman {page} / {Math.max(1,result.pagination.total_pages)}</span><div className="flex flex-wrap gap-2"><button type="button" disabled={loading} className={`${button} text-maroon`} onClick={onRefresh}><RefreshCw size={14} className="mr-2 inline" aria-hidden="true" />Muat ulang</button><button type="button" className={button} disabled={loading || !!error || page <= 1} onClick={() => onPage(page-1)}>Sebelumnya</button><button type="button" className={button} disabled={loading || !!error || page >= result.pagination.total_pages} onClick={() => onPage(page+1)}>Berikutnya</button></div></footer>
    </section>
  </div>;
}

export default function LogAktivitas() {
  const { state } = useContext(AuthContext);
  const admin = state?.role === 'Admin';
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState({ data: [], pagination: { total: 0, total_pages: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!admin) return;
    let active = true;
    setLoading(true); setError('');
    api.get('/activity-logs', { params: activityParams(page, filters) }).then(response => {
      if (active) setResult(response.data);
    }).catch(() => { if (active) setError('Gagal mengambil log aktivitas. Silakan coba lagi.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [admin, page, refresh, filters]);
  return <Dashboard title="Log Aktivitas">
    {!admin ? <p role="alert">Hanya Admin yang dapat mengakses log aktivitas.</p> : <ActivityLogView filters={filters} onFilter={(key,value) => { setPage(1); setFilters(previous => ({ ...previous, [key]:value })); }} onReset={() => { setPage(1); setFilters(EMPTY_FILTERS); }} result={result} page={page} onPage={setPage} loading={loading} error={error} onRefresh={() => setRefresh(value => value+1)} />}
  </Dashboard>;
}
