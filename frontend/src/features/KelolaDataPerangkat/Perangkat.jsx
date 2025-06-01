// Perangkat.jsx
import React, { useState, useEffect, useContext, useCallback } from 'react';
import Dashboard from '../../Layouts/Dashboard';
import Tabel from '../../Layouts/Table';
// Tambahkan FaClipboardList atau ikon lain yang sesuai untuk pemeriksaan
import { FaEye, FaTrash, FaFilePen, FaPrint, FaClipboardList } from "react-icons/fa6"; 
import { get, deleteData } from '../../utils/api';
import { useLocation, useNavigate } from 'react-router-dom';
import Notification from '../../Components/Notification/Notif';
import useTitle from '../../utils/useTitle';
import { AuthContext } from '../../Context/AuthContext';
import DeleteConfirmation from '../../components/Notification/DeleteConfirmation';

import DetailPerangkat from '../../Components/Perangkat/DetailPerangkat';
import EditPerangkat from '../../Components/Perangkat/EditPerangkat';
import truncateText from '../../utils/truncateText';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Perangkat = () => {
  useTitle('Kelola Data Perangkat');
  const location = useLocation();
  const navigate = useNavigate();

  const { state: authState } = useContext(AuthContext);
  const userRole = authState?.role;
  const kepalaLabAssignedLabId = authState?.lab_id_kepala;
  const teknisiAssignedLabId = authState?.user?.lab_id; // Asumsi teknisi punya lab_id di state.user.lab_id

  const [successMsg, setSuccessMsg] = useState(location.state?.successMsg || '');
  const [errorMsg, setErrorMsg] = useState(location.state?.errorMsg || '');
  
  const [allLabs, setAllLabs] = useState([]); 
  const [selectedLabId, setSelectedLabId] = useState(location.state?.labId || '');
  
  const [dataPerangkat, setDataPerangkat] = useState([]); 
  const [isLoading, setIsLoading] = useState(true); 
  
  const [selectedPerangkatId, setSelectedPerangkatId] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const isAdmin = userRole === 'Admin';
  const isKepalaLab = userRole === 'Kepala Lab';
  const isTeknisi = userRole === 'Teknisi'; // Tambahkan role Teknisi
  
  const canManageRowActions = isAdmin || isKepalaLab; 
  // Hanya Admin, Teknisi, dan Kepala Lab yang bisa melakukan pemeriksaan
  const canPerformPemeriksaan = isAdmin || isTeknisi || isKepalaLab; 
  const canAccessAddPerangkatPage = isAdmin || (isKepalaLab && !!kepalaLabAssignedLabId);
  const canPrintData = isAdmin || isKepalaLab;

  // Fetch daftar lab
  useEffect(() => {
    const fetchLabs = async () => {
      setIsLoading(true);
      try {
        if (isAdmin) {
          const response = await get('/lab');
          if (response.data && Array.isArray(response.data)) {
            setAllLabs(response.data);
          } else {
            setAllLabs([]);
            setErrorMsg("Gagal memuat daftar laboratorium.");
          }
        } else if ((isKepalaLab && kepalaLabAssignedLabId) || (isTeknisi && teknisiAssignedLabId)) {
            // Jika Kepala Lab atau Teknisi, ambil lab spesifik mereka
            const userLabId = isKepalaLab ? kepalaLabAssignedLabId : teknisiAssignedLabId;
            const response = await get(`/lab/${userLabId}`);
            if (response.data) {
              setAllLabs([response.data]);
              setSelectedLabId(userLabId.toString());
            } else {
              setErrorMsg(`Gagal memuat detail lab untuk ${userRole}.`);
            }
        }
      } catch (err) {
        console.error("Error fetching labs:", err);
        setErrorMsg("Gagal memuat data laboratorium.");
        setAllLabs([]);
      } finally {
        // Kondisi setIsLoading(false) disesuaikan
        if (!isAdmin && 
            !(isKepalaLab && kepalaLabAssignedLabId) && 
            !(isTeknisi && teknisiAssignedLabId)
           ) {
          setIsLoading(false);
        }
      }
    };
    fetchLabs();
  }, [isAdmin, isKepalaLab, kepalaLabAssignedLabId, isTeknisi, teknisiAssignedLabId]);

  // Fungsi fetchPerangkatData
  const fetchPerangkatData = useCallback(async (currentSelectedLabId) => {
    setIsLoading(true); 
    setDataPerangkat([]); 
    setErrorMsg(''); 

    try {
      let perangkatToDisplay = [];
      const response = await get('/perangkat'); 

      if (response.data && Array.isArray(response.data)) {
        // Logika filter lab_id untuk Kepala Lab dan Teknisi
        const userSpecificLabId = isKepalaLab ? kepalaLabAssignedLabId?.toString() 
                                : isTeknisi ? teknisiAssignedLabId?.toString() 
                                : '';

        const labIdToFilter = isAdmin ? currentSelectedLabId : userSpecificLabId;

        if (labIdToFilter) { 
          perangkatToDisplay = response.data.filter(p => p.lab_id.toString() === labIdToFilter);
        } else if (isAdmin && !currentSelectedLabId) { // Admin dan tidak ada filter lab
          perangkatToDisplay = response.data;
        } else if (!isAdmin && !userSpecificLabId) { // Bukan admin dan tidak punya lab_id spesifik
            perangkatToDisplay = []; // Atau tampilkan error
            if (!isKepalaLab && !isTeknisi) setErrorMsg("Role tidak dikenal atau tidak memiliki akses ke lab.")
        } else { // Fallback jika ada kasus lain (misal Teknisi tanpa lab_id, meskipun idealnya tidak terjadi)
            perangkatToDisplay = [];
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
  }, [isAdmin, isKepalaLab, kepalaLabAssignedLabId, isTeknisi, teknisiAssignedLabId]);


  // useEffect untuk memanggil fetchPerangkatData
  useEffect(() => {
    if (isAdmin) {
      fetchPerangkatData(selectedLabId);
    } else if (isKepalaLab && kepalaLabAssignedLabId) {
      fetchPerangkatData(kepalaLabAssignedLabId.toString());
    } else if (isTeknisi && teknisiAssignedLabId) {
      fetchPerangkatData(teknisiAssignedLabId.toString());
    }
     else { // Jika bukan Admin, KaLab dengan ID, atau Teknisi dengan ID
      if (!isKepalaLab && !isTeknisi) { // Hanya set loading false jika bukan role yg ditangani
        setIsLoading(false);
        setDataPerangkat([]);
      }
    }
  }, [selectedLabId, isAdmin, isKepalaLab, kepalaLabAssignedLabId, isTeknisi, teknisiAssignedLabId, fetchPerangkatData]); 


  // useEffect untuk notifikasi (TIDAK ADA PERUBAHAN)
  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
        if (location.state && location.state.successMsg) {
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
    },
    onError: (error) => setErrorMsg('Gagal menghapus data perangkat. ' + (error.response?.data?.message || error.message || ''))
  });

  // *** Tambahkan fungsi handler untuk navigasi ke form pemeriksaan ***
  const handleGoToPemeriksaan = (perangkatItem) => {
    navigate('/add-pemeriksaan', { // Ganti dengan path yang benar untuk form pemeriksaan
      state: {
        perangkat_id: perangkatItem.perangkat_id,
        nama_perangkat: perangkatItem.nama_perangkat,
        nomor_inventaris: perangkatItem.nomor_inventaris,
        lab_id: perangkatItem.lab_id,
        nama_lab: perangkatItem.nama_lab,
        // Anda bisa menambahkan data lain yang mungkin diperlukan di form pemeriksaan
      }
    });
  };

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
              src={`${ASSET_BASE_URL}${PERANGKAT_IMAGE_SUBFOLDER}${item.foto_perangkat}?t=${new Date().getTime()}`}
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
            
            {/* Tombol Lakukan Pemeriksaan */}
            {canPerformPemeriksaan && (
                 // Tombol ini hanya muncul jika perangkat tidak dalam status 'Rusak' atau 'Dalam Perbaikan'
                 // atau sesuai kebijakan lain
                 (item.status !== 'Rusak' && item.status !== 'Dalam Perbaikan' && item.status !== 'Perlu Perbaikan') && 
                <button
                    onClick={() => handleGoToPemeriksaan(item)}
                    className="p-2 text-green-600 hover:text-green-800 rounded-full hover:bg-green-100" 
                    title="Lakukan Pemeriksaan">
                    <FaClipboardList size={17} /> 
                </button>
            )}

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
    if (!labId || !allLabs.length) return `ID: ${labId || 'Semua'}`;
    const lab = allLabs.find(l => l.lab_id.toString() === labId.toString());
    return lab?.nama_lab || `ID: ${labId}`;
  };
  
  const addPerangkatPathObject = () => {
    if (!canAccessAddPerangkatPage) return null;
    let navState = {};
    let userLabForAdd = isKepalaLab ? kepalaLabAssignedLabId : (isTeknisi ? teknisiAssignedLabId : null);

    if (isAdmin) {
      if (selectedLabId) {
        navState = { labId: selectedLabId, labName: getLabNameById(selectedLabId) };
      } else {
        navState = { labId: null, labName: null }; 
      }
    } else if (userLabForAdd) { // Untuk Kepala Lab & Teknisi
      navState = { labId: userLabForAdd.toString(), labName: getLabNameById(userLabForAdd) };
    }
    
    if (isAdmin || (isKepalaLab && !!kepalaLabAssignedLabId) || (isTeknisi && !!teknisiAssignedLabId) ) {
      return { pathname: "/add-perangkat", state: navState };
    }
    return null;
  };

  const labIdUntukEdit = isAdmin ? selectedLabId 
                        : (isKepalaLab ? kepalaLabAssignedLabId?.toString() 
                        : (isTeknisi ? teknisiAssignedLabId?.toString() 
                        : null));

  const getCurrentTableTitle = () => {
    let titleLabId = selectedLabId; // Default untuk admin
    if (isKepalaLab) titleLabId = kepalaLabAssignedLabId;
    else if (isTeknisi) titleLabId = teknisiAssignedLabId;
    
    if (isAdmin && !selectedLabId) return "Data Perangkat (Semua Lab)";
    return `Data Perangkat Lab: ${getLabNameById(titleLabId)}`;
  };
  
  const formatDateForFilename = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handlePrintData = () => {
    if (dataPerangkat.length === 0) {
      alert("Tidak ada data perangkat untuk dicetak.");
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const reportTitle = getCurrentTableTitle();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Laporan ${reportTitle}`, pageWidth / 2, margin + 5, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth / 2, margin + 10, { align: 'center' });

    const tableColumn = ["No. Inventaris", "Nama Perangkat", "Lab", "Status", "Spesifikasi"];
    
    const tableRows = dataPerangkat.map(item => [
      item.nomor_inventaris || '-',
      item.nama_perangkat || '-',
      item.nama_lab || '-',
      item.status || 'N/A',
      item.spesifikasi || '-',
    ]);

    autoTable(doc, { 
      head: [tableColumn],
      body: tableRows,
      startY: margin + 20,
      theme: 'grid',
      headStyles: { fillColor: [22, 160, 133] },
      styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 35 }, 
        1: { cellWidth: 50 }, 
        2: { cellWidth: 40 }, 
        3: { cellWidth: 30 }, 
        4: { cellWidth: 'auto' }, 
      }
    });
    
    let labNameForFile = 'Semua_Lab';
    if (selectedLabId && isAdmin) labNameForFile = getLabNameById(selectedLabId).replace(/\s+/g, '_');
    else if (isKepalaLab) labNameForFile = getLabNameById(kepalaLabAssignedLabId).replace(/\s+/g, '_');
    else if (isTeknisi) labNameForFile = getLabNameById(teknisiAssignedLabId).replace(/\s+/g, '_');

    doc.save(`Laporan_Perangkat_${labNameForFile}_${formatDateForFilename(new Date())}.pdf`);
  };

  // Logika untuk menampilkan informasi lab bagi Kepala Lab dan Teknisi
  const displayUserLabInfo = () => {
    if (isAdmin) return null; // Admin tidak perlu info ini di sini, mereka punya filter

    let userLabIdToShow = null;
    if (isKepalaLab && kepalaLabAssignedLabId) {
        userLabIdToShow = kepalaLabAssignedLabId;
    } else if (isTeknisi && teknisiAssignedLabId) {
        userLabIdToShow = teknisiAssignedLabId;
    }

    if (userLabIdToShow && allLabs.length > 0) {
        return (
            <div className="mb-4 w-full sm:w-auto text-sm font-medium p-2.5 bg-gray-100 rounded-md">
                Menampilkan Perangkat untuk Lab: {getLabNameById(userLabIdToShow)}
            </div>
        );
    }
    return null;
  };


  return (
    <Dashboard title="Kelola Data Perangkat">
      <div className="flex flex-col w-full min-h-[calc(100vh-110px)] px-4 py-6 md:px-6 lg:px-8">
        {successMsg && <Notification type="success" message={successMsg} onClose={() => setSuccessMsg('')} />}
        {errorMsg && <Notification type="error" message={errorMsg} onClose={() => setErrorMsg('')} />}

        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
          {isAdmin && (
            <div className="w-full sm:w-1/3">
              <label htmlFor="labFilter" className="sr-only">Filter berdasarkan Lab:</label>
              <select
                id="labFilter"
                value={selectedLabId}
                onChange={handleLabChange}
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block w-full p-2.5"
              >
                <option value="">Tampilkan Semua Perangkat</option>
                {allLabs.map(lab => (
                  <option key={lab.lab_id} value={lab.lab_id.toString()}>
                    {lab.nama_lab}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!isAdmin && <div className="w-full sm:w-1/3"></div>} {/* Placeholder */}

          {canPrintData && dataPerangkat.length > 0 && (
            <div className="w-full sm:w-auto flex sm:justify-end">
              <button
                onClick={handlePrintData}
                className="w-full sm:w-auto px-4 py-2.5 bg-teal-500 text-white rounded-md hover:bg-teal-600 flex items-center justify-center"
                title="Cetak Data Perangkat ke PDF"
              >
                <FaPrint className="mr-2" /> Cetak Data
              </button>
            </div>
          )}
        </div>
        
        {displayUserLabInfo()} {/* Menampilkan info lab untuk KaLab/Teknisi */}

        <Tabel
          title={getCurrentTableTitle()}
          breadcrumbContext={userRole}
          headers={headTable}
          data={dataPerangkat}
          itemsPerPage={10}
          renderRow={renderPerangkatRow}
          to={addPerangkatPathObject()} 
          buttonText={(isAdmin || ((isKepalaLab || isTeknisi) && !!(kepalaLabAssignedLabId || teknisiAssignedLabId))) ? "Tambah Perangkat" : ""}
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
                {/* Pesan disesuaikan berdasarkan role dan filter */}
                {isAdmin && !selectedLabId ? "Tidak ada perangkat di semua lab, atau pilih lab untuk filter." 
                 : (isKepalaLab || isTeknisi) && !dataPerangkat.length ? `Tidak ada data perangkat ditemukan untuk lab Anda.`
                 : "Tidak ada data perangkat ditemukan."}
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
                    const currentActiveLabId = isAdmin ? selectedLabId 
                                            : isKepalaLab ? kepalaLabAssignedLabId?.toString() 
                                            : isTeknisi ? teknisiAssignedLabId?.toString()
                                            : '';
                    fetchPerangkatData(currentActiveLabId); 
                    setShowEditModal(false);
                }}
            />
        }
      </div>
    </Dashboard>
  );
}

export default Perangkat;
