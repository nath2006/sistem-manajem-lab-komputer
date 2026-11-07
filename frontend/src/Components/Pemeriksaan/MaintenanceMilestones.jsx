import React from 'react';

const dateLabel = value => {
  if (!value) return 'Tanggal tidak tersedia';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

/** Exact source links only; never infer historical repairs by device/date. */
export default function MaintenanceMilestones({ pemeriksaan, pengecekan = [], perbaikan = [] }) {
  const milestones = [];
  if (pemeriksaan) milestones.push({
    key: 'inspection', title: `Pemeriksaan — ${pengecekan.length ? 'Bermasalah' : pemeriksaan.hasil_pemeriksaan}`,
    date: pemeriksaan.tanggal_pemeriksaan, actor: pemeriksaan.nama_pemeriksa,
    note: pengecekan[0]?.ditemukan_kerusakan || pemeriksaan.catatan,
  });
  for (const ticket of pengecekan) milestones.push({
    key: `queue-${ticket.pengecekan_id}`, title: 'Masuk antrian teknisi',
    date: ticket.tanggal_pengecekan, actor: ticket.nama_user,
    note: ticket.ditemukan_kerusakan, status: ticket.status_pengecekan,
  });
  for (const repair of [...perbaikan].sort((a, b) => a.perbaikan_id - b.perbaikan_id)) milestones.push({
    key: `repair-${repair.perbaikan_id}`, title: `Perbaikan #${repair.perbaikan_id} — ${repair.hasil_perbaikan}`,
    date: repair.tanggal_perbaikan, actor: repair.nama_user, note: repair.tindakan,
    extra: repair.catatan_tambahan, success: repair.hasil_perbaikan === 'Berhasil',
  });
  return <section aria-label="Milestone pemeriksaan dan perbaikan" className="rounded-lg border border-gray-200 bg-white p-4">
    <h3 className="mb-4 text-base font-semibold text-gray-800">Riwayat Penanganan</h3>
    {!milestones.length ? <p className="text-sm text-gray-500">Belum ada riwayat penanganan.</p> :
      <ol className="relative ml-2 border-l-2 border-gray-200">
        {milestones.map(item => <li key={item.key} className="relative mb-5 ml-5 last:mb-0">
          <span aria-hidden="true" className={`absolute -left-[29px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white ${item.success ? 'bg-green-500' : 'bg-red-500'}`} />
          <h4 className="text-sm font-semibold text-gray-800">{item.title}</h4>
          <p className="mt-1 text-xs text-gray-500">{dateLabel(item.date)}{item.actor ? ` • ${item.actor}` : ''}</p>
          {item.status && <p className="mt-1 text-xs font-medium text-blue-700">Status saat ini: {item.status}</p>}
          {item.note && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-700">{item.note}</p>}
          {item.extra && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-gray-500">{item.extra}</p>}
        </li>)}
      </ol>}
  </section>;
}
