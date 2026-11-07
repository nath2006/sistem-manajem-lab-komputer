import React, { useEffect, useState } from 'react';
import { get } from '../../utils/api';
import MaintenanceMilestones from './MaintenanceMilestones';
import LoadingSkeleton from '../Loading/Skeleton';

export default function MaintenanceHistory({ pengecekanId }) {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    let active = true;
    setState({ loading: true });
    if (!pengecekanId) {
      setState({ legacy: true });
      return () => { active = false; };
    }
    (async () => {
      try {
        const ticket = (await get(`/pengecekan/${pengecekanId}`)).data;
        if (!ticket) throw new Error('Riwayat tidak ditemukan.');
        const inspection = ticket.pemeriksaan_id ? (await get(`/pemeriksaan/${ticket.pemeriksaan_id}`)).data : null;
        if (active) setState({ inspection, tickets: inspection?.pengecekan || [ticket], repairs: inspection?.perbaikan || ticket.perbaikan || [] });
      } catch (error) {
        if (active) setState({ error: error.response?.data?.message || error.message || 'Gagal memuat riwayat penanganan.' });
      }
    })();
    return () => { active = false; };
  }, [pengecekanId]);
  if (state.loading) return <LoadingSkeleton variant="detail" label="Memuat riwayat penanganan..." />;
  if (state.legacy) return <p className="rounded bg-yellow-50 p-3 text-sm text-yellow-800">Data lama: tautan pengecekan sudah dihapus oleh alur sebelumnya. Detail perbaikan tetap tersedia; riwayat asal tidak dapat dipastikan.</p>;
  if (state.error) return <p role="alert" className="text-sm text-red-600">{state.error}</p>;
  return <MaintenanceMilestones pemeriksaan={state.inspection} pengecekan={state.tickets} perbaikan={state.repairs} />;
}
