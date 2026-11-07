import { SkeletonRows } from '../../Components/Loading/Skeleton';
// MainDashboard.js (atau nama file yang Anda inginkan untuk dashboard utama ini)
import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../Context/AuthContext';
import DashboardTablePanel from '../../Components/DashboardTablePanel';
import Dashboard from '../../Layouts/Dashboard';
import Footer from '../../Components/Footer';
import { getGreetingTime } from '../../utils/greetingTime';
import moment from 'moment';
import useTitle from '../../utils/useTitle';
import { get } from '../../utils/api';
import { FaBullhorn } from "react-icons/fa6";

const MainDashboard = () => {
  const navigate = useNavigate();
  const { state: authState } = useContext(AuthContext);
  const userName = authState?.fullName || authState?.user || "Pengguna";

  useTitle(`Dashboard ${authState?.role || ''}`);

  const [labsData, setLabsData] = useState([]);
  const [isLoadingLabs, setIsLoadingLabs] = useState(true);
  const [errorLabs, setErrorLabs] = useState("");

  const fetchLabsData = async (isInitialLoad = false) => {
    if(isInitialLoad) setIsLoadingLabs(true);
    try {
      const response = await get("/lab");
      if (response && Array.isArray(response.data)) {
        setLabsData(response.data);
      } else {
        setLabsData([]);
        if(isInitialLoad) setErrorLabs("Data lab tidak ditemukan.");
      }
    } catch {
      setLabsData([]);
      if(isInitialLoad) setErrorLabs("Gagal mengambil data lab.");
    } finally {
      if(isInitialLoad) setIsLoadingLabs(false);
    }
  };

  useEffect(() => {
    fetchLabsData(true);
    const refreshInterval = parseInt(import.meta.env.VITE_REFRESH_INTERVAL, 10) || 300000;
    const interval = setInterval(() => fetchLabsData(false), refreshInterval);
    return () => clearInterval(interval);
  }, []);


  return (
    <Dashboard title={`Dashboard ${authState?.role || ''}`}>
      <div className="min-h-[calc(100vh-80px)] flex flex-col px-4 py-6 md:px-6 lg:px-8 bg-white text-gray-800">
        <div className="flex-grow">
          <div className="mb-6">
            <h1 className="font-semibold text-xl md:text-2xl">
              Selamat {getGreetingTime(moment())}, {userName}!
            </h1>
            <p className="text-gray-600">Semoga harimu menyenangkan dan produktif.</p>
          </div>

          {(authState?.role === "Admin" || authState?.role === "Koordinator Lab") && (
            <div className="mb-8 md:mb-12 group">
              <button type="button" 
                className="min-h-[70px] w-full text-left py-3 max-w-full bg-gradient-to-r from-maroon to-maroon/75 rounded-xl shadow-lg hover:shadow-xl hover:cursor-pointer transition-all duration-300 ease-in-out transform hover:-translate-y-1 active:translate-y-0"
                onClick={() => navigate('/add-pengumuman')}
              >
                <div className="flex justify-start items-center h-full mx-4 sm:mx-6">
                  <div className="p-3 bg-white/20 rounded-full mr-4">
                    <FaBullhorn size={20} className='text-white'/>
                  </div>
                  <h1 className="text-white text-md sm:text-lg font-semibold">Buat Pengumuman Baru</h1>
                </div>
              </button>
            </div>
          )}
<DashboardTablePanel className="mt-4" label="Data laboratorium">
      <table className="min-w-full">
        <thead className="bg-maroon sticky top-0 z-10">
          <tr className="rounded-t-lg">
            <th className="py-3 px-4 text-white border-b text-left rounded-tl-lg">No</th>
            <th className="py-3 px-4 text-white border-b text-left">Nama Lab</th>
            <th className="py-3 px-4 text-white border-b text-left">Kepala Lab</th>
            <th className="py-3 px-4 text-white border-b text-left">Lokasi</th>
            <th className="py-3 px-4 text-white border-b text-left rounded-tr-lg">Kapasitas</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {isLoadingLabs && labsData.length === 0 ? <SkeletonRows columns={5} label="Memuat data lab..." /> : labsData.length > 0 ? (
            labsData.map((lab, index) => (
              <tr key={lab.lab_id || index} className="hover:bg-gray-50">
                <td className="py-3 px-4 text-sm text-gray-700">{index + 1}</td>
                <td className="py-3 px-4 text-sm text-gray-700">{lab.nama_lab}</td>
                <td className="py-3 px-4 text-sm text-gray-700">{lab.kepala_lab?.nama_lengkap || '-'}</td>
                <td className="py-3 px-4 text-sm text-gray-700">{lab.lokasi || '-'}</td>
                <td className="py-3 px-4 text-sm text-gray-700">{lab.kapasitas || 0}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="text-center py-4 text-gray-500">
                <p role={errorLabs ? "alert" : "status"}>{errorLabs || "Tidak ada data lab."}</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
</DashboardTablePanel>

        </div>
        <Footer />
      </div>
    </Dashboard>
  );
}

export default MainDashboard;
