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

const TeknisiDashboard = () => {
  const navigate = useNavigate();
  const { state: authState } = useContext(AuthContext);
  const userName = authState?.fullName || authState?.user || "Teknisi";
  moment.locale('id'); 
  useTitle(`Dashboard Teknisi - ${userName}`);

  const [stats, setStats] = useState({
    totalPengecekanAktif: 0,
    totalRiwayatPerbaikan: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState("");

  const fetchTeknisiStats = async (isInitialLoad = false) => {
    if (isInitialLoad) setIsLoadingStats(true);
    setErrorStats(""); // Reset error setiap fetch
    try {
      // Sesuaikan endpoint dengan yang Anda buat di backend
      const response = await get("/dashboard/teknisi/stats"); 
      if (response && response.data) {
        setStats({
          totalPengecekanAktif: response.data.totalPengecekanAktif || 0,
          totalRiwayatPerbaikan: response.data.totalRiwayatPerbaikan || 0,
        });
      } else {
        if(isInitialLoad) setErrorStats("Data statistik tidak ditemukan.");
        setStats({ totalPengecekanAktif: 0, totalRiwayatPerbaikan: 0 }); // Reset ke default jika data aneh
      }
    } catch (err) {
      console.error("Error fetching teknisi dashboard stats:", err.response?.data || err.message || err);
      if(isInitialLoad) setErrorStats("Gagal mengambil data statistik dashboard Teknisi.");
      setStats({ totalPengecekanAktif: 0, totalRiwayatPerbaikan: 0 }); // Reset ke default jika error
    } finally {
      if (isInitialLoad) setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchTeknisiStats(true);
    const refreshInterval = parseInt(import.meta.env.VITE_REFRESH_INTERVAL, 10) || 300000; // 5 menit
    const interval = setInterval(() => fetchTeknisiStats(false), refreshInterval);
    return () => clearInterval(interval);
  }, []);

  const StatCard = ({ title, value, icon, bgColor = "bg-gray-500", isLoading }) => (
    <div className={`col-span-12 md:col-span-6 p-6 rounded-xl shadow-lg text-white ${bgColor}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider">{title}</p>
          {isLoading ? (
            <div className="h-10 w-16 bg-white/30 animate-pulse rounded-md mt-1"></div>
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
            <div 
              className="h-[70px] max-w-full rounded-xl shadow-lg hover:shadow-xl hover:cursor-pointer transition-all duration-300 ease-in-out transform hover:-translate-y-1 active:translate-y-0"
              style={{ backgroundColor: '#F90000' }} // Background Merah
              onClick={() => navigate('/kelola-pengecekan')} // Arahkan ke halaman kelola pengecekan
            >
              <div className="flex justify-start items-center h-full mx-4 sm:mx-6">
                <div className="p-3 bg-white/20 rounded-full mr-4">
                  <FaSearchLocation size={20} className='text-white'/>
                </div>
                <h1 className="text-white text-md sm:text-lg font-semibold">Lihat Data Pengecekan</h1>
              </div>
            </div>
          </div>

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
          
      

        </div>
        <Footer />
      </div>
    </Dashboard>
  );
}

export default TeknisiDashboard;
