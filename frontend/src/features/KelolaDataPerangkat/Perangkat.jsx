// Perangkat.jsx
import React, { useState, useEffect, useContext } from 'react';
import Dashboard from '../../Layouts/Dashboard';
import Tabel from '../../Layouts/Table';
import { FaEye, FaTrash, FaFilePen, FaPlus } from "react-icons/fa6"; // FaFilter tidak digunakan, FaPlus untuk tambah
import { get, deleteData } from '../../utils/api';
import { useLocation, useNavigate } from 'react-router-dom';
import Notification from '../../Components/Notification/Notif';
import useTitle from '../../utils/useTitle';
import { AuthContext } from '../../Context/AuthContext';
import DeleteConfirmation from '../../components/Notification/DeleteConfirmation';

import DetailPerangkat from '../../Components/Perangkat/DetailPerangkat';
import EditPerangkat from '../../Components/Perangkat/EditPerangkat';
import AddPerangkat from '../../Components/Perangkat/AddPerangkat';
import truncateText from '../../utils/truncateText';

const Perangkat = () => {
  useTitle('Kelola Data Perangkat');
  const location = useLocation();
  const navigate = useNavigate();

  const { state: authState } = useContext(AuthContext);
  const userRole = authState?.role;
  const kepalaLabAssignedLabId = authState?.user?.lab_id_kepala; 

  const [successMsg, setSuccessMsg] = useState(location.state?.successMsg || '');
  const [errorMsg, setErrorMsg] = useState(location.state?.errorMsg || '');
  
  const [allLabs, setAllLabs] = useState([]); 
  const [selectedLabId, setSelectedLabId] = useState(''); 
  
  const [dataPerangkat, setDataPerangkat] = useState([]); 
  const [isLoading, setIsLoading] = useState(true); 
  
  const [selectedPerangkatId, setSelectedPerangkatId] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const isAdmin = userRole === 'Admin';
  const isKepalaLab = userRole === 'Kepala Lab';
  const canManagePerangkat = isAdmin || isKepalaLab; 

  useEffect(() => {
    const fetchLabs = async () => {
      // Hanya Admin yang perlu fetch semua lab untuk dropdown filter
      if (isAdmin) {
        setIsLoading(true); // Set loading true di awal fetchLabs untuk Admin
        try {
          const response = await get('/lab');
          if (response.data && Array.isArray(response.data)) {
            setAllLabs(response.data);
          } else {
            setAllLabs([]);
            setErrorMsg("Gagal memuat daftar laboratorium.");
          }
        } catch (err) {
          console.error("Error fetching labs for admin:", err);
          setErrorMsg("Gagal memuat daftar laboratorium.");
          setAllLabs([]);
        } 
        // Jangan set setIsLoading(false) di sini agar fetchPerangkatData yang mengontrolnya
      } else if (isKepalaLab) {
        if (kepalaLabAssignedLabId) {
          setSelectedLabId(kepalaLabAssignedLabId.toString());
          // Untuk Kepala Lab, kita juga bisa fetch nama lab spesifiknya jika diperlukan untuk tampilan
          // Tapi karena data perangkat akan di-fetch dan punya nama_lab, mungkin tidak perlu fetch lab terpisah.
        } else {
          console.warn("ID Lab untuk Kepala Lab tidak ditemukan.");
          setErrorMsg("Informasi lab untuk Kepala Lab tidak ditemukan.");
          setIsLoading(false); // Set loading false jika KaLab tidak punya info lab
        }
      } else {
          // Untuk role lain (misal Teknisi yang mungkin hanya view), kita langsung fetch semua perangkat
          // Untuk saat ini, kita asumsikan role lain tidak masuk halaman ini atau punya logika berbeda
          // setIsLoading(false); // Jika ada, akan dihandle oleh fetchPerangkatData
      }
    };
    fetchLabs();
  }, [isAdmin, isKepalaLab, kepalaLabAssignedLabId]); // Hanya bergantung pada role


  // Fetch data perangkat
  useEffect(() => {
    const fetchPerangkatData = async () => {
      setIsLoading(true); // Selalu set loading true di awal fetch perangkat
      setDataPerangkat([]); // Kosongkan data sebelumnya agar tidak ada flicker data lama
      setErrorMsg(''); // Reset error

      try {
        let perangkatToDisplay = [];
        const response = await get('/perangkat'); // Selalu fetch semua perangkat

        if (response.data && Array.isArray(response.data)) {
          if (isAdmin) {
            if (selectedLabId) { // Jika Admin sudah memilih lab, filter
              perangkatToDisplay = response.data.filter(p => p.lab_id.toString() === selectedLabId);
            } else { // Jika Admin belum memilih lab, tampilkan SEMUA perangkat
              perangkatToDisplay = response.data;
            }
          } else if (isKepalaLab) {
            if (selectedLabId) { // Kepala Lab, filter berdasarkan lab yang diampu (selectedLabId sudah diset)
              perangkatToDisplay = response.data.filter(p => p.lab_id.toString() === selectedLabId);
            } else {
              // Seharusnya KaLab selalu punya selectedLabId dari useEffect fetchLabs
              // Jika tidak, tampilkan kosong atau error
              console.warn("Kepala Lab tidak memiliki selectedLabId untuk filter perangkat.");
              perangkatToDisplay = [];
            }
          } else {
            // Untuk role lain yang mungkin bisa lihat semua (misal Teknisi jika diizinkan)
            // perangkatToDisplay = response.data; 
            // Untuk saat ini, kita anggap hanya Admin dan KaLab yang utama di sini
            perangkatToDisplay = [];
          }
          setDataPerangkat(perangkatToDisplay);
        } else {
          setErrorMsg("Data perangkat tidak ditemukan atau format respons salah.");
        }
      } catch (err) {
        console.error("Error fetching perangkat data:", err);
        setErrorMsg("Gagal mengambil data perangkat. " + (err.response?.data?.message || err.message || ''));
      } finally {
        setIsLoading(false);
      }
    };

    // Logika kapan harus fetch:
    // 1. Jika Admin (dropdown lab sudah dimuat atau selectedLabId berubah)
    // 2. Jika Kepala Lab dan ID labnya sudah teridentifikasi (selectedLabId sudah diset)
    if (isAdmin) {
        // Admin: fetch saat selectedLabId berubah (termasuk saat pertama kali "" atau dipilih)
        // atau saat komponen pertama kali mount (selectedLabId masih "") untuk load semua
        fetchPerangkatData();
    } else if (isKepalaLab && selectedLabId) {
        // Kepala Lab: fetch hanya jika selectedLabId (lab yg diampu) sudah ada
        fetchPerangkatData();
    } else if (isKepalaLab && !kepalaLabAssignedLabId) {
        // Jika KaLab, tapi ID lab tidak ada di context, jangan fetch & tampilkan error (sudah dihandle)
        setIsLoading(false);
        setDataPerangkat([]);
    } else if (!isAdmin && !isKepalaLab) {
        // Role lain, jika ada, mungkin punya logika fetch sendiri atau tidak fetch sama sekali
        // fetchPerangkatData(); // Jika Teknisi misal boleh lihat semua
        setIsLoading(false);
        setDataPerangkat([]);
    }
    
    // Setup refresh interval jika diperlukan
    // const refreshIntervalTime = parseInt(import.meta.env.VITE_REFRESH_INTERVAL, 10) || 300000;
    // const intervalId = setInterval(fetchPerangkatData, refreshIntervalTime);
    // return () => clearInterval(intervalId);

  }, [selectedLabId, isAdmin, isKepalaLab, kepalaLabAssignedLabId]); // Dependensi penting


  const handleLabChange = (e) => {
    setSelectedLabId(e.target.value); 
    // Tidak perlu setDataPerangkat([]) di sini, useEffect akan menangani re-fetch berdasarkan selectedLabId baru
  };

  const handleOpenDetailModal = (id) => {
    setSelectedPerangkatId(id);
    setShowDetailModal(true);
  };

  const handleOpenEditModal = (id) => {
    setSelectedPerangkatId(id);
    setShowEditModal(true);
  };
  
  const handleOpenAddModal = () => {
    if (isAdmin && !selectedLabId) { // Jika Admin, WAJIB pilih lab dulu
        alert("Admin: Silakan pilih laboratorium terlebih dahulu untuk menambahkan perangkat.");
        return;
    }
    // Untuk Kepala Lab, selectedLabId seharusnya sudah terisi otomatis dari lab yang diampunya
    if (isKepalaLab && !selectedLabId) {
        alert("Kepala Lab: Informasi lab Anda tidak ditemukan, tidak bisa menambah perangkat.");
        return;
    }
    setShowAddModal(true);
  };

  const handleDelete = DeleteConfirmation({
    onDelete: (id) => deleteData(`/perangkat/delete/${id}`),
    itemName: 'data perangkat',
    onSuccess: (deletedId) => {
      setDataPerangkat(prevData => prevData.filter(item => item.perangkat_id !== deletedId));
      setSuccessMsg('Data perangkat berhasil dihapus');
    },
    onError: (error) => setErrorMsg('Gagal menghapus data perangkat. ' + (error.response?.data?.message || error.message || ''))
  });

  const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL || 'http://localhost:5500';
  const PERANGKAT_IMAGE_SUBFOLDER = '/uploads/perangkat/';

  const headTable = [
    { judul: "Foto" },
    { judul: "No. Inventaris" },
    { judul: "Nama Perangkat" },
    { judul: "Lab" },
    { judul: "Status" },
    { judul: "Spesifikasi Singkat" },
    { judul: "Aksi" }
  ];

  const renderPerangkatRow = (item, index) => {
    return (
      <tr className="bg-white border-b hover:bg-gray-50" key={item.perangkat_id || index}>
        <td className="px-4 py-2">
          {item.foto_perangkat ? (
            <img
              src={`${ASSET_BASE_URL}${PERANGKAT_IMAGE_SUBFOLDER}${item.foto_perangkat}?t=${Date.now()}`}
              alt={item.nama_perangkat}
              className="w-12 h-12 object-cover rounded shadow-md"
              onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/48x48?text=Err';}}
            />
          ) : (
            <div className="w-12 h-12 bg-gray-200 rounded shadow-md flex items-center justify-center text-gray-400 text-xs">NoImg</div>
          )}
        </td>
        <td className="px-6 py-4 text-gray-700 text-sm whitespace-nowrap">{item.nomor_inventaris || '-'}</td>
        <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap text-sm">
          {item.nama_perangkat || '-'}
        </th>
        <td className="px-6 py-4 text-gray-700 text-sm">{item.nama_lab || '-'}</td>
        <td className="px-6 py-4 text-sm">
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                item.status === 'Baik' ? 'bg-green-100 text-green-800' :
                item.status === 'Rusak' ? 'bg-red-100 text-red-800' :
                item.status === 'Perlu Perbaikan' ? 'bg-yellow-100 text-yellow-800' :
                item.status === 'Dalam Perbaikan' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
            }`}>
                {item.status || 'N/A'}
            </span>
        </td>
        <td className="px-6 py-4 text-gray-700 text-sm">{truncateText(item.spesifikasi, 40) || '-'}</td>
        <td className='px-6 py-4 text-center'>
          <div className='flex items-center justify-center space-x-1'>
            <button
              onClick={() => handleOpenDetailModal(item.perangkat_id)}
              className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-100" title="Lihat Detail">
              <FaEye size={18} />
            </button>
            {canManagePerangkat && (
              <>
                <button
                  onClick={() => handleOpenEditModal(item.perangkat_id)}
                  className="p-2 text-yellow-500 hover:text-yellow-700 rounded-full hover:bg-yellow-100" title="Edit Data">
                  <FaFilePen size={17} />
                </button>
                <button
                  onClick={() => handleDelete(item.perangkat_id)}
                  className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-100" title="Hapus Data">
                  <FaTrash size={17}/>
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
    );
  }

  // Menentukan labId yang akan digunakan untuk AddPerangkat modal
  // Jika Admin, gunakan selectedLabId (yang harus sudah dipilih).
  // Jika Kepala Lab, gunakan kepalaLabAssignedLabId (lab yang diampunya).
  const labIdForAddModal = isAdmin ? selectedLabId : (isKepalaLab ? kepalaLabAssignedLabId?.toString() : null);

  return (
    <Dashboard title="Kelola Data Perangkat">
      <div className="flex flex-col w-full min-h-[calc(100vh-110px)] px-4 py-6 md:px-6 lg:px-8">
        {successMsg && <Notification type="success" message={successMsg} onClose={() => setSuccessMsg('')} />}
        {errorMsg && <Notification type="error" message={errorMsg} onClose={() => setErrorMsg('')} />}

        <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-3">
            {isAdmin && (
                <div className="w-full sm:w-1/3"> {/* Beri lebar agar tidak terlalu panjang */}
                    <label htmlFor="labFilter" className="sr-only">Filter berdasarkan Lab:</label>
                    <select
                        id="labFilter"
                        value={selectedLabId}
                        onChange={handleLabChange}
                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block w-full p-2.5"
                    >
                        <option value="">Tampilkan Semua Lab</option> {/* Opsi untuk menampilkan semua */}
                        {allLabs.map(lab => (
                        <option key={lab.lab_id} value={lab.lab_id.toString()}>
                            {lab.nama_lab}
                        </option>
                        ))}
                    </select>
                </div>
            )}
            {isKepalaLab && kepalaLabAssignedLabId && allLabs.find(l => l.lab_id.toString() === kepalaLabAssignedLabId.toString()) && (
                <div className="w-full sm:w-auto text-sm font-medium p-2.5 bg-gray-100 rounded-md">
                    Lab yang Dikelola: {allLabs.find(l => l.lab_id.toString() === kepalaLabAssignedLabId.toString())?.nama_lab || 'N/A'}
                </div>
            )}
             {/* Flex-grow untuk mendorong tombol ke kanan jika ada space */}
            <div className="flex-grow hidden sm:block"></div>

            {/* Tombol Tambah Perangkat */}
            {/* Admin: bisa tambah JIKA SUDAH pilih lab. KaLab: selalu bisa tambah untuk labnya */}
            {canManagePerangkat && ((isAdmin && selectedLabId) || isKepalaLab) && (
                 <button
                    onClick={handleOpenAddModal}
                    className="w-full sm:w-auto px-4 py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center text-sm"
                >
                    <FaPlus className="mr-2" /> Tambah Perangkat
                </button>
            )}
        </div>

        <Tabel
          title={
            isAdmin 
              ? (selectedLabId ? `Data Perangkat Lab: ${allLabs.find(l=>l.lab_id.toString() === selectedLabId)?.nama_lab || 'Dipilih'}` : "Data Perangkat (Semua Lab)") 
              : `Data Perangkat Lab Anda` // Judul untuk Kepala Lab
          }
          breadcrumbContext={userRole}
          headers={headTable}
          data={dataPerangkat}
          itemsPerPage={10}
          renderRow={renderPerangkatRow}
          to={null}
          buttonText=""
        >
          {isLoading && (
            <tr>
              <td colSpan={headTable.length} className="text-center py-20 text-gray-500">
                <div className="flex flex-col justify-center items-center">
                  <svg className="animate-spin h-10 w-10 text-blue-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span className="text-lg">Memuat data perangkat...</span>
                </div>
              </td>
            </tr>
          )}
          {!isLoading && dataPerangkat.length === 0 && (
            <tr>
              <td colSpan={headTable.length} className="text-center py-20 text-gray-500 text-lg">
                {isAdmin && !selectedLabId ? "Pilih lab untuk melihat perangkat, atau data semua lab kosong." : "Tidak ada data perangkat ditemukan untuk lab ini."}
              </td>
            </tr>
          )}
        </Tabel>

        {showDetailModal && selectedPerangkatId && 
            <DetailPerangkat id={selectedPerangkatId} onClose={() => setShowDetailModal(false)} />
        }
        {showEditModal && selectedPerangkatId && canManagePerangkat && 
            <EditPerangkat 
                id={selectedPerangkatId} 
                labIdUntukEdit={isAdmin ? selectedLabId : kepalaLabAssignedLabId?.toString()} // Kirim labId yang relevan
                onClose={() => setShowEditModal(false)} 
                onUpdate={() => { // Lebih baik fetch ulang data spesifik setelah update
                    const currentLabToFetch = isAdmin ? selectedLabId : kepalaLabAssignedLabId;
                    if (currentLabToFetch || isAdmin) { // Jika admin tanpa filter, fetch semua
                        const fetchPerangkatDataAfterUpdate = async () => {
                            setIsLoading(true);
                            try {
                                const response = await get('/perangkat'); 
                                if (response.data && Array.isArray(response.data)) {
                                  if (currentLabToFetch && isAdmin) { // Admin dengan lab dipilih
                                    setDataPerangkat(response.data.filter(p => p.lab_id.toString() === currentLabToFetch.toString()));
                                  } else if (isKepalaLab && currentLabToFetch) { // Kepala Lab
                                    setDataPerangkat(response.data.filter(p => p.lab_id.toString() === currentLabToFetch.toString()));
                                  } else if (isAdmin && !currentLabToFetch) { // Admin, semua lab
                                    setDataPerangkat(response.data);
                                  } else {
                                    setDataPerangkat([]);
                                  }
                                } else { setDataPerangkat([]); }
                              } catch (err) { setDataPerangkat([]); } finally { setIsLoading(false); }
                        };
                        fetchPerangkatDataAfterUpdate();
                    }
                }}
            />
        }
        {/* Pastikan labIdForAddModal dikirim dengan benar */}
        {showAddModal && labIdForAddModal && canManagePerangkat &&
            <AddPerangkat 
                labId={labIdForAddModal} 
                onClose={() => setShowAddModal(false)} 
                onSuccess={() => {
                    setShowAddModal(false);
                    setSuccessMsg("Perangkat baru berhasil ditambahkan.");
                    // Re-fetch data perangkat
                    const currentLabToFetch = isAdmin ? selectedLabId : kepalaLabAssignedLabId;
                     if (currentLabToFetch || isAdmin) { 
                        const fetchPerangkatDataAfterAdd = async () => {
                            setIsLoading(true);
                            try {
                                const response = await get('/perangkat'); 
                                if (response.data && Array.isArray(response.data)) {
                                  if (currentLabToFetch && isAdmin) {
                                    setDataPerangkat(response.data.filter(p => p.lab_id.toString() === currentLabToFetch.toString()));
                                  } else if (isKepalaLab && currentLabToFetch) {
                                     setDataPerangkat(response.data.filter(p => p.lab_id.toString() === currentLabToFetch.toString()));
                                  } else if (isAdmin && !currentLabToFetch) { // Admin, semua lab
                                    setDataPerangkat(response.data);
                                  } else {
                                    setDataPerangkat([]);
                                  }
                                } else { setDataPerangkat([]); }
                              } catch (err) { setDataPerangkat([]); } finally { setIsLoading(false); }
                        };
                        fetchPerangkatDataAfterAdd();
                    }
                }}
            />
        }
      </div>
    </Dashboard>
  );
}

export default Perangkat;
