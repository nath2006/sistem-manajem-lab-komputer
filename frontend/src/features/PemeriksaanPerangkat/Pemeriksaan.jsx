// src/Pages/Pemeriksaan/Pemeriksaan.jsx
import React, { useState, useEffect, useContext, useCallback } from 'react';
import Dashboard from '../../Layouts/Dashboard';
import Tabel from '../../Layouts/Table';
import { FaEye, FaTrash, FaPrint } from "react-icons/fa6";
import { get, deleteData } from '../../utils/api';
import { useLocation, useNavigate } from 'react-router-dom';
import Notification from '../../Components/Notification/Notif';
import useTitle from '../../utils/useTitle';
import { AuthContext } from '../../Context/AuthContext';
import DeleteConfirmation from '../../components/Notification/DeleteConfirmation';
import truncateText from '../../utils/truncateText';

// 1. Uncomment dan pastikan path ini benar
import DetailPemeriksaan from '../../Components/Pemeriksaan/DetailPemeriksaan'; 

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Pemeriksaan = () => {
  useTitle('Riwayat Pemeriksaan Perangkat');
  const location = useLocation();
  const navigate = useNavigate();

  const { state: authState } = useContext(AuthContext);
  const userRole = authState?.role;
  const kepalaLabAssignedLabId = authState?.lab_id_kepala; 
  const teknisiAssignedLabId = authState?.user?.lab_id; 

  const [successMsg, setSuccessMsg] = useState(location.state?.successMsg || '');
  const [errorMsg, setErrorMsg] = useState(location.state?.errorMsg || '');
  
  const [allPemeriksaanData, setAllPemeriksaanData] = useState([]);
  const [dataPemeriksaan, setDataPemeriksaan] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedPemeriksaanId, setSelectedPemeriksaanId] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [allLabs, setAllLabs] = useState([]); 
  const [selectedLabId, setSelectedLabId] = useState(location.state?.labId || '');

  const isAdmin = userRole === 'Admin';
  const isKepalaLab = userRole === 'Kepala Lab';
  const isTeknisi = userRole === 'Teknisi';

  const canViewDetail = true;
  const canDeletePemeriksaan = userRole === 'Admin';
  const canPrintData = isAdmin || isKepalaLab || isTeknisi;

  useEffect(() => {
    const fetchAllLabsForFilter = async () => {
      if (isAdmin) {
        // Tidak perlu setIsLoading(true) di sini karena fetchAllPemeriksaan akan melakukannya
        try {
          const response = await get('/lab');
          if (response.data && Array.isArray(response.data)) {
            setAllLabs(response.data);
          } else {
            setAllLabs([]);
            // setErrorMsg("Gagal memuat daftar laboratorium untuk filter."); // Hindari menimpa error utama
          }
        } catch (err) {
          console.error("Error fetching all labs for filter:", err);
          // setErrorMsg("Gagal memuat daftar laboratorium untuk filter.");
          setAllLabs([]);
        } 
      } else if (isKepalaLab && kepalaLabAssignedLabId) {
        try {
            const response = await get(`/lab/${kepalaLabAssignedLabId}`);
            if (response.data) setAllLabs([response.data]);
        } catch (err) {
            console.error("Error fetching lab for Kepala Lab:", err);
        }
      } else if (isTeknisi && teknisiAssignedLabId) {
        try {
            const response = await get(`/lab/${teknisiAssignedLabId}`);
            if (response.data) setAllLabs([response.data]);
        } catch (err) {
            console.error("Error fetching lab for Teknisi:", err);
        }
      }
    };
    fetchAllLabsForFilter();
  }, [isAdmin, isKepalaLab, kepalaLabAssignedLabId, isTeknisi, teknisiAssignedLabId]);

  useEffect(() => {
    const fetchAllPemeriksaan = async () => {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const response = await get('/pemeriksaan');
        if (response && Array.isArray(response.data)) {
          setAllPemeriksaanData(response.data);
        } else {
          setAllPemeriksaanData([]);
          setErrorMsg(response?.message || "Data pemeriksaan tidak ditemukan atau format respons salah.");
        }
      } catch (err) {
        console.error("Error fetching all pemeriksaan data:", err.response?.data || err.message || err);
        setErrorMsg('Gagal Mengambil Semua Data Pemeriksaan. ' + (err.response?.data?.message || err.message || ''));
        setAllPemeriksaanData([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllPemeriksaan();
  }, []);

  useEffect(() => {
    // Tidak perlu setIsLoading(true) di sini jika allPemeriksaanData belum ada,
    // karena isLoading utama akan mengcovernya.
    // Jika allPemeriksaanData sudah ada, filter seharusnya cepat.
    let filteredData = [];
    if (allPemeriksaanData.length > 0) { // Hanya filter jika ada data awal
        if (isAdmin) {
        if (selectedLabId) {
            filteredData = allPemeriksaanData.filter(p => p.lab_id?.toString() === selectedLabId);
        } else {
            filteredData = allPemeriksaanData;
        }
        } else if (isKepalaLab && kepalaLabAssignedLabId) {
        filteredData = allPemeriksaanData.filter(p => p.lab_id?.toString() === kepalaLabAssignedLabId.toString());
        } else if (isTeknisi && teknisiAssignedLabId) {
        filteredData = allPemeriksaanData.filter(p => p.lab_id?.toString() === teknisiAssignedLabId.toString());
        } else {
            if(!isAdmin && !isKepalaLab && !isTeknisi) {
                filteredData = [];
            } else if (!isAdmin) {
                filteredData = [];
            } else {
                filteredData = allPemeriksaanData;
            }
        }
        setDataPemeriksaan(filteredData);
    } else {
        setDataPemeriksaan([]); // Jika allPemeriksaanData kosong, hasil filter juga kosong
    }
    // setIsLoading(false) sudah dihandle oleh fetchAllPemeriksaan
  }, [selectedLabId, isAdmin, isKepalaLab, kepalaLabAssignedLabId, isTeknisi, teknisiAssignedLabId, allPemeriksaanData]);

  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
        if (location.state) {
          navigate(location.pathname, { replace: true, state: {} });
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, errorMsg, location.state, location.pathname, navigate]);

  const handleLabChange = (e) => {
    setSelectedLabId(e.target.value);
  };

  const handleOpenDetailModal = (id) => {
    setSelectedPemeriksaanId(id);
    setShowDetailModal(true);
  };

  const handleDelete = DeleteConfirmation({
    onDelete: (id) => deleteData(`/pemeriksaan/delete/${id}`),
    itemName: 'data pemeriksaan',
    onSuccess: (deletedId) => {
      setAllPemeriksaanData(prevData => prevData.filter(item => item.pemeriksaan_id !== deletedId));
      setSuccessMsg('Data pemeriksaan berhasil dihapus');
    },
    onError: (error) => setErrorMsg('Gagal menghapus data pemeriksaan. ' + (error.response?.data?.message || error.message || ''))
  });

  const formatDateForDisplayAndPDF = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; 
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };
  
  const formatDateForFilename = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getLabNameForTitleAndFile = (labId) => {
    if (!labId) return 'Semua Lab'; // Default jika labId kosong (untuk Admin "Tampilkan Semua")
    if (!allLabs.length && (isKepalaLab || isTeknisi)) { // Jika allLabs belum ke-load tapi kita tahu lab spesifik user
        if(isKepalaLab && labId.toString() === kepalaLabAssignedLabId?.toString()) return `Lab ID ${labId}`;
        if(isTeknisi && labId.toString() === teknisiAssignedLabId?.toString()) return `Lab ID ${labId}`;
    }
    const lab = allLabs.find(l => l.lab_id?.toString() === labId.toString());
    return lab?.nama_lab || `Lab ID ${labId}`;
  };
  
  const getCurrentTableTitle = () => {
    if (isAdmin) {
      return selectedLabId ? `Riwayat Pemeriksaan Lab: ${getLabNameForTitleAndFile(selectedLabId)}` : "Riwayat Pemeriksaan (Semua Lab)";
    } else if (isKepalaLab && kepalaLabAssignedLabId) {
      return `Riwayat Pemeriksaan Lab: ${getLabNameForTitleAndFile(kepalaLabAssignedLabId)}`;
    } else if (isTeknisi && teknisiAssignedLabId) {
        return `Riwayat Pemeriksaan Lab: ${getLabNameForTitleAndFile(teknisiAssignedLabId)}`;
    }
    return "Riwayat Pemeriksaan Perangkat";
  };

  const handlePrintData = () => {
    const dataToPrint = dataPemeriksaan;
    if (dataToPrint.length === 0) {
        alert("Tidak ada data pemeriksaan untuk dicetak.");
        return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const reportTitle = getCurrentTableTitle(); // Menggunakan fungsi yang sama dengan judul tabel

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Laporan ${reportTitle}`, pageWidth / 2, margin + 5, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth / 2, margin + 10, { align: 'center' });

    const tableColumn = ["ID", "Pelaksana", "Perangkat", "No. Inv.", "Lab", "Tanggal Cek", "Hasil", "Catatan"];
    
    const tableRows = dataToPrint.map(item => [
        item.pemeriksaan_id || '-',
        item.nama_pemeriksa || `User ID: ${item.pemeriksa_user_id || item.user_id}`,
        item.nama_perangkat || `ID: ${item.perangkat_id}`,
        item.nomor_inventaris || '-',
        item.nama_lab || `Lab ID: ${item.lab_id}`,
        formatDateForDisplayAndPDF(item.tanggal_pemeriksaan),
        item.hasil_pemeriksaan || 'N/A',
        truncateText(item.catatan, 50) || '-',
    ]);

    autoTable(doc, { 
        head: [tableColumn], body: tableRows, startY: margin + 20, theme: 'grid',
        headStyles: { fillColor: [0, 100, 0] }, 
        styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 10 }, 1: { cellWidth: 35 }, 2: { cellWidth: 40 }, 
            3: { cellWidth: 30 }, 4: { cellWidth: 35 }, 5: { cellWidth: 20 }, 
            6: { cellWidth: 25 }, 7: { cellWidth: 'auto' },
        }
    });
    
    let labNameForFile = 'Semua_Lab';
    if (isAdmin && selectedLabId) labNameForFile = getLabNameForTitleAndFile(selectedLabId).replace(/\s+/g, '_');
    else if (isKepalaLab) labNameForFile = getLabNameForTitleAndFile(kepalaLabAssignedLabId).replace(/\s+/g, '_');
    else if (isTeknisi) labNameForFile = getLabNameForTitleAndFile(teknisiAssignedLabId).replace(/\s+/g, '_');

    doc.save(`Laporan_Pemeriksaan_${labNameForFile}_${formatDateForFilename(new Date())}.pdf`);
  };

  const headTable = [
    { judul: "ID" }, { judul: "Pelaksana" }, { judul: "Perangkat" },
    { judul: "No. Inventaris" }, { judul: "Lab" }, { judul: "Tanggal Cek" },
    { judul: "Hasil" }, { judul: "Catatan Singkat" }, { judul: "Aksi" }
  ];

  const renderPemeriksaanRow = (item, index) => {
    return (
      <tr className="bg-white border-b hover:bg-gray-50" key={item.pemeriksaan_id || index}>
        <td className="px-4 py-2 text-gray-700 text-center text-xs">{item.pemeriksaan_id || '-'}</td>
        <td className="px-4 py-2 text-gray-700 text-xs">{item.nama_pemeriksa || `User ID: ${item.pemeriksa_user_id || item.user_id}`}</td>
        <td className="px-4 py-2 text-gray-700 text-xs">{item.nama_perangkat || `Perangkat ID: ${item.perangkat_id}`}</td>
        <td className="px-4 py-2 text-gray-700 text-xs">{item.nomor_inventaris || '-'}</td>
        <td className="px-4 py-2 text-gray-700 text-xs">{item.nama_lab || `Lab ID: ${item.lab_id}`}</td>
        <td className="px-4 py-2 text-gray-700 text-xs">{formatDateForDisplayAndPDF(item.tanggal_pemeriksaan)}</td>
        <td className="px-4 py-2 text-xs">
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
              item.hasil_pemeriksaan === 'Baik' ? 'bg-green-100 text-green-800' :
              item.hasil_pemeriksaan === 'Bermasalah' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
          }`}>
            {item.hasil_pemeriksaan || 'N/A'}
          </span>
        </td>
        <td className="px-4 py-2 text-gray-700 text-xs">{truncateText(item.catatan, 25) || '-'}</td>
        <td className='px-4 py-2 text-center'>
          <div className='flex items-center justify-center space-x-1'>
            {canViewDetail && (
              <button
                onClick={() => handleOpenDetailModal(item.pemeriksaan_id)}
                className="p-1.5 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-100 transition-colors duration-150"
                title="Lihat Detail Pemeriksaan"
              >
                <FaEye size={16} />
              </button>
            )}
            {canDeletePemeriksaan && (
              <button
                onClick={() => handleDelete(item.pemeriksaan_id)}
                className="p-1.5 text-red-600 hover:text-red-800 rounded-full hover:bg-red-100 transition-colors duration-150"
                title="Hapus Data Pemeriksaan"
              >
                <FaTrash size={15}/>
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };
  
  const displayUserLabInfoText = () => {
    if (isAdmin) return null; 

    let userLabIdToShow = null;
    if (isKepalaLab && kepalaLabAssignedLabId) userLabIdToShow = kepalaLabAssignedLabId;
    else if (isTeknisi && teknisiAssignedLabId) userLabIdToShow = teknisiAssignedLabId;

    // Cek apakah allLabs sudah terisi sebelum mencoba getLabNameForTitleAndFile
    if (userLabIdToShow && allLabs.length > 0) { 
        // return (
        //     <div className="mb-4 w-full sm:w-auto text-sm font-medium p-2.5 bg-gray-100 rounded-md">
        //         Menampilkan Riwayat Pemeriksaan untuk Lab: {getLabNameForTitleAndFile(userLabIdToShow)}
        //     </div>
        // );
    } else if (userLabIdToShow) { // Jika allLabs belum ada, tampilkan ID saja sebagai fallback
        // return (
        //     <div className="mb-4 w-full sm:w-auto text-sm font-medium p-2.5 bg-gray-100 rounded-md">
        //         Menampilkan Riwayat Pemeriksaan untuk Lab ID: {userLabIdToShow}
        //     </div>
        // );
    }
    return null;
  };

  return (
    <Dashboard title="Riwayat Pemeriksaan Perangkat">
      <div className="flex flex-col w-full min-h-screen px-4 py-6 md:px-6 lg:px-8">
        {(successMsg && !errorMsg) && (
          <Notification type="success" message={successMsg} onClose={() => setSuccessMsg('')} />
        )}
        {errorMsg && (
          <Notification type="error" message={errorMsg} onClose={() => setErrorMsg('')} />
        )}

        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
          {isAdmin && (
            <div className="w-full sm:w-1/3">
              <label htmlFor="labFilterPemeriksaan" className="sr-only">Filter berdasarkan Lab:</label>
              <select
                id="labFilterPemeriksaan"
                value={selectedLabId}
                onChange={handleLabChange}
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                disabled={isLoading} // Nonaktifkan saat loading
              >
                <option value="">Tampilkan Semua Riwayat Lab</option>
                {allLabs.map(lab => (
                  <option key={lab.lab_id} value={lab.lab_id.toString()}>
                    {lab.nama_lab}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!isAdmin && <div className="w-full sm:w-1/3"></div>} 

          {canPrintData && dataPemeriksaan.length > 0 && (
            <div className="w-full sm:w-auto flex sm:justify-end">
                <button
                    onClick={handlePrintData}
                    className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 flex items-center text-sm"
                    title="Cetak Riwayat Pemeriksaan ke PDF"
                    disabled={isLoading} // Nonaktifkan saat loading
                >
                    <FaPrint className="mr-2" /> Cetak Riwayat
                </button>
            </div>
          )}
        </div>
        
        {displayUserLabInfoText()}

        <Tabel
          title={getCurrentTableTitle()}
          breadcrumbContext={userRole}
          headers={headTable}
          to={null} 
          buttonText="" 
          data={dataPemeriksaan}
          itemsPerPage={10}
          renderRow={renderPemeriksaanRow}
        >
          {isLoading && (
            <tr>
              <td colSpan={headTable.length} className="text-center py-20 text-gray-500">
                <div className="flex flex-col justify-center items-center">
                  <svg className="animate-spin h-10 w-10 text-blue-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span className="text-lg">Memuat data pemeriksaan...</span>
                </div>
              </td>
            </tr>
          )}
          {!isLoading && dataPemeriksaan.length === 0 && (
            <tr>
              <td colSpan={headTable.length} className="text-center py-20 text-gray-500 text-lg">
                {isAdmin && !selectedLabId && allPemeriksaanData.length > 0 ? "Tidak ada data untuk filter lab yang dipilih."
                 : isAdmin && !selectedLabId ? "Tidak ada riwayat pemeriksaan di semua lab, atau pilih lab untuk filter." 
                 : (isKepalaLab || isTeknisi) && !allPemeriksaanData.some(p => p.lab_id?.toString() === (isKepalaLab ? kepalaLabAssignedLabId?.toString() : teknisiAssignedLabId?.toString())) && allPemeriksaanData.length > 0 ? `Tidak ada riwayat pemeriksaan ditemukan untuk lab Anda.`
                 : "Tidak ada data riwayat pemeriksaan ditemukan."}
              </td>
            </tr>
          )}
        </Tabel>

        {/* 2. Uncomment render modal DetailPemeriksaan */}
        {showDetailModal && selectedPemeriksaanId && 
            <DetailPemeriksaan 
                id={selectedPemeriksaanId} 
                onClose={() => {
                    setShowDetailModal(false);
                    setSelectedPemeriksaanId(null); // Reset ID setelah modal ditutup
                }} 
            />
        }
        
      </div>
    </Dashboard>
  );
}

export default Pemeriksaan;
