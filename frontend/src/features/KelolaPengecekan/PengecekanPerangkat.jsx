import React, { useState, useEffect, useContext } from 'react';
import Dashboard from '../../Layouts/Dashboard';
import Tabel from '../../Layouts/Table';
import { FaEye, FaTrash, FaFilePen, FaScrewdriverWrench } from "react-icons/fa6"; // Tambah ikon untuk perbaikan
import { get, deleteData, post } from '../../utils/api'; // Asumsi 'post' ada untuk membuat perbaikan
import { useLocation, useNavigate } from 'react-router-dom';
import Notification from '../../Components/Notification/Notif';
import useTitle from '../../utils/useTitle';
import { AuthContext } from '../../Context/AuthContext';
import DeleteConfirmation from '../../components/Notification/DeleteConfirmation';
import DetailPengecekan from '../../Components/Pengecekan/DetailPengecekan';
import EditPengecekan from '../../Components/Pengecekan/EditPengecekan';
import truncateText from '../../utils/truncateText';

// Impor komponen Modal untuk Buat Perbaikan (Anda perlu membuatnya)
import BuatPerbaikanModal from '../../Components/Perbaikan/AddPerbaikan'; // SESUAIKAN PATH

const Pengecekan = () => {
  useTitle('Kelola Data Pengecekan');
  const location = useLocation();
  const navigate = useNavigate();

  const [successMsg, setSuccessMsg] = useState(location.state?.successMsg || '');
  const [errorMsg, setErrorMsg] = useState(location.state?.errorMsg || '');
  const [data, setData] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedPengecekanUntukPerbaikan, setSelectedPengecekanUntukPerbaikan] = useState(null); // Untuk data yang akan dikirim ke modal perbaikan

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBuatPerbaikanModal, setShowBuatPerbaikanModal] = useState(false); // State untuk modal perbaikan

  const { state: authState } = useContext(AuthContext);
  const userRole = authState?.role;
  const loggedInUserId = authState?.user?.user_id; // Ambil ID user yang login

  // Otorisasi: Admin, Koordinator Lab, Teknisi bisa mengelola pengecekan dan membuat perbaikan
  // Sesuaikan role ini jika Kepala Lab juga bisa membuat perbaikan dari pengecekan
  const isAuthorizedToManage = userRole === 'Admin' || userRole === 'Koordinator Lab' || userRole === 'Teknisi' || userRole === 'Kepala Lab';
  const canCreatePerbaikan = userRole === 'Admin' || userRole === 'Teknisi' || userRole === 'Kepala Lab'; // Siapa yang bisa klik tombol "Buat Perbaikan"

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
      const response = await get('/pengecekan');
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
      console.log("Refreshing pengecekan data in background...");
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
    setSelectedPengecekanUntukPerbaikan(pengecekanItem); // Kirim seluruh item pengecekan
    setShowBuatPerbaikanModal(true);
  };

  const handleDelete = DeleteConfirmation({
    onDelete: (id) => deleteData(`/pengecekan/${id}`), // Sesuaikan endpoint jika perlu (misal /pengecekan/delete/:id)
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

  // Fungsi yang akan dipanggil setelah perbaikan berhasil dibuat dari modal
  const handlePerbaikanCreated = (createdPerbaikanData) => {
    setSuccessMsg(createdPerbaikanData.message || 'Data perbaikan berhasil dibuat, data pengecekan terkait telah diproses.');
    // Karena data pengecekan asli akan dihapus oleh backend, kita fetch ulang data pengecekan
    fetchData(true); // true agar ada loading spinner
    setShowBuatPerbaikanModal(false);
  };


  const headTable = [
    { judul: "ID Cek" },
    { judul: "Nama User (Pengecek)" },
    { judul: "Nama Perangkat" },
    { judul: "Lab" }, // Tambah kolom Lab
    { judul: "Tanggal Cek" },
    { judul: "Kerusakan" },
    { judul: "Status Cek" }, // Tambah kolom Status Pengecekan
    { judul: "Aksi" }
  ];

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    // Cek apakah dateString sudah objek Date atau perlu di-parse
    const date = new Date(dateString);
    if (isNaN(date.getTime())) { // Invalid date
        return dateString; // Kembalikan string asli jika tidak valid
    }
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('id-ID', options);
  };

  const renderPengecekanRow = (item, index) => {
    return (
      <tr className="bg-white border-b hover:bg-gray-50" key={item.pengecekan_id || index}>
        <td className="px-6 py-4 text-gray-700 text-center">{item.pengecekan_id || '-'}</td>
        <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
          {item.nama_user_pengecek || item.nama_user || '-'} {/* Sesuaikan dengan field dari API Anda */}
        </th>
        <td className="px-6 py-4 text-gray-700">{item.nama_perangkat || '-'}</td>
        <td className="px-6 py-4 text-gray-700">{item.nama_lab || '-'}</td> {/* Data ini perlu ada dari API /pengecekan */}
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
          <div className='flex items-center justify-center space-x-1'> {/* Mengurangi space-x jika tombol banyak */}
            <button
              onClick={() => handleOpenDetailModal(item.pengecekan_id)}
              className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-100 transition-colors duration-150"
              title="Lihat Detail"
            >
              <FaEye size={18} />
            </button>
            {isAuthorizedToManage && ( // Menggunakan isAuthorizedToManage
              <>
                <button
                  onClick={() => handleOpenEditModal(item.pengecekan_id)}
                  className="p-2 text-yellow-500 hover:text-yellow-700 rounded-full hover:bg-yellow-100 transition-colors duration-150"
                  title="Edit Data Pengecekan"
                >
                  <FaFilePen size={17} />
                </button>
                <button
                  onClick={() => handleDelete(item.pengecekan_id)}
                  className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-100 transition-colors duration-150"
                  title="Hapus Data Pengecekan"
                >
                  <FaTrash size={17}/>
                </button>
              </>
            )}
            {/* Tombol Buat Perbaikan hanya muncul jika statusnya memungkinkan dan user berhak */}
            {canCreatePerbaikan && (item.status_pengecekan === 'Baru' || item.status_pengecekan === 'Menunggu Perbaikan') && (
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
    <Dashboard title="Kelola Data Pengecekan">
      <div className="flex flex-col justify-between w-full min-h-[calc(100vh-110px)] px-4 py-6 md:px-6 lg:px-8">
        {(successMsg && !errorMsg) && (
          <Notification type="success" message={successMsg} onClose={() => setSuccessMsg('')} />
        )}
        {errorMsg && (
          <Notification type="error" message={errorMsg} onClose={() => setErrorMsg('')} />
        )}

        <Tabel
          title="Data Pengecekan Perangkat"
          breadcrumbContext={userRole}
          headers={headTable}
          to={isAuthorizedToManage ? "/add-pengecekan" : null} // Link ke halaman tambah pengecekan
          buttonText="Tambah Pengecekan Baru"
          data={data}
          itemsPerPage={10}
          renderRow={renderPengecekanRow}
        >
          {isInitialLoading && (
            <tr>
              <td colSpan={headTable.length} className="text-center py-20 text-gray-500">
                <div className="flex flex-col justify-center items-center">
                  <svg className="animate-spin h-10 w-10 text-blue-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-lg">Memuat data pengecekan...</span>
                </div>
              </td>
            </tr>
          )}
          {!isInitialLoading && data.length === 0 && (
            <tr>
              <td colSpan={headTable.length} className="text-center py-20 text-gray-500 text-lg">
                Tidak ada data pengecekan yang ditemukan.
              </td>
            </tr>
          )}
        </Tabel>

        {showDetailModal && selectedId && <DetailPengecekan id={selectedId} onClose={() => setShowDetailModal(false)} />}
        {showEditModal && selectedId && <EditPengecekan id={selectedId} onClose={() => setShowEditModal(false)} onUpdate={() => fetchData(true)} />}
        
        {/* Modal untuk Buat Perbaikan */}
        {showBuatPerbaikanModal && selectedPengecekanUntukPerbaikan && (
          <BuatPerbaikanModal
            pengecekanData={selectedPengecekanUntukPerbaikan} // Kirim data pengecekan yang dipilih
            loggedInUserId={loggedInUserId} // Kirim ID user yang login (untuk field user_id di perbaikan)
            onClose={() => setShowBuatPerbaikanModal(false)}
            onSuccess={handlePerbaikanCreated} // Callback setelah perbaikan sukses dibuat
          />
        )}
      </div>
    </Dashboard>
  );
}

export default Pengecekan;
