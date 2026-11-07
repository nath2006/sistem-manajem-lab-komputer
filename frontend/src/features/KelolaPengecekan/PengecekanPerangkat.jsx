import React, { useState, useEffect, useContext } from 'react';
import Dashboard from '../../Layouts/Dashboard';
import Tabel from '../../Layouts/Table';
import { FaEye, FaTrash, FaFilePen, FaScrewdriverWrench } from "react-icons/fa6";
import { get, deleteData } from '../../utils/api'; // 'post' tidak secara langsung digunakan di sini, tapi mungkin di BuatPerbaikanModal
import { useLocation, useNavigate } from 'react-router-dom';
import Notification from '../../Components/Notification/Notif';
import useTitle from '../../utils/useTitle';
import { AuthContext } from '../../Context/AuthContext';
import useDeletionDialog from '../../Components/Deletion/useDeletionDialog';
import DetailPengecekan from '../../Components/Pengecekan/DetailPengecekan'; // Pastikan path ini benar
import EditPengecekan from '../../Components/Pengecekan/EditPengecekan';   // Pastikan path ini benar
import truncateText from '../../utils/truncateText';
import BuatPerbaikanModal from '../../Components/Perbaikan/AddPerbaikan'; // Pastikan path ini benar

import AddPengecekan from '../../Components/Pengecekan/AddPengecekan';

