// MainDashboard.js (atau nama file yang Anda inginkan untuk dashboard utama ini)
import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../Context/AuthContext';
import Dashboard from '../../Layouts/Dashboard';
import Footer from '../../components/Footer';
import Tabel from '../../Layouts/Table';
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
    } catch (err) {
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

  const headTableLabs = [
    { judul: "Foto" },
    { judul: "Nama Lab" },
    { judul: "Lokasi" },
    { judul: "Kepala Lab" },
    { judul: "Status" }
  ];

  const renderLabRowForDashboard = (item, index) => {
    const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL || 'http://localhost:5500';
    const LAB_IMAGE_SUBFOLDER = '/uploads/labs/';

    return (
      <tr className="bg-white border-b hover:bg-gray-50" key={item.lab_id || index}>
        <td className="px-4 py-3">
          {item.foto_lab ? (
            <img
              src={`${ASSET_BASE_URL}${LAB_IMAGE_SUBFOLDER}${item.foto_lab}`}
              alt={`Foto ${item.nama_lab}`}
              className="w-12 h-12 object-cover rounded shadow"
              onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/48x48?text=Err'; }}
            />
          ) : (
            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
              No Img
            </div>
          )}
        </td>
        <th scope="row" className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
          {item.nama_lab || '-'}
        </th>
        <td className="px-4 py-3 text-sm text-gray-700">{item.lokasi || '-'}</td>
        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap"> 
          {item.kepala_lab?.nama_lengkap || 'N/A'} 
        </td>
        <td className="px-4 py-3">
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
            item.status === 'Tersedia' ? 'bg-green-100 text-green-700' :
            item.status === 'Pemeliharaan' ? 'bg-yellow-100 text-yellow-700' :
            item.status === 'Tidak Tersedia' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {item.status || 'N/A'}
          </span>
        </td>
      </tr>
    );
  };

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
              <div 
                className="h-[70px] max-w-full bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg hover:shadow-xl hover:cursor-pointer transition-all duration-300 ease-in-out transform hover:-translate-y-1 active:translate-y-0"
                onClick={() => navigate('/add-pengumuman')}
              >
                <div className="flex justify-start items-center h-full mx-4 sm:mx-6">
                  <div className="p-3 bg-white/20 rounded-full mr-4">
                    <FaBullhorn size={20} className='text-white'/>
                  </div>
                  <h1 className="text-white text-md sm:text-lg font-semibold">Buat Pengumuman Baru</h1>
                </div>
              </div>
            </div>
          )}
<div className="mt-4 col-span-12 md:col-span-6 h-[500px] overflow-hidden group rounded-lg bg-white shadow-md relative transition-all duration-300 ease-in-out">
  <div className="DataWrapper">
    <div className="overflow-y-auto h-[calc(500px-80px)]">
      <table className="min-w-full">
        <thead className="bg-red-900 sticky top-0 z-10">
          <tr className="rounded-t-lg">
            <th className="py-3 px-4 text-white border-b text-left rounded-tl-lg">No</th>
            <th className="py-3 px-4 text-white border-b text-left">Nama Lab</th>
            <th className="py-3 px-4 text-white border-b text-left">Kepala Lab</th>
            <th className="py-3 px-4 text-white border-b text-left">Lokasi</th>
            <th className="py-3 px-4 text-white border-b text-left rounded-tr-lg">Kapasitas</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {labsData.length > 0 ? (
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
                Tidak ada data lab.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
</div>

        </div>
        <Footer />
      </div>
    </Dashboard>
  );
}

export default MainDashboard;
