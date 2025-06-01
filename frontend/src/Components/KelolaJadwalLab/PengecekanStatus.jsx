import React, { useState, useEffect, useContext } from 'react';
import Dashboard from '../../Layouts/Dashboard'; // Sesuaikan path jika berbeda
import Tabel from '../../Layouts/Table';       // Sesuaikan path jika berbeda
import { get } from '../../utils/api';           // Sesuaikan path jika berbeda
import useTitle from '../../utils/useTitle';     // Sesuaikan path jika berbeda
import { AuthContext } from '../../context/AuthContext'; // SESUAIKAN PATH INI JIKA PERLU
import Notification from '../../Components/Notification/Notif'; // Sesuaikan path jika berbeda
// import { FaEye } from 'react-icons/fa';

// Fungsi untuk memotong teks jika terlalu panjang
const truncateText = (text, maxLength) => {
  if (text && typeof text === 'string' && text.length > maxLength) {
    return text.substring(0, maxLength) + '...';
  }
  return text || '';
};

export default function PengecekanStatus() {
  useTitle('Status Pengajuan Jadwal Lab Saya');

  // Menggunakan AuthContext
  // authState akan memiliki struktur: { isAuthenticated, user (username string), userId, fullName, token, role, lab_id_kepala, isLoading }
  const { state: authState } = useContext(AuthContext);

  // State lokal komponen
  const [pengajuanData, setPengajuanData] = useState([]);
  // isLoading lokal bisa dimulai true atau sinkron dengan authState.isLoading
  const [isLoading, setIsLoading] = useState(true); 
  const [errorMsg, setErrorMsg] = useState('');

  const headTable = [
    { judul: "No." },
    { judul: "Nama Lab" },
    { judul: "Tanggal Pakai" },
    { judul: "Jam" },
    { judul: "Kelas" },
    { judul: "Mata Pelajaran" },
    { judul: "Kegiatan" },
    { judul: "Diajukan Pada" },
    { judul: "Status" },
    { judul: "Alasan Penolakan", className: "min-w-[200px]" },
    { judul: "Diproses Oleh" },
    { judul: "Waktu Proses" },
    // { judul: "Aksi" },
  ];

  const fetchData = async () => {
    // Menggunakan authState.userId langsung
    if (!authState.userId) {
      const noUserMsg = "Data pengguna tidak lengkap (userId tidak ditemukan di AuthContext). Tidak dapat mengambil data pengajuan.";
      console.warn("fetchData check failed:", noUserMsg, "Current authState:", authState);
      setErrorMsg(noUserMsg);
      setIsLoading(false); // Pastikan loading berhenti
      setPengajuanData([]);
      return;
    }

    setIsLoading(true); // Set loading true sebelum fetch
    setErrorMsg('');
    console.log(`Memulai fetchData untuk userId: ${authState.userId}`);

    // ... (di dalam try blok fetchData) ...
    try {
      // Asumsikan 'get' mengembalikan array data secara langsung
      const dataArray = await get('/pengajuan/status');

      // Tambahkan log ini untuk memastikan apa yang Anda terima dari 'get'
      console.log("Data diterima langsung dari get('/pengajuan/status'):", dataArray);
      console.log("Apakah dataArray sebuah array?", Array.isArray(dataArray));

      // Sesuaikan kondisi if untuk langsung memeriksa apakah dataArray adalah array
      if (dataArray && Array.isArray(dataArray)) {
        console.log("Data array valid dan akan di-set ke state:", JSON.stringify(dataArray, null, 2));
        setPengajuanData(dataArray); // Langsung set dataArray ke state
      } else {
        console.warn("Data dari /pengajuan/status tidak seperti yang diharapkan (bukan array, null, atau undefined):", dataArray);
        setPengajuanData([]); // Set data kosong jika tidak sesuai harapan
        // Anda bisa menambahkan setErrorMsg di sini jika dataArray null atau undefined,
        // menandakan tidak ada data yang diterima dengan benar.
        if (dataArray === null || typeof dataArray === 'undefined') {
           setErrorMsg("Tidak ada data yang diterima dari server atau format tidak dikenal.");
        } else if (!Array.isArray(dataArray)) {
           setErrorMsg("Format data yang diterima dari server bukan array.");
        }
      }
    } catch (err) {
      // ... (error handling tetap sama) ...
      console.error("Error fetching status pengajuan:", err);
      const message = err.response?.data?.message || err.message || 'Terjadi kesalahan pada server.';
      setErrorMsg(`Gagal mengambil data pengajuan: ${message}`);
      setPengajuanData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log("useEffect PengecekanStatus - authState dari AuthContext:", authState);
    
    // Sinkronkan isLoading state lokal dengan isLoading dari AuthContext jika perlu
    // Ini membantu jika ada loading global yang ingin ditampilkan komponen ini juga
    if (authState.isLoading) {
        setIsLoading(true);
        return; // Jangan lakukan apa-apa jika AuthContext masih loading
    }

    // AuthContext sudah tidak loading, sekarang cek userId
    if (authState.userId) {
      fetchData();
    } else {
      // AuthContext tidak loading, tapi tidak ada userId
      setIsLoading(false); // Pastikan loading berhenti
      let msg = "Tidak dapat memuat data pengajuan.";
      if (!authState.isAuthenticated) {
          msg += " Pengguna tidak terautentikasi.";
      } else { // Terautentikasi (menurut context) tapi tidak ada userId (ini seharusnya tidak terjadi jika LOGIN_SUCCESS benar)
          msg += " Data pengguna (userId) tidak ditemukan setelah autentikasi.";
      }
      console.log("useEffect PengecekanStatus - Kondisi userId tidak ada:", msg, "authState:", authState);
      setErrorMsg(msg);
      setPengajuanData([]);
    }
  }, [authState]); // Bereaksi terhadap perubahan apapun di authState (termasuk userId, isLoading, isAuthenticated)


  const renderPengajuanRow = (item, index) => {
    if (!item) {
      // ... (handling item tidak valid, sama seperti sebelumnya)
      return ( <tr className="bg-red-50 border-b dark:bg-red-900 dark:border-red-700"><td colSpan={headTable.length} className="px-4 py-3 text-center text-red-700 dark:text-red-300">Data baris tidak valid.</td></tr> );
    }

    const formatDate = (dateString) => { /* ... implementasi sama ... */ if (!dateString) return '-'; try { return new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) { console.warn("Invalid date for formatDate:", dateString); return 'Tanggal Invalid'; } };
    const formatDateTime = (dateString) => { /* ... implementasi sama ... */ if (!dateString) return '-'; try { return new Date(dateString).toLocaleString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { console.warn("Invalid date for formatDateTime:", dateString); return 'Waktu Invalid'; } };

    let statusClass = 'bg-gray-100 text-gray-900';
    let statusText = item.status ? String(item.status) : 'N/A';

    if (item.status && typeof item.status === 'string') {
        switch (item.status.toLowerCase()) {
            case 'disetujui': statusClass = 'bg-green-100 text-green-700'; break;
            case 'ditolak': statusClass = 'bg-red-100 text-red-700'; break;
            case 'menunggu': case 'pending': statusClass = 'bg-yellow-100 text-yellow-700'; statusText = 'Menunggu Persetujuan'; break;
            default: break;
        }
    } else if (item.status) {
        console.warn("Field 'status' bukan string:", item.status); statusText = `Status (${String(item.status)})`;
    }

    return (
      <tr className="bg-white border-b " key={item.pengajuan_id || `pengajuan-idx-${index}`}>
        <td className="px-4 py-3 text-gray-900 ">{index + 1}</td>
        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap ">{item.nama_lab || <span className="text-xs text-red-500 italic">(nama lab?)</span>}</td>
        <td className="px-4 py-3 text-gray-900 ">{formatDate(item.tanggal_pakai)}</td>
        <td className="px-4 py-3 text-gray-900  whitespace-nowrap">{item.jam_mulai || '?'} - {item.jam_selesai || '?'}</td>
        <td className="px-4 py-3 text-gray-900 ">{item.kelas || '-'}</td>
        <td className="px-4 py-3 text-gray-900 ">{truncateText(item.mata_pelajaran, 20) || '-'}</td>
        <td className="px-4 py-3 text-gray-900  max-w-xs" title={item.kegiatan || ''}>{truncateText(item.kegiatan, 30) || '-'}</td>
        <td className="px-4 py-3 text-gray-900 ">{formatDateTime(item.tanggal_pengajuan)}</td>
        <td className="px-4 py-3 text-center"><span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${statusClass}`}>{statusText}</span></td>
        <td className="px-4 py-3 text-gray-900  min-w-[200px]" title={item.alasan_penolakan || ''}>{item.alasan_penolakan || (item.status?.toLowerCase() === 'ditolak' ? <span className="italic text-gray-500">Tidak ada alasan</span> : '-')}</td>
        <td className="px-4 py-3 text-gray-900 ">{item.nama_penyetuju || ((item.status?.toLowerCase() === 'menunggu' || item.status?.toLowerCase() === 'pending') ? '-' : 'N/A')}</td>
        <td className="px-4 py-3 text-gray-900 ">{item.waktu_persetujuan ? formatDateTime(item.waktu_persetujuan) : ((item.status?.toLowerCase() === 'menunggu' || item.status?.toLowerCase() === 'pending') ? '-' : 'N/A')}</td>
      </tr>
    );
  };

  console.log("Render PengecekanStatus - isLoading:", isLoading, "| authState.isLoading:", authState.isLoading, "| authState.userId:", authState.userId, "| pengajuanData count:", pengajuanData.length, "| errorMsg:", `"${errorMsg}"`);

  return (
    <Dashboard title="Status Pengajuan Jadwal Lab Saya">
      <div className="p-4 md:p-6">
        {errorMsg && (
          <div className="mb-4">
            <Notification type="error" message={errorMsg} onClose={() => setErrorMsg('')} />
          </div>
        )}

        <Tabel
          // Menggunakan authState.fullName atau authState.user (username)
          title={`Riwayat Pengajuan Lab ${authState.fullName ? `oleh ${authState.fullName}` : (authState.user || 'Anda')}`}
          // Menggunakan authState.role
          breadcrumbContext={authState.role || "User"}
          headers={headTable}
          data={pengajuanData}
          renderRow={renderPengajuanRow}
          itemsPerPage={10}
        >
          {/* State Loading dan Data Kosong */}
          {isLoading && ( // Menggunakan isLoading state lokal, yang bisa dipengaruhi authState.isLoading
            <tr>
              <td colSpan={headTable.length} className="text-center py-20 text-gray-500 dark:text-gray-400">
                <div className="flex flex-col justify-center items-center">
                  <svg className="animate-spin h-10 w-10 text-indigo-600 mb-3" /* ...ikon loading... */ ></svg>
                  <span className="text-lg">Memuat riwayat pengajuan Anda...</span>
                </div>
              </td>
            </tr>
          )}
          {!isLoading && pengajuanData.length === 0 && (
            <tr>
              <td colSpan={headTable.length} className="text-center py-20 text-gray-500 dark:text-gray-400 text-lg">
                {errorMsg && !errorMsg.toLowerCase().includes("pengguna tidak terautentikasi") && !errorMsg.toLowerCase().includes("data pengguna")
                  ? 'Gagal memuat data. Silakan periksa konsol untuk detail atau coba lagi.'
                  : 'Anda belum memiliki riwayat pengajuan jadwal lab.'}
              </td>
            </tr>
          )}
        </Tabel>
      </div>
    </Dashboard>
  );
}