const Pengecekan = () => {
  useTitle('Data Pengecekan Perangkat'); // Judul lebih deskriptif
  const location = useLocation();
  const navigate = useNavigate();

  const [successMsg, setSuccessMsg] = useState(location.state?.successMsg || '');
  const [errorMsg, setErrorMsg] = useState(location.state?.errorMsg || '');
  const [showHistory, setShowHistory] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [data, setData] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedPengecekanUntukPerbaikan, setSelectedPengecekanUntukPerbaikan] = useState(null);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBuatPerbaikanModal, setShowBuatPerbaikanModal] = useState(false);

  const { state: authState } = useContext(AuthContext);
  const userRole = authState?.role;
  const loggedInUserId = authState?.userId;

  // --- Penyesuaian Hak Akses ---
  const canViewDetail = true; // Semua role yang masuk halaman ini bisa lihat detail
  const canEditPengecekan = userRole === 'Admin';
  const canDeletePengecekan = false; // Temuan dipertahankan sebagai riwayat.
  const canInitiatePerbaikan = userRole === 'Admin' || userRole === 'Teknisi'; // Admin & Teknisi bisa buat perbaikan
  const canAddPengecekan = userRole === 'Admin' || userRole === 'Teknisi'; // Hanya Admin yang bisa tambah data pengecekan baru

  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
        if (location.state && !location.state.deletionContext) {
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
      const response = await get('/pengecekan'); // Endpoint API Anda untuk mengambil semua data pengecekan
      if (response && Array.isArray(response.data)) {
        setData(response.data);
      } else {
        setData([]);
        console.warn("No data received from /pengecekan endpoint or unexpected response structure:", response);
        if (isInitialLoad) setErrorMsg("Data pengecekan tidak ditemukan atau format respons salah.");
      }
    } catch (err) {
      console.error("Error fetching pengecekan data:", err.response?.data || err.message || err);
      if (isInitialLoad) setErrorMsg('Gagal Mengambil Data Pengecekan. ' + (err.response?.data?.message || err.message || ''));
      setData([]);
    } finally {
      if (isInitialLoad) {
        setIsInitialLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData(true);
    const refreshIntervalTime = parseInt(import.meta.env.VITE_REFRESH_INTERVAL, 10) || 300000;
    const intervalId = setInterval(() => {
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

  const handleOpenBuatPerbaikanModal = (pengecekanItem) => {
    setSelectedPengecekanUntukPerbaikan(pengecekanItem);
    setShowBuatPerbaikanModal(true);
  };

  const {requestDeletion:handleDelete,dialog:deletionDialog} = useDeletionDialog({
    resource: 'pengecekan',
    onDelete: (id) => deleteData(`/pengecekan/delete/${id}`), // Endpoint untuk menghapus pengecekan
    itemName: 'data pengecekan',
    onSuccess: (deletedId) => {
      setData(prevData => prevData.filter(item => item.pengecekan_id !== deletedId));
      setSuccessMsg('Data pengecekan berhasil dihapus');
    },
    onError: (error) => {
      console.error("Error deleting pengecekan:", error.response?.data || error.message || error);
      setErrorMsg('Gagal menghapus data pengecekan. ' + (error.response?.data?.message || error.message || ''));
    }
  });

  const handlePerbaikanCreated = (createdPerbaikanData) => {
    setSuccessMsg(createdPerbaikanData.message || 'Data perbaikan berhasil dibuat, data pengecekan terkait telah diproses.');
    fetchData(true);
    setShowBuatPerbaikanModal(false);
  };

  const headTable = [
    { judul: "ID Cek" },
    { judul: "Nama User (Pengecek)" },
    { judul: "Nama Perangkat" },
    { judul: "Lab" },
    { judul: "Tanggal Cek" },
    { judul: "Kerusakan" },
    { judul: "Status Cek" },
    { judul: "Aksi" }
  ];

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return dateString;
    }
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('id-ID', options);
  };

  const renderPengecekanRow = (item, index) => {
    return (
      <tr className="bg-white border-b hover:bg-gray-50" key={item.pengecekan_id || index}>
        <td className="px-6 py-4 text-gray-700 text-center">{item.pengecekan_id || '-'}</td>
        <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
          {item.nama_user_pengecek || item.nama_user || '-'}
        </th>
        <td className="px-6 py-4 text-gray-700">{item.nama_perangkat || '-'}</td>
        <td className="px-6 py-4 text-gray-700">{item.nama_lab || '-'}</td>
        <td className="px-6 py-4 text-gray-700">{formatDate(item.tanggal_pengecekan)}</td>
        <td className="px-6 py-4 text-gray-700">{truncateText(item.ditemukan_kerusakan, 30) || '-'}</td>
        <td className="px-6 py-4 text-gray-700">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                item.status_pengecekan === 'Baru' ? 'bg-yellow-100 text-yellow-800' :
                item.status_pengecekan === 'Menunggu Perbaikan' ? 'bg-orange-100 text-orange-800' :
                item.status_pengecekan === 'Sudah Ditangani' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
            }`}>
                {item.status_pengecekan || 'N/A'}
            </span>
        </td>
        <td className='px-6 py-4 text-center'>
          <div className='flex items-center justify-center space-x-1'>
            {canViewDetail && (
                <button
                onClick={() => handleOpenDetailModal(item.pengecekan_id)}
                className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-100 transition-colors duration-150"
                title="Lihat Detail"
                >
                <FaEye size={18} />
                </button>
            )}
            
            {canEditPengecekan && (item.status_pengecekan === 'Baru' || item.status_pengecekan === 'Menunggu Perbaikan') && (
              <button
                onClick={() => handleOpenEditModal(item.pengecekan_id)}
                className="p-2 text-yellow-500 hover:text-yellow-700 rounded-full hover:bg-yellow-100 transition-colors duration-150"
                title="Edit Data Pengecekan"
              >
                <FaFilePen size={17} />
              </button>
            )}

            {canDeletePengecekan && item.status_pengecekan === 'Baru' && ( 
              <button
                onClick={() => handleDelete(item.pengecekan_id)}
                className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-100 transition-colors duration-150"
                title="Hapus Data Pengecekan"
              >
                <FaTrash size={17}/>
              </button>
            )}
            
            {canInitiatePerbaikan && (item.status_pengecekan === 'Baru' || item.status_pengecekan === 'Menunggu Perbaikan') && (
                <button
                    onClick={() => handleOpenBuatPerbaikanModal(item)}
                    className="p-2 text-green-600 hover:text-green-800 rounded-full hover:bg-green-100 transition-colors duration-150"
                    title="Buat Data Perbaikan"
                >
                    <FaScrewdriverWrench size={18} />
                </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <Dashboard title="Data Pengecekan Perangkat">
      <div className="">
        {(successMsg && !errorMsg) && (
          <Notification type="success" message={successMsg} onClose={() => setSuccessMsg('')} />
        )}
        {errorMsg && (
          <Notification type="error" message={errorMsg} onClose={() => setErrorMsg('')} />
        )}

        <div className="mb-4 flex flex-wrap gap-3">
          <button className={`rounded-md border px-4 py-2 text-sm ${!showHistory ? 'bg-maroon hover:bg-maroon/90 text-white' : 'bg-white'}`} onClick={() => setShowHistory(false)}>Antrian Aktif</button>
          <button className={`rounded-md border px-4 py-2 text-sm ${showHistory ? 'bg-maroon hover:bg-maroon/90 text-white' : 'bg-white'}`} onClick={() => setShowHistory(true)}>Riwayat Selesai</button>
          {canAddPengecekan && <button className="rounded-md border bg-white px-4 py-2 text-sm" onClick={() => setShowAdd(true)}>Troubleshoot Baru</button>}
          <button className="rounded-md border bg-white px-4 py-2 text-sm" onClick={() => fetchData(true)}>Muat Ulang</button>
        </div>
        <Tabel
          isLoading={isInitialLoading}
          title="Data Pengecekan Perangkat"
          breadcrumbContext={userRole}
          headers={headTable}
          // Tombol "Tambah Pengecekan Baru" hanya muncul untuk Admin
          to={null} 
          buttonText={canAddPengecekan ? "Tambah Pengecekan Baru" : ""} // Kosongkan teks jika tidak ada tombol
          data={data.filter(item => showHistory ? item.status_pengecekan === 'Sudah Ditangani' : item.status_pengecekan !== 'Sudah Ditangani')}
          itemsPerPage={10}
          renderRow={renderPengecekanRow}
        />

        {showAdd && <AddPengecekan onClose={() => setShowAdd(false)} onSuccess={() => { setSuccessMsg('Temuan baru masuk antrian teknisi.'); fetchData(true); }} />}
        {showDetailModal && selectedId && <DetailPengecekan id={selectedId} onClose={() => setShowDetailModal(false)} />}
        {showEditModal && selectedId && canEditPengecekan && <EditPengecekan id={selectedId} onClose={() => setShowEditModal(false)} onUpdate={() => fetchData(true)} />}
        
        {showBuatPerbaikanModal && selectedPengecekanUntukPerbaikan && canInitiatePerbaikan && (
          <BuatPerbaikanModal
            pengecekanData={selectedPengecekanUntukPerbaikan}
            loggedInUserId={loggedInUserId}
            onClose={() => setShowBuatPerbaikanModal(false)}
            onSuccess={handlePerbaikanCreated}
          />
        )}
      </div>
      {deletionDialog}
    </Dashboard>
  );
}

export default Pengecekan;
