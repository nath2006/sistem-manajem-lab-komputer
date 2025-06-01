import React, { useState, useEffect, useCallback, useContext } from 'react';
import Dashboard from '../../Layouts/Dashboard';
import { get, post } from '../../utils/api';
import useTitle from '../../utils/useTitle';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import Tabel from '../../Layouts/Table';
import Swal from 'sweetalert2';
import RejectPengajuanModal from '../../Components/KelolaJadwalLab/RejectModal'; // 1. IMPOR MODAL BARU (sesuaikan path)
import AddJadwalLab from '../../Components/KelolaJadwalLab/AddJadwalLab';

// Interval untuk auto-refresh data (dalam milidetik)
const AUTO_REFRESH_INTERVAL_MS = 30000; // 30 detik

// Kelas Tombol SweetAlert yang Disesuaikan (dari kode Anda)
const swalCustomClasses = {
  confirmButton: 'px-5 py-2 text-sm font-semibold text-center border-2 rounded-md active:scale-95 focus:outline-none',
  cancelButton: 'px-5 py-2 text-sm font-semibold text-center bg-white border-2 rounded-md active:scale-95 focus:outline-none',
  actions: 'flex justify-center gap-4 mt-2',
  singleAction: 'flex justify-center mt-2'
};

const successButtonClass = `${swalCustomClasses.confirmButton} bg-green-500 text-white border-green-500 hover:bg-green-600`;
const errorButtonClass = `${swalCustomClasses.confirmButton} bg-red-500 text-white border-red-500 hover:bg-red-600`;
const warningButtonClass = `${swalCustomClasses.confirmButton} bg-yellow-500 text-white border-yellow-500 hover:bg-yellow-600`;
const cancelButtonClass = `${swalCustomClasses.cancelButton} text-gray-700 border-gray-400 hover:bg-gray-100`;

// 2. HAPUS DEFINISI MODAL LOKAL YANG LAMA

