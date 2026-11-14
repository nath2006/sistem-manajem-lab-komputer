import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../Context/AuthContext';
import { get } from '../utils/api';

const statuses = {
  new: ['◉', 'Baru', 'info'], assigned: ['➜', 'Ditugaskan', 'info'],
  in_progress: ['⚙', 'Dikerjakan', 'primary'], pending: ['◷', 'Menunggu', 'warning'],
  resolved: ['✓', 'Diselesaikan', 'success'], closed: ['✓', 'Ditutup', 'success'],
  cancelled: ['×', 'Dibatalkan', 'danger'],
};
const total = rows => rows.reduce((sum, row) => sum + row.count, 0);

/** Horizontal SVG bars keep long HTML labels readable at any viewport width.
 * Numeric labels and the visible list are the accessible chart data, not color alone. */
export function DashboardBarChart({ title, rows, ticket = false }) {
  const max = Math.max(1, ...rows.map(row => row.count));
  return <section className="dashboard-chart" aria-label={title}>
    <h3>{title}</h3>
    {!rows.length ? <p className="dashboard-muted">Belum ada data.</p> : <ul className="dashboard-bars">
      {rows.map((row, index) => {
        const [icon, label, tone] = ticket ? (statuses[row.label] || ['◉', row.label, 'info']) : ['◆', row.label, `series-${index % 4}`];
        return <li key={row.label} data-tone={tone}>
          <div className="dashboard-bar-label"><span><span aria-hidden="true">{icon} </span>{label}</span><strong>{row.count.toLocaleString('id-ID')}</strong></div>
          <svg viewBox="0 0 100 8" preserveAspectRatio="none" role="img" aria-label={`${label}: ${row.count}`}>
            <rect className="dashboard-bar-track" width="100" height="8" rx="2" />
            {row.count > 0 && <rect className="dashboard-bar-fill" width={Math.max(1, row.count / max * 100)} height="8" rx="2" />}
          </svg>
        </li>;
      })}
    </ul>}
  </section>;
}

export function DashboardInsightsView({ data, role, loading = false, error = '', onRetry }) {
  const scope = role === 'Guru' ? 'Hanya tiket yang Anda laporkan.' : role === 'Kepala Lab' ? 'Tiket Anda dan tiket aset di laboratorium yang Anda pimpin.' : 'Semua tiket yang dapat Anda lihat di menu Bantuan.';
  return <section data-tour="dashboard-charts" className="dashboard-insights" aria-label="Grafik dashboard" aria-busy={loading}>
    <header><h2>Ringkasan layanan{role === 'Guru' ? ' Anda' : ' & aset IT'}</h2><p className="dashboard-muted">{scope}</p></header>
    {error && <p role="alert">Ringkasan belum dapat dimuat. <button type="button" className="dashboard-retry" onClick={onRetry}>Coba lagi</button></p>}
    {loading && !data && <p role="status">Memuat grafik dashboard…</p>}
    {data && <>
      <div className="dashboard-summaries">
        {data.assets && <div className="dashboard-summary" data-tone="info"><span aria-hidden="true">▣ </span><span>Aset IT</span><strong>{total(data.assets.categories).toLocaleString('id-ID')}</strong></div>}
        <div className="dashboard-summary" data-tone="primary"><span aria-hidden="true">◉ </span><span>Tiket terlihat</span><strong>{data.tickets.available ? total(data.tickets.rows).toLocaleString('id-ID') : '—'}</strong></div>
        {data.tickets.available && <div className="dashboard-summary" data-tone="warning"><span aria-hidden="true">◷ </span><span>Tiket aktif</span><strong>{total(data.tickets.rows.filter(row => !['resolved', 'closed', 'cancelled'].includes(row.label))).toLocaleString('id-ID')}</strong></div>}
        {data.tickets.available && <div className="dashboard-summary" data-tone="success"><span aria-hidden="true">✓ </span><span>Selesai / ditutup</span><strong>{total(data.tickets.rows.filter(row => ['resolved', 'closed'].includes(row.label))).toLocaleString('id-ID')}</strong></div>}
      </div>
      <div className="dashboard-chart-grid">
        {data.assets && <><DashboardBarChart title="Aset per kategori" rows={data.assets.categories} /><DashboardBarChart title="Kondisi aset" rows={data.assets.conditions} /></>}
        {data.tickets.available ? <DashboardBarChart title="Tiket per status" rows={data.tickets.rows} ticket /> : <section className="dashboard-chart"><h3>Tiket per status</h3><p role="status">{data.tickets.reason}</p></section>}
      </div>
    </>}
  </section>;
}

export default function DashboardInsights() {
  const { state } = useContext(AuthContext);
  // Bind data to the actual session, not just a role shared by many users.
  const session = `${state?.userId}|${state?.role}|${state?.token || ''}`;
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    let requestSequence = 0;
    const refresh = async () => {
      const request = ++requestSequence;
      try {
        const response = await get('/dashboard/insights');
        if (active && request === requestSequence) { setResult({ session, data: response.data }); setError(''); }
      } catch { if (active && request === requestSequence) setError('Gagal memuat ringkasan.'); }
      finally { if (active && request === requestSequence) setLoading(false); }
    };
    setLoading(true); setError(''); refresh();
    const interval = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { active = false; clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, [session, retry]);
  return <DashboardInsightsView role={state?.role} data={result?.session === session ? result.data : null} loading={loading} error={error} onRetry={() => setRetry(value => value + 1)} />;
}
