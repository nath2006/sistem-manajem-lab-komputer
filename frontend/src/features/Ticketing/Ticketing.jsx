import LoadingSkeleton from '../../Components/Loading/Skeleton';
import { Link } from 'react-router-dom';
import { field, button, statuses, labels } from './ticketingUi';
import { Select } from './TicketFields';
import CreateTicketForm from './CreateTicketForm';
import TicketList from './TicketList';
import TicketActionForm from './TicketActionForm';
import TicketClassificationForm from './TicketClassificationForm';
import SlaPolicyForm from './SlaPolicyForm';
import useDebouncedValue from '../../utils/useDebouncedValue';
import { useContext, useEffect, useRef, useState } from 'react';
import Dashboard from '../../Layouts/Dashboard';
import ModalContainer from '../../Components/DetailModal/ModalContainer';
import { AuthContext } from '../../Context/AuthContext';
import api from '../../utils/api';
import {
  availableActions,
  isManager,
  isTerminal,
} from './ticketingHelpers.js';

const date = (value) => (value ? new Date(value).toLocaleString('id-ID') : '—');
const failureMessage = (error) => error.response?.data?.message || error.message || 'Permintaan gagal. Silakan coba lagi.';
export function SourceNotice({ sourceId, role }) {
  if (!sourceId) return null;
  return (
    <p className="rounded bg-maroon/10 p-3 text-sm">
      Catat perbaikan berhasil di menu Perbaikan Perangkat terlebih dahulu, lalu
      tandai tiket terselesaikan untuk verifikasi pelapor.{' '}
      {['Admin', 'Teknisi'].includes(role) && (
        <Link
          className="font-semibold text-maroon underline"
          to="/kelola-perbaikan"
        >
          Buka Perbaikan Perangkat
        </Link>
      )}
    </p>
  );
}
export default function Ticketing() {
  const { state } = useContext(AuthContext);
  const manager = isManager(state?.role);
  const admin = state?.role === 'Admin';
  const [options, setOptions] = useState(null);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({
    page: 1,
    status: '',
    priority: '',
    q: '',
  });
  const [optionsRefresh, setOptionsRefresh] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  useEffect(() => {
    setFilters(previous => previous.q === debouncedSearch ? previous : {...previous, q: debouncedSearch, page: 1});
  }, [debouncedSearch]);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [modal, setModal] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const detailRequest = useRef(0);
  useEffect(() => {
    let active = true;
    api
      .get('/tickets/options')
      .then((r) => {
        if (active) {
          setOptions(r.data.data);
        }
      })
      .catch((e) => {
        if (active) setError(failureMessage(e));
      });
    return () => {
      active = false;
    };
  }, [optionsRefresh]);
  useEffect(() => {
    let active = true;
    if (search !== debouncedSearch || filters.q !== debouncedSearch) return;
    setLoading(true);
    setError('');
    api
      .get('/tickets', { params: { ...filters, limit: 10 } })
      .then((r) => {
        if (active) {
          setRows(r.data.data);
          setSummary(r.data.summary);
          setPagination(r.data.pagination);
        }
      })
      .catch((e) => {
        if (active) setError(failureMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters, refresh, search, debouncedSearch]);
  const openDetail = async (id) => {
    const request = ++detailRequest.current;
    setModal('detail');
    setDetail(null);
    setDetailLoading(true);
    setError('');
    try {
      const r = await api.get(`/tickets/${id}`);
      if (request !== detailRequest.current) return;
      setDetail(r.data.data);
    } catch (e) {
      if (request === detailRequest.current) setError(failureMessage(e));
    } finally {
      if (request === detailRequest.current) setDetailLoading(false);
    }
  };
  const closeModal = () => {
    if (!saving) {
      detailRequest.current += 1;
      setModal(null);
      setError('');
    }
  };
  const mutate = async (request, after) => {
    if (saving) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const r = await request();
      setMessage(r.data.message || 'Perubahan berhasil disimpan.');
      setRefresh((v) => v + 1);
      if (after) await after(r);
    } catch (e) {
      setError(failureMessage(e));
    } finally {
      setSaving(false);
    }
  };
  const changeFilter = (key, value) =>
    setFilters((previous) => ({ ...previous, [key]: value, page: 1 }));
  const actions = detail ? availableActions(detail, state || {}) : [];
  return (
    <Dashboard title="Tiket Layanan">
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl font-bold text-maroon">Tiket Layanan</h1>
          <p className="text-gray-600">
            Manajemen incident dan service request sekolah; bukan sertifikasi
            ISO.
          </p>
          <p className="text-sm text-gray-500">
            SLA dihitung 24×7 termasuk saat pending. Resolusi perlu verifikasi
            sebelum ditutup.
          </p>
        </header>
        {error && (
          <p role="alert" className="rounded bg-red-100 p-3 text-red-800">
            {error}{' '}
            <button
              className="min-h-11 min-w-11 underline"
              onClick={() => setRefresh((v) => v + 1)}
            >
              Muat ulang
            </button>
          </p>
        )}
        {message && (
          <p role="status" className="rounded bg-maroon/10 p-3 text-maroon">
            {message}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            ['total', 'Total'],
            ['open', 'Aktif'],
            ['overdue', 'Lewat SLA'],
            ['awaiting_verification', 'Menunggu verifikasi'],
            ['escalated', 'Dieskalasi'],
          ].map(([key, label]) => (
            <div key={key} className="rounded-lg border bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-600">{label}</p>
              <strong className="text-2xl text-maroon">
                {loading && !Object.keys(summary).length ? <LoadingSkeleton variant="text" rows={1} label="Memuat statistik tiket..." /> : summary[key] ?? '—'}
              </strong>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className={button}
            disabled={!options || saving}
            onClick={() => {
              setError('');
              setModal('create');
            }}
          >
            Buat Tiket
          </button>
          {(manager || state?.role === 'Teknisi') && (
            <button
              className={button}
              disabled={saving}
              onClick={() =>
                mutate(
                  () => api.post('/tickets/import-maintenance'),
                  (r) =>
                    setMessage(
                      `${r.data.message || 'Impor selesai'}. Tiket diimpor: ${r.data.data.imported}.`
                    )
                )
              }
            >
              Impor Temuan Pemeriksaan
            </button>
          )}
          {admin && (
            <button
              className={button}
              disabled={!options || saving}
              onClick={() => {
                setModal('policies');
              }}
            >
              Kebijakan SLA
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500">
          Impor temuan bersifat idempoten. Siklus tiket terpisah dari status
          perbaikan perangkat; tidak menyinkronkan perbaikan otomatis.
        </p>
        <section className="rounded-lg bg-white p-4 shadow-md">
          <div className="grid gap-3 md:grid-cols-3">
            <label>
              Cari nomor / judul
              <input
                className={field}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <Select
              label="Status"
              value={filters.status}
              options={[{ value: '', label: 'Semua status' }, ...statuses]}
              onChange={(v) => changeFilter('status', v)}
            />
            <Select
              label="Prioritas"
              value={filters.priority}
              options={[
                { value: '', label: 'Semua prioritas' },
                'P1',
                'P2',
                'P3',
                'P4',
              ]}
              onChange={(v) => changeFilter('priority', v)}
            />
          </div>
          {loading && rows.length === 0 ? (
            <LoadingSkeleton variant="table" label="Memuat tiket..." />
          ) : rows.length === 0 ? (
            <p className="py-6">Belum ada tiket sesuai filter.</p>
          ) : (
            <TicketList tickets={rows} onDetail={openDetail} />
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span>
              Halaman {pagination.page} / {pagination.pages || 1} ·{' '}
              {pagination.total} tiket
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                className={button}
                disabled={loading || filters.page <= 1}
                onClick={() => setFilters((v) => ({ ...v, page: v.page - 1 }))}
              >
                Sebelumnya
              </button>
              <button
                className={button}
                disabled={loading || filters.page >= pagination.pages}
                onClick={() => setFilters((v) => ({ ...v, page: v.page + 1 }))}
              >
                Berikutnya
              </button>
            </div>
          </div>
        </section>
        {modal && (
            <ModalContainer
              title={
                modal === 'detail'
                  ? detail?.ticket_number || 'Detail tiket'
                  : modal === 'create'
                    ? 'Buat Tiket'
                    : 'Kebijakan SLA'
              }
              onClose={closeModal}
              isBusy={saving}
            >
              {error && (
                <p
                  role="alert"
                  className="mb-4 rounded bg-red-100 p-3 text-red-800"
                >
                  {error}
                  {modal === 'detail' && detail && (
                    <button
                      type="button"
                      className="ml-2 min-h-11 min-w-11 underline"
                      disabled={saving}
                      onClick={() => openDetail(detail.ticket_id)}
                    >
                      Muat ulang detail
                    </button>
                  )}
                </p>
              )}
{modal === 'create' && <CreateTicketForm options={options} saving={saving} closeModal={closeModal} onSubmit={payload => mutate(() => api.post('/tickets', payload), r => openDetail(r.data.data.ticket_id))} />}
              {modal === 'detail' &&
                (detailLoading ? (
                  <LoadingSkeleton variant="detail" label="Memuat detail tiket..." />
                ) : (
                  detail && (
                    <div className="space-y-6">
                      <header>
                        <h2 className="text-xl font-semibold">
                          {detail.title}
                        </h2>
                        <p className="whitespace-pre-wrap">
                          {detail.description}
                        </p>
                        <p className="mt-2">
                          {detail.priority} · {labels[detail.status]} ·{' '}
                          {detail.type} / {detail.category}
                        </p>
                        {detail.escalated_at && (
                          <p className="text-maroon">
                            Dieskalasi: {date(detail.escalated_at)}
                          </p>
                        )}
                      </header>
                      <dl className="grid gap-3 text-sm sm:grid-cols-2">
                        {[
                          ['Pelapor', detail.reporter_name],
                          [
                            'Teknisi',
                            detail.assignee_name || 'Belum ditugaskan',
                          ],
                          [
                            'Perangkat / lab',
                            `${detail.nama_perangkat || '—'} / ${detail.nama_lab || '—'}`,
                          ],
                          [
                            'Sumber pemeriksaan',
                            detail.pengecekan_id || 'Laporan langsung',
                          ],
                          ['Dibuat', date(detail.created_at)],
                          ['Batas respons', date(detail.response_due_at)],
                          ['Respons pertama', date(detail.first_response_at)],
                          ['Batas resolusi', date(detail.resolution_due_at)],
                          ['Diselesaikan', date(detail.resolved_at)],
                          ['Diverifikasi / ditutup', date(detail.closed_at)],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <dt className="text-gray-500">{label}</dt>
                            <dd>{value}</dd>
                          </div>
                        ))}
                      </dl>
                      {(detail.response_breached ||
                        detail.resolution_breached) && (
                        <p className="text-red-700">
                          Pelanggaran SLA:{' '}
                          {detail.response_breached ? 'respons ' : ''}
                          {detail.resolution_breached ? 'resolusi' : ''}
                        </p>
                      )}
                      {detail.status === 'pending' && (
                        <p className="rounded bg-maroon/10 p-3">
                          Alasan pending:{' '}
                          {[...(detail.events || [])]
                            .reverse()
                            .find((e) => e.action === 'pending')?.note ||
                            'Lihat riwayat.'}{' '}
                          SLA tetap berjalan.
                        </p>
                      )}
                      {detail.resolution && (
                        <section>
                          <h3 className="font-semibold">Resolusi</h3>
                          <p className="whitespace-pre-wrap">
                            {detail.resolution}
                          </p>
                          <p>Akar masalah: {detail.root_cause || '—'}</p>
                        </section>
                      )}
                      <SourceNotice
                        sourceId={detail.pengecekan_id}
                        role={state?.role}
                      />
{actions.length > 0 && <TicketActionForm options={options} detail={detail} state={state} saving={saving} closeModal={closeModal} onSubmit={payload => mutate(() => api.post(`/tickets/${detail.ticket_id}/actions`, payload), () => openDetail(detail.ticket_id))} />}
{manager && !isTerminal(detail.status) && <TicketClassificationForm options={options} detail={detail} saving={saving} closeModal={closeModal} onSubmit={payload => mutate(() => api.put(`/tickets/${detail.ticket_id}`, payload), () => openDetail(detail.ticket_id))} />}
                      <section>
                        <h3 className="font-semibold text-maroon">
                          Riwayat & milestone (append-only)
                        </h3>
                        <ol className="mt-3 space-y-4 border-l-2 border-maroon pl-4">
                          {(detail.events || []).map((event) => (
                            <li key={event.event_id}>
                              <strong>
                                {labels[event.action] || event.action}
                              </strong>
                              <p className="text-sm text-gray-500">
                                {date(event.created_at)} ·{' '}
                                {event.actor_name || 'Sistem'} ·{' '}
                                {event.from_status || '—'} →{' '}
                                {event.to_status || '—'}
                              </p>
                              <p className="whitespace-pre-wrap">
                                {event.note}
                              </p>
                            </li>
                          ))}
                        </ol>
                      </section>
                    </div>
                  )
                ))}
{modal === 'policies' && <SlaPolicyForm options={options} saving={saving} closeModal={closeModal} onSubmit={payload => mutate(() => api.put('/tickets/policies', payload), () => { setOptionsRefresh(v => v + 1); setModal(null); })} />}
            </ModalContainer>
        )}
      </div>
    </Dashboard>
  );
}
