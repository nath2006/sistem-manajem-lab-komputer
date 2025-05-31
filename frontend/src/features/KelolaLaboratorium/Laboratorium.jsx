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
import DetailLaboratorium from '../../Components/DataLab/DetailLaboratorium';
import EditLaboratorium from '../../Components/DataLab/EditLaboratorium';
import truncateText from '../../utils/truncateText';

const Lab = () => {
  useTitle('Kelola Data Laboratorium');
  const location = useLocation();
  const navigate = useNavigate();

  const [successMsg, setSuccessMsg] = useState(location.state?.successMsg || '');
  const [errorMsg, setErrorMsg] = useState(location.state?.errorMsg || '');
  const [data, setData] = useState([]);
  // Mengganti isLoading menjadi isInitialLoading untuk pemuatan data pertama kali
  const [isInitialLoading, setIsInitialLoading] = useState(true); 
  const [selectedId, setSelectedId] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const { state: authState } = useContext(AuthContext); // Menggunakan alias untuk 'state'
  const userRole = authState?.role;

  // Logika isAuthorized tetap sama
  const isAuthorized = userRole === 'Admin' || userRole === 'Koordinator Lab';

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

  const handleOpenDetailModal = (id) => {
    setSelectedId(id);
    setShowDetailModal(true);
  };

  const handleOpenEditModal = (id) => {
    setSelectedId(id);
    setShowEditModal(true);
  };

  const handleDelete = DeleteConfirmation({
    onDelete: (id) => deleteData(`/lab/delete/${id}`),
    itemName: 'data laboratorium',
    onSuccess: (deletedId) => {
      setData(prevData => prevData.filter(item => item.lab_id !== deletedId));
      setSuccessMsg('Data laboratorium berhasil dihapus');
      // Opsional: panggil fetchData(true) jika ingin ada loading spinner setelah delete
      // fetchData(true); 
    },
    onError: (error) => {
      console.error("Error deleting laboratorium:", error.response?.data || error.message || error);
      setErrorMsg('Gagal menghapus data laboratorium. ' + (error.response?.data?.message || error.message || ''));
    }
  });

  const headTable = [
    { judul: "Foto Lab" },
    { judul: "Nama Lab" },
    { judul: "Lokasi" },
    { judul: "Kapasitas" },
    { judul: "Kepala Lab" },
    { judul: "Status" },
    { judul: "Deskripsi Singkat" },
    { judul: "Aksi" }
  ];

  // Modifikasi fetchData untuk menerima parameter isInitialLoad
  const fetchData = async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setIsInitialLoading(true); // Hanya set loading untuk pemuatan awal
    }
    // Tidak set setIsLoading(true) untuk background refresh agar tidak berkedip
    try {
      const response = await get('/lab');
      if (response && Array.isArray(response.data)) {
        setData(response.data);
        // console.log("Fetched Lab Data:", response.data); // Bisa diaktifkan untuk debug
      } else {
        setData([]);
        console.warn("No data received from /lab endpoint or unexpected response structure:", response);
        if (isInitialLoad) setErrorMsg("Data laboratorium tidak ditemukan atau format respons salah.");
      }
    } catch (err) {
      console.error("Error fetching laboratorium data:", err.response?.data || err.message || err);
      if (isInitialLoad) setErrorMsg('Gagal Mengambil Data Laboratorium. ' + (err.response?.data?.message || err.message || ''));
      setData([]);
    } finally {
      if (isInitialLoad) {
        setIsInitialLoading(false); // Hanya set false untuk pemuatan awal
      }
    }
  };

  useEffect(() => {
    fetchData(true); // Panggilan awal, tandai sebagai isInitialLoad=true

    const refreshIntervalTime = parseInt(import.meta.env.VITE_REFRESH_INTERVAL, 10) || 300000; // Default 5 menit

    const intervalId = setInterval(() => {
      console.log("Refreshing lab data in background...");
      fetchData(false); // Panggilan refresh (bukan initial load)
    }, refreshIntervalTime);

    return () => clearInterval(intervalId); // Bersihkan interval saat komponen unmount
  }, []); // Dependensi kosong agar hanya berjalan sekali

  const renderLabRow = (item, index) => {
    const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL || 'http://localhost:5500';
    const LAB_IMAGE_SUBFOLDER = '/uploads/labs/';

    return (
      <tr className="bg-white border-b hover:bg-gray-50" key={item.lab_id || index}>
        <td className="px-6 py-4">
          {item.foto_lab ? (
            <img
              src={`${ASSET_BASE_URL}${LAB_IMAGE_SUBFOLDER}${item.foto_lab}?t=${Date.now()}`}
              alt={`Foto ${item.nama_lab}`}
              className="w-16 h-16 object-cover rounded-md shadow-sm"
              onError={(e) => { 
                e.target.onerror = null; 
                e.target.src = 'https://via.placeholder.com/64x64?text=No+Image'; // Teks placeholder lebih baik
                e.target.alt = 'Gagal memuat gambar';
              }}
            />
          ) : (
            <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center text-gray-500 text-xs">
              No Img
            </div>
          )}
        </td>
        <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
          {item.nama_lab || '-'}
        </th>
        <td className="px-6 py-4 text-gray-700">{item.lokasi || '-'}</td>
        <td className="px-6 py-4 text-gray-700 text-center">{item.kapasitas || 0}</td>
        <td className="px-6 py-4 text-gray-700 whitespace-nowrap"> 
          {item.kepala_lab?.nama_lengkap || 'Belum Ditentukan'} 
        </td>
        <td className="px-6 py-4">
          <span className={`px-2.5 py-1.5 rounded-full text-xs font-semibold ${
            item.status === 'Tersedia' ? 'bg-green-100 text-green-800' :
            item.status === 'Pemeliharaan' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800' // Untuk 'Tidak Tersedia' atau status lain
          }`}>
            {item.status || 'N/A'}
          </span>
        </td>
        <td className="px-6 py-4 text-gray-700">{truncateText(item.deskripsi, 30) || '-'}</td>
        <td className='px-6 py-4 text-center'>
          <div className='flex items-center justify-center space-x-2'>
            <button 
              onClick={() => handleOpenDetailModal(item.lab_id)} 
              className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-100 transition-colors duration-150"
              title="Lihat Detail"
            >
              <FaEye size={18} />
            </button>
            {isAuthorized && ( // Logika isAuthorized tetap sama
              <>
                <button 
                  onClick={() => handleOpenEditModal(item.lab_id)} 
                  className="p-2 text-red-600 hover:text-red-8000 rounded-full hover:bg-red-100 transition-colors duration-150"
                  title="Edit Data"
                >
                  <FaFilePen size={17} />
                </button>
                <button
                  onClick={() => handleDelete(item.lab_id)}
                  className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-100 transition-colors duration-150"
                  title="Hapus Data"
                >
                  <FaTrash size={17}/>
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <Dashboard title="Kelola Data Laboratorium">
      <div className="flex flex-col justify-between w-full min-h-[calc(100vh-110px)] px-4 py-6 md:px-6 lg:px-8">
        {(successMsg && !errorMsg) && (
          <Notification type="success" message={successMsg} onClose={() => setSuccessMsg('')} />
        )}
        {errorMsg && (
          <Notification type="error" message={errorMsg} onClose={() => setErrorMsg('')} />
        )}
        
        <Tabel
          title="Data Laboratorium"
          breadcrumbContext={userRole}
          headers={headTable}
          to={isAuthorized ? "/app/data-master/lab/add" : null} // Ganti path "to" sesuai kebutuhan
          buttonText="Tambah Lab Baru"
          data={data} // Data tetap dikirim, loading dihandle di children
          itemsPerPage={10}
          renderRow={renderLabRow}
          //isLoading={isInitialLoading} // Prop ini bisa dihapus jika Tabel tidak menggunakannya secara internal
                                         // dan loading dihandle oleh children seperti di bawah
        > 
          {/* Children untuk menangani loading dan data kosong */}
          {isInitialLoading && (
            <tr>
              <td colSpan={headTable.length} className="text-center py-20 text-gray-500">
                <div className="flex flex-col justify-center items-center">
                  <svg className="animate-spin h-10 w-10 text-blue-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-lg">Memuat data laboratorium...</span>
                </div>
              </td>
            </tr>
          )}
         {!isInitialLoading && data.length === 0 && (
            <tr>
                <td colSpan={headTable.length} className="text-center py-20 text-gray-500 text-lg">
                    Tidak ada data laboratorium yang ditemukan.
                </td>
            </tr>
         )}
        </Tabel>

        {showDetailModal && <DetailLaboratorium id={selectedId} onClose={() => setShowDetailModal(false)} />}
        {/* Saat update selesai, panggil fetchData(true) agar ada indikator loading */}
        {showEditModal && <EditLaboratorium id={selectedId} onClose={() => setShowEditModal(false)} onUpdate={() => fetchData(true)} />}
      </div>
    </Dashboard>
  );
}

export default Lab;
