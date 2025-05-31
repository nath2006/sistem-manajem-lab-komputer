import React, { useState, useEffect, useContext } from 'react';
import Dashboard from '../../Layouts/Dashboard';
import Tabel from '../../Layouts/Table'; // Pastikan path ini benar
import { FaEye, FaTrash, FaFilePen } from "react-icons/fa6";
import { get, deleteData } from '../../utils/api'; 
import { useLocation, useNavigate } from 'react-router-dom'; 
import Notification from '../../Components/Notification/Notif'; // Pastikan path ini benar
import useTitle from '../../utils/useTitle';
import { AuthContext } from '../../Context/AuthContext';
import DeleteConfirmation from '../../components/Notification/DeleteConfirmation'; // Pastikan path ini benar
// GANTI NAMA KOMPONEN DETAIL DAN EDIT SESUAI FUNGSINYA
import DetailLaboratorium from '../../Components/DataLab/DetailLaboratorium'; // Sesuaikan path dan nama jika perlu
import EditLaboratorium from '../../Components/DataLab/EditLaboratorium';   // Sesuaikan path dan nama jika perlu
import truncateText from '../../utils/truncateText'; // Anda mungkin tidak butuh ini untuk semua field lab
// formatDate mungkin tidak terlalu relevan untuk data lab utama, kecuali ada timestamp lain

