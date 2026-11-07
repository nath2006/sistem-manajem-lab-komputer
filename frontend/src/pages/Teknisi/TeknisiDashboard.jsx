import LoadingSkeleton from '../../Components/Loading/Skeleton';
import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../Context/AuthContext'; 
import Dashboard from '../../Layouts/Dashboard'; 
import Footer from '../../components/Footer'; 
import { getGreetingTime } from '../../utils/greetingTime'; 
import moment from 'moment'; 
import 'moment/locale/id'; 
import useTitle from '../../utils/useTitle';
import { get } from '../../utils/api'; 
import { FaTools, FaHistory, FaSearchLocation } from "react-icons/fa"; 

import AddPengecekan from '../../Components/Pengecekan/AddPengecekan';
import AddPerbaikan from '../../Components/Perbaikan/AddPerbaikan';
import DetailPengecekan from '../../Components/Pengecekan/DetailPengecekan';
import DetailPerbaikan from '../../Components/Perbaikan/DetailPerbaikan';

const TeknisiDashboard = () => {
  const navigate = useNavigate();
  const { state: authState } = useContext(AuthContext);
  const userName = authState?.fullName || authState?.user || "Teknisi";
  moment.locale('id'); 
  useTitle(`Dashboard Teknisi - ${userName}`);

  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [repairTicket, setRepairTicket] = useState(null);
  const [detailTicket, setDetailTicket] = useState(null);
  const [detailRepair, setDetailRepair] = useState(null);
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState({
    totalPengecekanAktif: 0,
    totalRiwayatPerbaikan: 0,
    antrian: [], riwayat: [],
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState("");

  const fetchTeknisiStats = async (isInitialLoad = false) => {
    if (isInitialLoad && !stats.totalPengecekanAktif && !stats.totalRiwayatPerbaikan && !stats.antrian.length && !stats.riwayat.length) setIsLoadingStats(true);
    setErrorStats(""); 
    try {

      const response = await get("/dashboard/teknisi/stats"); 
      if (response && response.data) {
        setStats({
          totalPengecekanAktif: response.data.totalPengecekanAktif || 0,
          totalRiwayatPerbaikan: response.data.totalRiwayatPerbaikan || 0,
          antrian: response.data.antrian || [], riwayat: response.data.riwayat || [],
        });
      } else {
        if(isInitialLoad) setErrorStats("Data statistik tidak ditemukan.");
   
      }
    } catch (err) {
      console.error("Error fetching teknisi dashboard stats:", err.response?.data || err.message || err);
      setErrorStats("Gagal mengambil data terbaru dashboard Teknisi. Silakan muat ulang.");
 
    } finally {
      if (isInitialLoad) setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchTeknisiStats(true);
    const refreshInterval = parseInt(import.meta.env.VITE_REFRESH_INTERVAL, 10) || 300000; // 5 menit
    const refresh = () => fetchTeknisiStats(false);
    window.addEventListener('focus', refresh);
    const interval = setInterval(() => fetchTeknisiStats(false), refreshInterval);
    return () => { clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, []);

  const StatCard = ({ title, value, icon, bgColor = "bg-gray-500", isLoading }) => (
    <div className={`col-span-12 md:col-span-6 p-6 rounded-xl shadow-lg text-white ${bgColor}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider">{title}</p>
          {isLoading ? (
            <LoadingSkeleton variant="text" rows={1} label="Memuat statistik..." className="mt-1" />
          ) : (
            <p className="text-3xl font-semibold">{value}</p>
          )}
        </div>
        <div className="text-4xl opacity-80">
          {icon}
        </div>
      </div>
    </div>
  );


  return (
    <Dashboard title="Dashboard Teknisi">
      <div className="min-h-[calc(100vh-80px)] flex flex-col px-4 py-6 md:px-6 lg:px-8 text-gray-800"> {/* bg-white dihapus agar bg dari Dashboard Layout dipakai */}
        <div className="flex-grow">
          {/* Salam Pembuka */}
          <div className="mb-6 p-4 bg-white rounded-lg shadow">
            <h1 className="font-semibold text-xl md:text-2xl">
              Selamat {getGreetingTime(moment())}, {userName}!
            </h1>
            <p className="text-gray-600">Ini adalah ringkasan tugas dan aktivitas perbaikan Anda.</p>
          </div>

          {/* Shortcut "Lihat Data Pengecekan" */}
          <div className="mb-8 md:mb-12 group">
            <button type="button" 
              className="min-h-[70px] w-full text-left py-3 max-w-full bg-maroon hover:bg-maroon/90 rounded-xl shadow-lg hover:shadow-xl hover:cursor-pointer transition-all duration-300 ease-in-out transform hover:-translate-y-1 active:translate-y-0"
              onClick={() => navigate('/kelola-pengecekan')} 
            >
              <div className="flex justify-start items-center h-full mx-4 sm:mx-6">
                <div className="p-3 bg-white/20 rounded-full mr-4">
                  <FaSearchLocation size={20} className='text-white'/>
                </div>
                <h1 className="text-white text-md sm:text-lg font-semibold">Lihat Data Pengecekan</h1>
              </div>
            </button>
          </div>

          <div className="mb-5 flex flex-wrap gap-3">
            <button className="rounded-md bg-maroon hover:bg-maroon/90 transition-colors px-4 py-2 text-sm font-medium text-white" onClick={() => setShowTroubleshoot(true)}>Troubleshoot Baru</button>
            <button className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm" onClick={() => fetchTeknisiStats(true)}>Muat Ulang</button>
            <button className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm" onClick={() => navigate('/kelola-perbaikan')}>Semua Riwayat Perbaikan</button>
          </div>
          {success && <p role="status" className="mb-4 rounded bg-green-50 p-3 text-sm text-green-800">{success}</p>}
          {/* Card Statistik */}
          {errorStats && (
            <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg shadow">
                {errorStats}
            </div>
          )}
          <div className="grid grid-cols-12 gap-6 mb-8">
            <StatCard 
              title="Total Pengecekan Aktif"
              value={stats.totalPengecekanAktif}
              icon={<FaTools />}
              bgColor="bg-blue-500" 
              isLoading={isLoadingStats}
            />
            <StatCard 
              title="Total Riwayat Perbaikan"
              value={stats.totalRiwayatPerbaikan}
              icon={<FaHistory />}
              bgColor="bg-green-500" 
              isLoading={isLoadingStats}
            />
          </div>
          <section className="mb-6 rounded-lg bg-white p-5 shadow">
            <h2 className="mb-1 text-lg font-semibold">Antrian Troubleshoot</h2>
            <p className="mb-4 text-xs text-gray-500">20 temuan aktif terlama. Pemeriksaan bermasalah otomatis muncul di sini.</p>
            {isLoadingStats ? <LoadingSkeleton variant="table" label="Memuat antrian..." /> : !(stats.antrian || []).length ? <p className="text-sm text-gray-500">Tidak ada antrian aktif.</p> :
              <ul className="divide-y divide-gray-100">{stats.antrian.map(ticket => <li key={ticket.pengecekan_id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0 flex-1"><h3 className="font-medium">{ticket.nama_perangkat} — {ticket.nama_lab}</h3>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-600">{ticket.ditemukan_kerusakan}</p>
                  <p className="mt-1 text-xs text-gray-500">{ticket.status_pengecekan} • {ticket.pemeriksaan_id ? `Pemeriksaan #${ticket.pemeriksaan_id}` : 'Troubleshoot langsung'}</p>
                </div>
                <div className="flex gap-2"><button className="rounded border px-3 py-2 text-sm" onClick={() => setDetailTicket(ticket.pengecekan_id)}>Milestone</button>
                  <button className="rounded bg-maroon hover:bg-maroon/90 transition-colors px-3 py-2 text-sm text-white" onClick={() => setRepairTicket(ticket)}>Catat Perbaikan</button></div>
              </li>)}</ul>}
          </section>
          <section className="mb-6 rounded-lg bg-white p-5 shadow">
            <h2 className="mb-4 text-lg font-semibold">Riwayat Perbaikan Terbaru</h2>
            {isLoadingStats && !(stats.riwayat || []).length && <LoadingSkeleton variant="table" label="Memuat riwayat perbaikan..." />}
            {!isLoadingStats && !(stats.riwayat || []).length && <p className="text-sm text-gray-500">Belum ada riwayat perbaikan.</p>}
            <ul className="divide-y divide-gray-100">{(stats.riwayat || []).map(repair => <li key={repair.perbaikan_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div><p className="text-sm font-medium">{repair.nama_perangkat || 'Perangkat lama'} — {repair.hasil_perbaikan}</p>
                <p className="text-xs text-gray-500">{repair.nama_user} • {repair.tindakan}</p></div>
              <button className="rounded border px-3 py-2 text-sm" onClick={() => setDetailRepair(repair.perbaikan_id)}>Lihat Milestone</button>
            </li>)}</ul>
          </section>
          
      

        </div>
        {showTroubleshoot && <AddPengecekan onClose={() => setShowTroubleshoot(false)} onSuccess={() => { setSuccess('Temuan baru masuk antrian teknisi.'); fetchTeknisiStats(true); }} />}
        {repairTicket && <AddPerbaikan pengecekanData={repairTicket} loggedInUserId={authState?.userId} onClose={() => setRepairTicket(null)} onSuccess={() => { setSuccess('Perbaikan tersimpan. Status pemeriksaan dan perangkat telah disinkronkan.'); fetchTeknisiStats(true); }} />}
        {detailTicket && <DetailPengecekan id={detailTicket} onClose={() => setDetailTicket(null)} />}
        {detailRepair && <DetailPerbaikan id={detailRepair} onClose={() => setDetailRepair(null)} />}
        <Footer />
      </div>
    </Dashboard>
  );
}

export default TeknisiDashboard;