export default function JadwalLab() {
  useTitle('Dashboard Pengajuan Jadwal Lab');

  const authContextValue = useContext(AuthContext);
  const authState = authContextValue?.state;
  const currentUser = authState?.user;
  const userRole = authState?.role;
  const authIsLoading = authContextValue?.isLoading || authState?.isLoading || false;

  const [stats, setStats] = useState({ menunggu: 0, disetujui: 0, ditolak: 0, total_filter: 0 });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [labs, setLabs] = useState([]);
  const [selectedLabId, setSelectedLabId] = useState('all');
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // State untuk modal reject baru
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [currentRequestToProcess, setCurrentRequestToProcess] = useState(null);
  const [isSubmittingReject, setIsSubmittingReject] = useState(false); // 3. State untuk status submit modal reject
  // State `rejectionReason` dipindahkan ke dalam RejectPengajuanModal

  const fetchData = useCallback(async () => {
    // ... (fetchData tetap sama seperti di respons sebelumnya)
    if (!userRole) {
      console.warn("JadwalLab: userRole tidak tersedia dari AuthContext saat fetchData.");
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    try {
      const apiParams = {};
      if (userRole === 'Admin' && selectedLabId !== 'all' && selectedLabId !== '') {
        apiParams.lab_id = selectedLabId;
      }
      const statsData = await get('/pengajuan/statistik', apiParams);
      setStats(statsData || { menunggu: 0, disetujui: 0, ditolak: 0, total_filter: 0 });
      const requestsData = await get('/pengajuan/menunggu', apiParams);
      setPendingRequests(requestsData || []);
      if (userRole === 'Admin' && labs.length === 0) {
        const labsResponse = await get('/lab/');
        setLabs(labsResponse.data || []);
      }
    } catch (err) {
      console.error("Error fetching data dashboard JadwalLab:", err);
      if (!err.message?.includes('aborted')) {
        Swal.fire({
          title: 'Gagal Memuat Data',
          text: err.message || err.error || 'Terjadi kesalahan saat memuat data dashboard.',
          icon: 'error',
          confirmButtonText: 'OK',
          customClass: {
            confirmButton: errorButtonClass,
            actions: swalCustomClasses.singleAction
          },
          buttonsStyling: false,
        });
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [userRole, selectedLabId, labs.length]);

  useEffect(() => {
    if (!authIsLoading && currentUser) {
      fetchData();
    }
  }, [authIsLoading, currentUser, fetchData]);

  useEffect(() => {
    // ... (logika auto-refresh tetap sama seperti di respons sebelumnya)
    if (!authIsLoading && currentUser) {
      const intervalId = setInterval(() => {
        if (!isLoadingData && !showRejectModal && !isSubmittingReject) { // Tambahkan !isSubmittingReject
          console.log('Auto-refreshing JadwalLab data...');
          fetchData();
        }
      }, AUTO_REFRESH_INTERVAL_MS);
      return () => clearInterval(intervalId);
    }
  }, [authIsLoading, currentUser, fetchData, isLoadingData, showRejectModal, isSubmittingReject]);


  const handleLabChange = (event) => {
    setSelectedLabId(event.target.value);
  };

  const handleApprove = async (pengajuanId) => {
    // ... (handleApprove tetap sama)
    Swal.fire({
      title: 'Konfirmasi Persetujuan',
      text: "Apakah Anda yakin ingin menyetujui pengajuan ini?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Setujui!',
      cancelButtonText: 'Batal',
      customClass: {
        confirmButton: successButtonClass,
        cancelButton: cancelButtonClass,
        actions: swalCustomClasses.actions
      },
      buttonsStyling: false,
      reverseButtons: true
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsLoadingData(true); // Bisa juga menggunakan state submitting sendiri
        try {
          const response = await post(`/pengajuan/${pengajuanId}/approve`, {});
          Swal.fire({
            title: 'Berhasil!',
            text: response.data.message || "Pengajuan berhasil disetujui.",
            icon: 'success',
            confirmButtonText: 'OK',
            customClass: {
              confirmButton: successButtonClass,
              actions: swalCustomClasses.singleAction
            },
            buttonsStyling: false
          });
          fetchData();
        } catch (err) {
          Swal.fire({
            title: 'Gagal!',
            text: err.message || err.error || 'Gagal menyetujui pengajuan.',
            icon: 'error',
            confirmButtonText: 'OK',
            customClass: {
              confirmButton: errorButtonClass,
              actions: swalCustomClasses.singleAction
            },
            buttonsStyling: false
          });
        } finally {
          setIsLoadingData(false);
        }
      }
    });
  };

  // 4. Fungsi untuk membuka modal reject
  const openRejectModal = (request) => {
    setCurrentRequestToProcess(request);
    setShowRejectModal(true);
  };

  // 5. Fungsi yang akan di-pass ke RejectPengajuanModal sebagai prop `onSubmit`
  const handleSubmitRejection = async (pengajuanId, reason) => {
    // Validasi alasan sudah dilakukan di dalam modal, tapi bisa ditambahkan double check jika perlu
    setIsSubmittingReject(true);
    try {
      const response = await post(`/pengajuan/${pengajuanId}/reject`, { alasan_penolakan: reason });
      setShowRejectModal(false);
      setCurrentRequestToProcess(null); // Bersihkan request yang sedang diproses
      Swal.fire({
        title: 'Berhasil Ditolak!',
        text: response.data.message || "Pengajuan berhasil ditolak.",
        icon: 'success',
        confirmButtonText: 'OK',
        customClass: {
          confirmButton: successButtonClass, // Atau warningButtonClass jika dirasa lebih sesuai untuk notif 'tolak'
          actions: swalCustomClasses.singleAction
        },
        buttonsStyling: false
      });
      fetchData(); // Refresh data setelah berhasil
    } catch (err) {
      Swal.fire({
        title: 'Gagal Menolak!',
        text: err.message || err.error || 'Terjadi kesalahan saat mencoba menolak pengajuan.',
        icon: 'error',
        confirmButtonText: 'OK',
        customClass: {
          confirmButton: errorButtonClass,
          actions: swalCustomClasses.singleAction
        },
        buttonsStyling: false
      });
      // Pertimbangkan apakah modal tetap dibuka atau ditutup jika gagal
      // setShowRejectModal(false); 
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const headTablePengajuan = [
    // ... (headTablePengajuan tetap sama)
    { judul: "No." }, { judul: "Nama Lab" }, { judul: "Guru" },
    { judul: "Tgl. Pakai" }, { judul: "Jam" }, { judul: "Kelas" },
    { judul: "Mapel" }, { judul: "Kegiatan" }, { judul: "Diajukan" },
    { judul: "Aksi" }
  ];

  const renderPendingRequestRow = (req, index) => (
    // ... (renderPendingRequestRow tetap sama, pastikan onClick tombol tolak memanggil openRejectModal(req))
    <tr key={req.pengajuan_id} className="bg-white border-b hover:bg-gray-50">
      <td className="px-6 py-4 text-gray-700">{index + 1}</td>
      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{req.nama_lab}</td>
      <td className="px-6 py-4 text-gray-700">{req.guru_nama}</td>
      <td className="px-6 py-4 text-gray-700">{new Date(req.tanggal_pakai).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
      <td className="px-6 py-4 text-gray-700">{req.jam_mulai} - {req.jam_selesai}</td>
      <td className="px-6 py-4 text-gray-700">{req.kelas}</td>
      <td className="px-6 py-4 text-gray-700">{req.mata_pelajaran}</td>
      <td className="px-6 py-4 text-gray-700 min-w-[150px] max-w-[250px] truncate" title={req.kegiatan}>{req.kegiatan}</td>
      <td className="px-6 py-4 text-gray-700">{new Date(req.tanggal_pengajuan).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
      <td className='px-6 py-4 text-center'>
        <div className='flex items-center justify-center space-x-2'>
            <button
                onClick={() => handleApprove(req.pengajuan_id)}
                className="p-2 text-green-600 hover:text-green-800 rounded-full hover:bg-green-100 transition-colors duration-150"
                title="Setujui Pengajuan"
            >
                <FaCheckCircle size={18} />
            </button>
            <button
                onClick={() => openRejectModal(req)} // Memanggil openRejectModal
                className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-100 transition-colors duration-150"
                title="Tolak Pengajuan"
            >
                <FaTimesCircle size={18} />
            </button>
        </div>
      </td>
    </tr>
  );

  if (authIsLoading) {
    return ( <Dashboard> <div className="p-5 text-center"><p>Memverifikasi autentikasi pengguna...</p></div> </Dashboard> );
  }
  if (!currentUser) {
    return ( <Dashboard> <div className="p-5 text-center"><p>Silakan login untuk mengakses halaman ini.</p></div> </Dashboard> );
  }

  return (
    <Dashboard>
      <div className="p-4 md:p-6 space-y-6">
        {/* ... (Bagian header dan filter lab tetap sama) ... */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <h2 className="text-2xl font-semibold text-gray-800 flex-grow">
                Dashboard Pengajuan Jadwal Lab
              {userRole === 'Kepala Lab' && currentUser?.id && labs.find(lab => String(lab.kepala_lab_id) === String(currentUser.id))
                ? ` (${labs.find(lab => String(lab.kepala_lab_id) === String(currentUser.id)).nama_lab})`
                : ''
              }
            </h2>
            {userRole === 'Admin' && (
              <div className="w-full sm:w-auto sm:min-w-[200px] md:min-w-[250px]">
                <label htmlFor="labFilterDashboard" className="sr-only">Filter berdasarkan Lab:</label>
                <select
                  id="labFilterDashboard"
                  value={selectedLabId}
                  onChange={handleLabChange}
                  className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-maroon-500 focus:border-maroon-500 block w-full p-2.5"
                >
                  <option value="all">Tampilkan Semua Lab</option>
                  {labs.map(lab => ( <option key={lab.lab_id} value={lab.lab_id.toString()}> {lab.nama_lab} </option> ))}
                </select>
              </div>
            )}
        </div>
        
        <Tabel
          title={`Pengajuan Menunggu Persetujuan (${stats.menunggu || 0})`}
          breadcrumbContext={userRole || "User"}
          headers={headTablePengajuan}
          data={pendingRequests}
          renderRow={renderPendingRequestRow}
          itemsPerPage={10}
        >
          {/* ... (Indikator loading dan pesan data kosong di tabel tetap sama) ... */}
          {isLoadingData && (
            <tr>
              <td colSpan={headTablePengajuan.length} className="text-center py-10 text-gray-500">
                <div className="flex flex-col justify-center items-center">
                  <svg className="animate-spin h-8 w-8 text-maroon-600 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Memuat data pengajuan...</span>
                </div>
              </td>
            </tr>
          )}
          {!isLoadingData && pendingRequests.length === 0 && (
             <tr>
                <td colSpan={headTablePengajuan.length} className="text-center py-10 text-gray-500">
                    Tidak ada pengajuan yang menunggu persetujuan.
                </td>
            </tr>
          )}
        </Tabel>

        {/* 6. MENGGUNAKAN KOMPONEN MODAL BARU */}
        {showRejectModal && currentRequestToProcess && (
          <RejectPengajuanModal
            requestData={currentRequestToProcess}
            onClose={() => {
              setShowRejectModal(false);
              setCurrentRequestToProcess(null); // Pastikan reset saat modal ditutup
            }}
            onSubmit={handleSubmitRejection} // Mengirim fungsi submit utama
            isSubmitting={isSubmittingReject} // Mengirim status submitting
          />
        )}
      </div>
    </Dashboard>
  );
}