const Lab = () => {
  useTitle('Kelola Data Laboratorium'); // Judul disesuaikan
  const location = useLocation();
  const navigate = useNavigate();
  const [successMsg, setSuccessMsg] = useState(location.state?.successMsg);
  const [errorMsg, setErrorMsg] = useState(location.state?.errorMsg);
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false); // Diubah agar lebih jelas
  const [showEditModal, setShowEditModal] = useState(false);
  
  const { state } = useContext(AuthContext);
  const userRole = state?.role;

  // Sesuaikan role yang berhak melakukan aksi
  const isAuthorized = userRole === 'Admin' || userRole === 'Koordinator Lab' || userRole === 'Kepala Lab';

  useEffect(() => {
    const timer = setTimeout(() => {
      setSuccessMsg('');
      setErrorMsg('');
    }, 3000); // Durasi notifikasi bisa disesuaikan
    return () => clearTimeout(timer);
  }, [successMsg, errorMsg]);

  const handleOpenDetailModal = (id) => {
    setSelectedId(id);
    setShowDetailModal(true);
  };

  const handleOpenEditModal = (id) => {
    setSelectedId(id);
    setShowEditModal(true);
  };

  const handleDelete = DeleteConfirmation({
    onDelete: (id) => deleteData(`/lab/delete/${id}`), // Endpoint untuk hapus lab
    itemName: 'data laboratorium',                    // Nama item
    onSuccess: (deletedId) => {
      setData(prevData => prevData.filter(item => item.lab_id !== deletedId)); // Filter berdasarkan lab_id
      setSuccessMsg('Data laboratorium berhasil dihapus');
    },
    onError: (error) => {
      console.error("Error deleting laboratorium:", error);
      setErrorMsg('Gagal menghapus data laboratorium. ' + (error.message || ''));
    }
  });

  // Sesuaikan header tabel dengan field data laboratorium
  const headTable = [
    { judul: "Foto Lab" },
    { judul: "Nama Lab" },
    { judul: "Lokasi" },
    { judul: "Kapasitas" },
    { judul: "Status" },
    // { judul: "Kepala Lab" }, // Anda perlu join di backend untuk menampilkan nama
    { judul: "Deskripsi Singkat" },
    { judul: "Aksi" }
  ];

  const fetchData = async () => {
    setIsLoading(true); // Set loading true di awal fetch
    try {
      const response = await get('/lab'); // Endpoint untuk mengambil data lab
      if (response && response.data) {
        setData(response.data);
      } else {
        setData([]); // Set data kosong jika tidak ada data atau respons tidak sesuai
        console.warn("No data received from /lab endpoint or unexpected response structure.");
      }
    } catch (err) {
      console.error("Error fetching laboratorium data:", err);
      setErrorMsg('Gagal Mengambil Data Laboratorium. ' + (err.message || ''));
      setData([]); // Set data kosong jika terjadi error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Logika refresh interval bisa dipertimbangkan ulang apakah diperlukan untuk data lab
    // const refreshInterval = parseInt(import.meta.env.VITE_REFRESH_INTERVAL, 10) || 300000; // Misal 5 menit
    // const refreshData = setInterval(fetchData, refreshInterval);
    // return () => clearInterval(refreshData);
  }, []); // Hanya fetch sekali saat komponen mount

  const renderLabRow = (item, index) => {
    // Sesuaikan ASSET_BASE_URL dan path subfolder untuk foto lab
    const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL || 'http://localhost:5500'; // Port sesuai server Anda
    const LAB_IMAGE_SUBFOLDER = '/uploads/labs/'; // Sesuaikan dengan struktur folder di backend

    return (
      <tr className="bg-white border-b hover:bg-gray-50" key={item.lab_id || index}>
        <td className="px-6 py-4">
          {item.foto_lab ? (
            <img
              src={`${ASSET_BASE_URL}${LAB_IMAGE_SUBFOLDER}${item.foto_lab}`}
              alt={`Foto ${item.nama_lab}`}
              className="w-16 h-16 object-cover rounded-md shadow-sm" // Ukuran kecil, rounded, dengan shadow
              onError={(e) => { e.target.style.display = 'none'; /* Sembunyikan jika error load */ }}
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
        <td className="px-6 py-4">
          <span className={`px-2.5 py-1.5 rounded-full text-xs font-semibold ${
            item.status === 'Tersedia' ? 'bg-green-100 text-green-800' :
            item.status === 'Pemeliharaan' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800' // Tidak Tersedia atau status lain
          }`}>
            {item.status || 'Tidak Diketahui'}
          </span>
        </td>
        {/* <td className="px-6 py-4 text-gray-700">{item.kepala_lab_nama || 'Belum Ditentukan'}</td> */}
        <td className="px-6 py-4 text-gray-700">{truncateText(item.deskripsi, 40) || '-'}</td>
        <td className='px-6 py-4 text-center'>
          <div className='flex items-center justify-center space-x-2'> {/* Menggunakan space-x untuk jarak antar tombol */}
            <button 
              onClick={() => handleOpenDetailModal(item.lab_id)} 
              className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-100 transition-colors duration-150"
              title="Lihat Detail"
            >
              <FaEye size={18} />
            </button>
            {isAuthorized && (
              <>
                <button 
                  onClick={() => handleOpenEditModal(item.lab_id)} 
                  className="p-2 text-yellow-500 hover:text-yellow-700 rounded-full hover:bg-yellow-100 transition-colors duration-150"
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
      <div className="flex flex-col justify-between w-full min-h-[calc(100vh-110px)]"> {/* Sedikit penyesuaian tinggi */}
        {successMsg && (
          <Notification type="success" message={successMsg} onClose={() => setSuccessMsg('')} />
        )}
        {errorMsg && (
          <Notification type="error" message={errorMsg} onClose={() => setErrorMsg('')} />
        )}
        
        <Tabel
          title="Data Laboratorium" // Judul tabel disesuaikan
          breadcrumbContext={userRole} // Ini bisa Anda sesuaikan atau hapus jika tidak relevan
          headers={headTable}
          to={isAuthorized ? "/add-lab" : null} // Hanya tampilkan tombol Tambah jika berwenang
          buttonText="Tambah Lab Baru"    // Teks tombol tambah
          data={isLoading ? [] : data}
          itemsPerPage={5}
          renderRow={renderLabRow} // Menggunakan renderLabRow
          isLoading={isLoading} // Prop untuk loading di komponen Tabel (jika ada)
          // Jika komponen Tabel Anda tidak punya prop isLoading, bagian loading di bawah ini cukup
        > 
          {isLoading && ( // Ini akan ditampilkan di dalam tbody jika isLoading true
            <tr>
              <td colSpan={headTable.length} className="text-center py-10 text-gray-500">
                <div className="flex justify-center items-center">
                  {/* Anda bisa menambahkan spinner di sini */}
                  <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="ml-3 text-lg">Memuat data...</span>
                </div>
              </td>
            </tr>
          )}
         {!isLoading && data.length === 0 && ( // Tampilkan jika tidak loading dan tidak ada data
            <tr>
                <td colSpan={headTable.length} className="text-center py-10 text-gray-500 text-lg">
                    Tidak ada data laboratorium yang ditemukan.
                </td>
            </tr>
         )}
        </Tabel>

        {showDetailModal && <DetailLaboratorium id={selectedId} onClose={() => setShowDetailModal(false)} />}
        {showEditModal && <EditLaboratorium id={selectedId} onClose={() => setShowEditModal(false)} onUpdate={fetchData} />}
      </div>
    </Dashboard>
  );
}

export default Lab;
