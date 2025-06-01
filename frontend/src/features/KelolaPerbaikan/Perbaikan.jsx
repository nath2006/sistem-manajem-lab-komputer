// Perbaikan.jsx
// (Biasanya ditempatkan di folder seperti src/features/KelolaPerbaikan/Perbaikan.jsx)

import React, { useState, useEffect, useContext } from 'react';
import Dashboard from '../../Layouts/Dashboard';
import Tabel from '../../Layouts/Table';
import { FaEye, FaTrash, FaFilePen } from "react-icons/fa6";
import { get, deleteData } from '../../utils/api';
import { useLocation, useNavigate } from 'react-router-dom';
import Notification from '../../Components/Notification/Notif';
import useTitle from '../../utils/useTitle';
import { AuthContext } from '../../Context/AuthContext';
import DeleteConfirmation from '../../components/Notification/DeleteConfirmation';
import DetailPerbaikan from '../../Components/Perbaikan/DetailPerbaikan'; // ANDA PERLU MEMBUAT KOMPONEN INI
import EditPerbaikan from '../../Components/Perbaikan/EditPerbaikan';   // ANDA PERLU MEMBUAT KOMPONEN INI
import truncateText from '../../utils/truncateText';

const Perbaikan = () => {
  useTitle('Data Perbaikan Perangkat');
  const location = useLocation();
  const navigate = useNavigate();

  const [successMsg, setSuccessMsg] = useState(location.state?.successMsg || '');
  const [errorMsg, setErrorMsg] = useState(location.state?.errorMsg || '');
  const [data, setData] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const { state: authState } = useContext(AuthContext);
  const userRole = authState?.role;

  // Hak Akses (sesuaikan jika perlu)
  const canViewDetail = true; // Semua role yang bisa akses halaman ini bisa lihat detail
  const canEditPerbaikan = userRole === 'Admin' || userRole === 'Teknisi'; // Admin & Teknisi bisa edit perbaikan (misal update status atau catatan)
  const canDeletePerbaikan = userRole === 'Admin'; // Hanya Admin yang bisa hapus data perbaikan

  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
        if (location.state) {
          navigate(location.pathname, { replace: true });
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, errorMsg, location.state, location.pathname, navigate]);

  const fetchData = async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setIsInitialLoading(true);
    }
    try {
      const response = await get('/perbaikan'); // Endpoint API Anda
      if (response && Array.isArray(response.data)) {
        setData(response.data);
      } else {
        setData([]);
        console.warn("No data received from /perbaikan endpoint or unexpected response structure:", response);
        if (isInitialLoad) setErrorMsg("Data perbaikan tidak ditemukan atau format respons salah.");
      }
    } catch (err) {
      console.error("Error fetching perbaikan data:", err.response?.data || err.message || err);
      if (isInitialLoad) setErrorMsg('Gagal Mengambil Data Perbaikan. ' + (err.response?.data?.message || err.message || ''));
      setData([]);
    } finally {
      if (isInitialLoad) {
        setIsInitialLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData(true);
    const refreshIntervalTime = parseInt(import.meta.env.VITE_REFRESH_INTERVAL, 10) || 300000; // Refresh setiap 5 menit
    const intervalId = setInterval(() => {
      console.log("Refreshing perbaikan data in background...");
      fetchData(false);
    }, refreshIntervalTime);
    return () => clearInterval(intervalId);
  }, []);

  const handleOpenDetailModal = (id) => {
    setSelectedId(id);
    setShowDetailModal(true);
  };

  const handleOpenEditModal = (id) => {
    setSelectedId(id);
    setShowEditModal(true);
  };

  const handleDelete = DeleteConfirmation({
    onDelete: (id) => deleteData(`/perbaikan/delete/${id}`), // Sesuaikan dengan endpoint delete perbaikan Anda
    itemName: 'data perbaikan',
    onSuccess: (deletedId) => {
      setData(prevData => prevData.filter(item => item.perbaikan_id !== deletedId));
      setSuccessMsg('Data perbaikan berhasil dihapus');
    },
    onError: (error) => {
      console.error("Error deleting perbaikan:", error.response?.data || error.message || error);
      setErrorMsg('Gagal menghapus data perbaikan. ' + (error.response?.data?.message || error.message || ''));
    }
  });

  const headTable = [
    { judul: "ID Perbaikan" },
    { judul: "Teknisi" },
    { judul: "Perangkat Diperbaiki" },
    { judul: "Lab" },
    { judul: "Tgl Perbaikan" },
    { judul: "Tindakan" },
    { judul: "Hasil" },
    { judul: "Catatan" },
    { judul: "ID Pengecekan Asal" },
    { judul: "Aksi" }
  ];

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return dateString;
    }
    // Hanya tanggal, tanpa jam, karena di DDL tanggal_perbaikan adalah DATE
    const options = { year: 'numeric', month: 'long', day: 'numeric' }; 
    return date.toLocaleDateString('id-ID', options);
  };

  const renderPerbaikanRow = (item, index) => {
    return (
      <tr className="bg-white border-b hover:bg-gray-50" key={item.perbaikan_id || index}>
        <td className="px-6 py-4 text-gray-700 text-center">{item.perbaikan_id || '-'}</td>
        <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
          {item.nama_user || '-'} {/* Nama teknisi */}
        </th>
        <td className="px-6 py-4 text-gray-700">{item.nama_perangkat || (item.perangkat_id_snapshot ? `ID: ${item.perangkat_id_snapshot}` : 'N/A')}</td>
        <td className="px-6 py-4 text-gray-700">{item.nama_lab || '-'}</td>
        <td className="px-6 py-4 text-gray-700">{formatDate(item.tanggal_perbaikan)}</td>
        <td className="px-6 py-4 text-gray-700">{truncateText(item.tindakan, 30) || '-'}</td>
        <td className="px-6 py-4 text-gray-700">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                item.hasil_perbaikan === 'Berhasil' ? 'bg-green-100 text-green-800' :
                item.hasil_perbaikan === 'Gagal' ? 'bg-red-100 text-red-800' :
                item.hasil_perbaikan === 'Perlu Penggantian Komponen' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
            }`}>
                {item.hasil_perbaikan || 'N/A'}
            </span>
        </td>
        <td className="px-6 py-4 text-gray-700">{truncateText(item.catatan_tambahan, 25) || '-'}</td>
        <td className="px-6 py-4 text-gray-700 text-center">{item.pengecekan_id || 'N/A'}</td> {/* Akan NULL jika pengecekan dihapus */}
        <td className='px-6 py-4 text-center'>
          <div className='flex items-center justify-center space-x-1'>
            {canViewDetail && (
                <button
                onClick={() => handleOpenDetailModal(item.perbaikan_id)}
                className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-100 transition-colors duration-150"
                title="Lihat Detail Perbaikan"
                >
                <FaEye size={18} />
                </button>
            )}
            
            {canEditPerbaikan && ( // Teknisi & Admin bisa edit
              <button
                onClick={() => handleOpenEditModal(item.perbaikan_id)}
                className="p-2 text-yellow-500 hover:text-yellow-700 rounded-full hover:bg-yellow-100 transition-colors duration-150"
                title="Edit Data Perbaikan"
              >
                <FaFilePen size={17} />
              </button>
            )}

            {canDeletePerbaikan && ( // Hanya Admin yang bisa hapus
              <button
                onClick={() => handleDelete(item.perbaikan_id)}
                className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-100 transition-colors duration-150"
                title="Hapus Data Perbaikan"
              >
                <FaTrash size={17}/>
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <Dashboard title="Data Perbaikan Perangkat">
      <div className="flex flex-col justify-between w-full min-h-[calc(100vh-110px)] px-4 py-6 md:px-6 lg:px-8">
        {(successMsg && !errorMsg) && (
          <Notification type="success" message={successMsg} onClose={() => setSuccessMsg('')} />
        )}
        {errorMsg && (
          <Notification type="error" message={errorMsg} onClose={() => setErrorMsg('')} />
        )}

        <Tabel
          title="Riwayat Perbaikan Perangkat"
          breadcrumbContext={userRole}
          headers={headTable}
          // Tidak ada tombol "Tambah Perbaikan Baru" karena perbaikan dibuat dari Pengecekan
          to={null} 
          buttonText="" 
          data={data}
          itemsPerPage={10}
          renderRow={renderPerbaikanRow}
        >
          {isInitialLoading && (
            <tr>
              <td colSpan={headTable.length} className="text-center py-20 text-gray-500">
                <div className="flex flex-col justify-center items-center">
                  <svg className="animate-spin h-10 w-10 text-blue-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-lg">Memuat data perbaikan...</span>
                </div>
              </td>
            </tr>
          )}
          {!isInitialLoading && data.length === 0 && (
            <tr>
              <td colSpan={headTable.length} className="text-center py-20 text-gray-500 text-lg">
                Tidak ada data perbaikan yang ditemukan.
              </td>
            </tr>
          )}
        </Tabel>

        {/* Anda perlu membuat komponen DetailPerbaikan dan EditPerbaikan */}
        {showDetailModal && selectedId && 
            <DetailPerbaikan id={selectedId} onClose={() => setShowDetailModal(false)} />
        }
        {showEditModal && selectedId && canEditPerbaikan && 
            <EditPerbaikan id={selectedId} onClose={() => setShowEditModal(false)} onUpdate={() => fetchData(true)} />
        }
        
      </div>
    </Dashboard>
  );
}

export default Perbaikan;
