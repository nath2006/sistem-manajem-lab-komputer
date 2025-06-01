// Perangkat.jsx
import React, { useState, useEffect, useContext, useCallback } from 'react'; // Tambahkan useCallback
import Dashboard from '../../Layouts/Dashboard';
import Tabel from '../../Layouts/Table';
import { FaEye, FaTrash, FaFilePen } from "react-icons/fa6";
import { get, deleteData } from '../../utils/api';
import { useLocation, useNavigate } from 'react-router-dom';
import Notification from '../../Components/Notification/Notif';
import useTitle from '../../utils/useTitle';
import { AuthContext } from '../../Context/AuthContext';
import DeleteConfirmation from '../../components/Notification/DeleteConfirmation';

import DetailPerangkat from '../../Components/Perangkat/DetailPerangkat';
import EditPerangkat from '../../Components/Perangkat/EditPerangkat';
// AddPerangkat adalah halaman, jadi tidak diimpor di sini untuk modal
import truncateText from '../../utils/truncateText';

const Perangkat = () => {
  useTitle('Kelola Data Perangkat');
  const location = useLocation();
  const navigate = useNavigate();

  const { state: authState } = useContext(AuthContext);
  const userRole = authState?.role;
  const kepalaLabAssignedLabId = authState?.lab_id_kepala;
console.log("Auth Context State:", authState); // Lihat seluruh authState
console.log("User Role:", userRole);
console.log("Kepala Lab Assigned Lab ID:", kepalaLabAssignedLabId);
  const [successMsg, setSuccessMsg] = useState(location.state?.successMsg || '');
  const [errorMsg, setErrorMsg] = useState(location.state?.errorMsg || '');
  
  const [allLabs, setAllLabs] = useState([]); 
  const [selectedLabId, setSelectedLabId] = useState(location.state?.labId || ''); // Coba ambil dari state navigasi
  
  const [dataPerangkat, setDataPerangkat] = useState([]); 
  const [isLoading, setIsLoading] = useState(true); 
  
  const [selectedPerangkatId, setSelectedPerangkatId] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const isAdmin = userRole === 'Admin';
  const isKepalaLab = userRole === 'Kepala Lab';
  
  const canManageRowActions = isAdmin || isKepalaLab; 
  
  // Admin bisa tambah jika sudah pilih lab, atau jika belum pilih (akan pilih di halaman AddPerangkat)
  // Kepala Lab selalu bisa tambah
  const canAccessAddPerangkatPage = isAdmin || (isKepalaLab && !!kepalaLabAssignedLabId);

  // Fetch daftar lab (untuk Admin memilih, dan untuk KaLab mendapatkan nama labnya)
  useEffect(() => {
    const fetchLabs = async () => {
      setIsLoading(true); // Set loading true di awal
      try {
        if (isAdmin) {
          const response = await get('/lab');
          if (response.data && Array.isArray(response.data)) {
            setAllLabs(response.data);
          } else {
            setAllLabs([]);
            setErrorMsg("Gagal memuat daftar laboratorium.");
          }
        } else if (isKepalaLab && kepalaLabAssignedLabId) {
          const response = await get(`/lab/${kepalaLabAssignedLabId}`);
          if (response.data) {
            setAllLabs([response.data]); // Simpan sebagai array untuk konsistensi
            setSelectedLabId(kepalaLabAssignedLabId.toString()); // Otomatis set lab KaLab
          } else {
            setErrorMsg("Gagal memuat detail lab untuk Kepala Lab.");
          }
        }
      } catch (err) {
        console.error("Error fetching labs:", err);
        setErrorMsg("Gagal memuat data laboratorium.");
        setAllLabs([]);
      } finally {
         // setIsLoading(false) akan dihandle oleh fetchPerangkatData atau kondisi lain
         // Namun, jika bukan admin dan bukan kalab, atau kalab tanpa ID, loading harus false
         if (!isAdmin && (!isKepalaLab || (isKepalaLab && !kepalaLabAssignedLabId))) {
            setIsLoading(false);
         }
      }
    };
    fetchLabs();
  }, [isAdmin, isKepalaLab, kepalaLabAssignedLabId]);


  // Fungsi fetchPerangkatData yang di-memoize
  const fetchPerangkatData = useCallback(async (currentSelectedLabId) => {
    setIsLoading(true); 
    setDataPerangkat([]); 
    setErrorMsg(''); 

    try {
      let perangkatToDisplay = [];
      const response = await get('/perangkat'); 

      if (response.data && Array.isArray(response.data)) {
        const labIdToFilter = currentSelectedLabId || (isKepalaLab ? kepalaLabAssignedLabId?.toString() : '');

        if (isAdmin) {
          if (labIdToFilter) { 
            perangkatToDisplay = response.data.filter(p => p.lab_id.toString() === labIdToFilter);
          } else { 
            perangkatToDisplay = response.data; // Admin belum filter, tampilkan semua
          }
        } else if (isKepalaLab) {
          if (labIdToFilter) { // Harus selalu ada untuk KaLab
            perangkatToDisplay = response.data.filter(p => p.lab_id.toString() === labIdToFilter);
          } else {
            perangkatToDisplay = []; // KaLab tanpa lab_id terdefinisi
          }
        } else { // Role lain (jika ada)
          perangkatToDisplay = response.data; // Contoh: Teknisi lihat semua
        }
        setDataPerangkat(perangkatToDisplay);
      } else {
        setDataPerangkat([]);
        setErrorMsg("Data perangkat tidak ditemukan atau format respons salah.");
      }
    } catch (err) {
      console.error("Error fetching perangkat data:", err);
      setErrorMsg("Gagal mengambil data perangkat. " + (err.response?.data?.message || err.message || ''));
      setDataPerangkat([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, isKepalaLab, kepalaLabAssignedLabId]); // selectedLabId dihilangkan karena dikirim sebagai argumen


  // useEffect untuk memanggil fetchPerangkatData saat filter berubah atau role berubah
  useEffect(() => {
    // Jika Admin, fetch berdasarkan selectedLabId (bisa kosong untuk "semua")
    // Jika KaLab, fetch berdasarkan kepalaLabAssignedLabId (yang sudah diset ke selectedLabId)
    // setIsLoading(true) sudah ada di dalam fetchPerangkatData
    if (isAdmin) {
        fetchPerangkatData(selectedLabId);
    } else if (isKepalaLab) {
       console.log("useEffect[fetchPerangkatData] - Untuk Kepala Lab, ID Lab:", kepalaLabAssignedLabId);
        if (kepalaLabAssignedLabId) { // Pastikan KaLab punya ID lab
            fetchPerangkatData(kepalaLabAssignedLabId.toString());
        } else {
            setIsLoading(false); // Jika KaLab tidak punya ID lab, hentikan loading
            setDataPerangkat([]);
        }
    } else {
        // Logika untuk role lain, misal Teknisi lihat semua perangkat
        // fetchPerangkatData(''); // Panggil dengan string kosong untuk "semua" jika relevan
        setIsLoading(false);
        setDataPerangkat([]);
    }
  }, [selectedLabId, isAdmin, isKepalaLab, kepalaLabAssignedLabId, fetchPerangkatData]); 


  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
        if (location.state && location.state.successMsg) { // Hanya clear state navigasi jika ada successMsg
             navigate(location.pathname, { replace: true, state: {} });
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, errorMsg, location.pathname, navigate, location.state]);


  const handleLabChange = (e) => {
    setSelectedLabId(e.target.value); 
  };

  const handleOpenDetailModal = (id) => {
    setSelectedPerangkatId(id);
    setShowDetailModal(true);
  };

  const handleOpenEditModal = (id) => {
    setSelectedPerangkatId(id);
    setShowEditModal(true);
  };
  
  const handleDelete = DeleteConfirmation({
    onDelete: (id) => deleteData(`/perangkat/delete/${id}`),
    itemName: 'data perangkat',
    onSuccess: (deletedId) => {
      setDataPerangkat(prevData => prevData.filter(item => item.perangkat_id !== deletedId));
      setSuccessMsg('Data perangkat berhasil dihapus');
      // fetchPerangkatData(selectedLabId); // Re-fetch setelah delete
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
    if (!item) return null; 
    return (
      <tr className="bg-white border-b hover:bg-gray-50" key={item.perangkat_id || index}>
        <td className="px-4 py-2">
          {item.foto_perangkat ? (
            <img
              src={`${ASSET_BASE_URL}${PERANGKAT_IMAGE_SUBFOLDER}${item.foto_perangkat}?t=${Date.now()}`}
              alt={item.nama_perangkat || 'Foto Perangkat'}
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
            {canManageRowActions && (
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

  const getLabNameById = (labId) => {
    if (!labId || !allLabs.length) return '';
    const lab = allLabs.find(l => l.lab_id.toString() === labId.toString());
    return lab?.nama_lab || `ID: ${labId}`;
  };
  
  const addPerangkatPathObject = () => {
    if (!canAccessAddPerangkatPage) return null;

    let navState = {};
    // Untuk Admin: jika sudah filter lab, kirim labId dan labName. Jika belum, kirim state kosong.
    // Untuk Kepala Lab: selalu kirim labId dan labName yang diampunya.
    if (isAdmin) {
        if (selectedLabId) { // Admin sudah filter
            navState = { labId: selectedLabId, labName: getLabNameById(selectedLabId) };
        } else { // Admin belum filter, AddPerangkat akan menampilkan dropdown lab
            navState = { labId: null, labName: null }; 
        }
    } else if (isKepalaLab && kepalaLabAssignedLabId) {
        navState = { labId: kepalaLabAssignedLabId.toString(), labName: getLabNameById(kepalaLabAssignedLabId) };
    }
    
    // Tombol tambah hanya aktif jika Admin (boleh belum pilih lab) atau KaLab (lab sudah pasti)
    if (isAdmin || (isKepalaLab && kepalaLabAssignedLabId) ) {
         return { pathname: "/add-perangkat", state: navState };
    }
    return null;
  };

  // Untuk mengirim labId yang benar ke modal EditPerangkat
  const labIdUntukEdit = isAdmin ? selectedLabId : (isKepalaLab ? kepalaLabAssignedLabId?.toString() : null);


  return (
    <Dashboard title="Kelola Data Perangkat">
      <div className="flex flex-col w-full min-h-[calc(100vh-110px)] px-4 py-6 md:px-6 lg:px-8">
        {successMsg && <Notification type="success" message={successMsg} onClose={() => setSuccessMsg('')} />}
        {errorMsg && <Notification type="error" message={errorMsg} onClose={() => setErrorMsg('')} />}

        {isAdmin && (
            <div className="mb-4 flex justify-start items-center gap-3">
                <div className="w-full sm:w-1/3">
                    <label htmlFor="labFilter" className="sr-only">Filter berdasarkan Lab:</label>
                    <select
                        id="labFilter"
                        value={selectedLabId}
                        onChange={handleLabChange}
                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block w-full p-2.5"
                    >
                        <option value="">Tampilkan Semua Perangkat</option> {/* Teks diubah */}
                        {allLabs.map(lab => (
                        <option key={lab.lab_id} value={lab.lab_id.toString()}>
                            {lab.nama_lab}
                        </option>
                        ))}
                    </select>
                </div>
            </div>
        )}
        {/* {isKepalaLab && kepalaLabAssignedLabId && allLabs.length > 0 && (
             <div className="mb-4 w-full sm:w-auto text-sm font-medium p-2.5 bg-gray-100 rounded-md">
                Menampilkan Perangkat untuk Lab: {getLabNameById(kepalaLabAssignedLabId)}
            </div>
        )} */}

        <Tabel
          title={
            isAdmin 
              ? (selectedLabId ? `Data Perangkat Lab: ${getLabNameById(selectedLabId)}` : "Data Perangkat (Semua Lab)") 
              : `Data Perangkat Lab: ${getLabNameById(kepalaLabAssignedLabId)}`
          }
          breadcrumbContext={userRole}
          headers={headTable}
          data={dataPerangkat}
          itemsPerPage={10}
          renderRow={renderPerangkatRow}
          to={addPerangkatPathObject()} 
          buttonText={(isAdmin || (isKepalaLab && !!kepalaLabAssignedLabId)) ? "Tambah Perangkat" : ""}
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
                {isAdmin && !selectedLabId ? "Tidak ada perangkat di semua lab, atau pilih lab untuk filter." : "Tidak ada data perangkat ditemukan untuk lab ini."}
              </td>
            </tr>
          )}
        </Tabel>

        {showDetailModal && selectedPerangkatId && 
            <DetailPerangkat id={selectedPerangkatId} onClose={() => setShowDetailModal(false)} />
        }
        {showEditModal && selectedPerangkatId && canManageRowActions && 
            <EditPerangkat 
                id={selectedPerangkatId} 
                labIdUntukEdit={labIdUntukEdit} 
                onClose={() => setShowEditModal(false)} 
                onUpdate={(updatedData) => {
                    setSuccessMsg(updatedData.message || "Data perangkat berhasil diupdate.");
                    fetchPerangkatData(selectedLabId); // Panggil fetchPerangkatData dengan selectedLabId saat ini
                    setShowEditModal(false);
                }}
            />
        }
        {/* Pemanggilan Modal AddPerangkat dihapus dari sini karena sudah jadi halaman */}
      </div>
    </Dashboard>
  );
}

export default Perangkat;
