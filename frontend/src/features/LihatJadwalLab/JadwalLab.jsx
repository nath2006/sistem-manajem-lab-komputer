import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import Dashboard from '../../Layouts/Dashboard'; // Sesuaikan path jika perlu
import { AuthContext } from '../../Context/AuthContext'; // Sesuaikan path jika perlu
import { get } from '../../utils/api'; // Sesuaikan path jika perlu
import useTitle from '../../utils/useTitle'; // Sesuaikan path jika perlu
import Swal from 'sweetalert2';
import { FaCalendarAlt, FaSyncAlt, FaPrint } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const swalErrorButtonClass = 'px-5 py-2 text-sm font-semibold text-center bg-red-500 text-white border-2 border-red-500 rounded-md active:scale-95 focus:outline-none hover:bg-red-600';

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
const JAM_SLOTS = Array.from({ length: 10 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`); // 07:00 - 16:00

// Helper untuk mendapatkan info Senin-Jumat dari minggu suatu tanggal referensi (untuk TAMPILAN GRID)
const getInfoMingguKalenderUntukGrid = (tanggalReferensiInput = new Date()) => {
  const tanggalKalkulasi = new Date(tanggalReferensiInput);
  let hariAcuanUntukGrid = new Date(tanggalKalkulasi);

  const dayOfWeek = hariAcuanUntukGrid.getDay(); // 0 (Minggu) - 6 (Sabtu)

  if (dayOfWeek === 0) { // Minggu
    hariAcuanUntukGrid.setDate(hariAcuanUntukGrid.getDate() + 1);
  } else if (dayOfWeek === 6) { // Sabtu
    hariAcuanUntukGrid.setDate(hariAcuanUntukGrid.getDate() + 2);
  } else {
    hariAcuanUntukGrid.setDate(hariAcuanUntukGrid.getDate() - (dayOfWeek - 1));
  }

  const senin = new Date(hariAcuanUntukGrid.getFullYear(), hariAcuanUntukGrid.getMonth(), hariAcuanUntukGrid.getDate());
  const jumat = new Date(senin);
  jumat.setDate(senin.getDate() + 4);
  const formatDate = (date) => date.toISOString().split('T')[0];
  return {
    start_date_grid: formatDate(senin),
    end_date_grid: formatDate(jumat),
    display_grid: `${senin.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${jumat.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    refDateUntukGrid: senin,
  };
};

// Helper untuk mendapatkan periode 7 hari untuk PENGAMBILAN DATA API
const getPeriodeDataTujuhHari = (tanggalMulaiReferensiInput = new Date()) => {
  const tanggalMulai = new Date(tanggalMulaiReferensiInput);
  const tanggalSelesai = new Date(tanggalMulai);
  tanggalSelesai.setDate(tanggalMulai.getDate() + 6); // +6 hari untuk total 7 hari
  const formatDate = (date) => date.toISOString().split('T')[0];
  return {
    start_date_api: formatDate(tanggalMulai),
    end_date_api: formatDate(tanggalSelesai),
    display_api: `Data untuk: ${tanggalMulai.toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})} s/d ${tanggalSelesai.toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})}`,
    refDateUntukData: tanggalMulai,
  };
};


export default function LihatJadwalLab() {
  useTitle('Lihat Jadwal Lab');
  const { state: authState, isLoading: authIsLoading } = useContext(AuthContext);
  // Mengambil lab_id_kepala langsung dari authState, dan currentUser tetap dari authState.user (jika ada)
  const { user: currentUser, role: userRole, lab_id_kepala: kepalaLabIdFromContext } = authState || {};

  // LOG 1: Verifikasi Data Konteks Pengguna
  console.log('DEBUG_AUTENTIKASI: AuthContext Data ->', { currentUser, userRole, authIsLoading, kepalaLabIdFromContext });

  const [labs, setLabs] = useState([]);
  const [selectedLabId, setSelectedLabId] = useState('');
  const [namaSelectedLab, setNamaSelectedLab] = useState('');
  const [jadwalData, setJadwalData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [modeTanggal, setModeTanggal] = useState('otomatis');
  const [referensiTanggalAwal, setReferensiTanggalAwal] = useState(new Date()); 

  const periodeDataUntukAPI = useMemo(() => getPeriodeDataTujuhHari(referensiTanggalAwal), [referensiTanggalAwal]);
  const tampilanMingguGrid = useMemo(() => getInfoMingguKalenderUntukGrid(referensiTanggalAwal), [referensiTanggalAwal]);
  
  const inputTanggalPilihan = useMemo(() => periodeDataUntukAPI.start_date_api, [periodeDataUntukAPI.start_date_api]);

  const [processedJadwal, setProcessedJadwal] = useState({});

  useEffect(() => {
    const getLabsList = async () => {
        try {
            const labsResponse = await get('/lab/'); 
            const fetchedLabs = labsResponse.data || [];
            setLabs(fetchedLabs);
            console.log('DEBUG_LABS: Daftar Lab berhasil diambil ->', fetchedLabs);
            return fetchedLabs;
        } catch (err) {
            console.error("DEBUG_LABS_ERROR: Error fetching labs list:", err);
            setLabs([]);
            Swal.fire({
                title: 'Gagal Memuat Daftar Lab', text: err.message || err.error || 'Terjadi kesalahan saat mengambil daftar lab.', icon: 'error',
                confirmButtonText: 'OK', customClass: { confirmButton: swalErrorButtonClass, actions: 'flex justify-center mt-2' }, buttonsStyling: false,
            });
            return [];
        }
    };

    // LOG 2: Lacak Pengaturan selectedLabId berdasarkan Peran
    console.log('DEBUG_ROLE_EFFECT: Role Effect Triggered -> User Role:', userRole, 'kepalaLabIdFromContext:', kepalaLabIdFromContext);

    if (userRole === 'Admin') {
      console.log('DEBUG_ROLE_EFFECT: Role is Admin');
      const initAdminLabs = async () => {
        const fetchedLabs = await getLabsList();
        // Admin harus memilih, jadi selectedLabId dikosongkan awal
        setSelectedLabId(''); 
        setNamaSelectedLab('');
      };
      initAdminLabs();
    } else if (userRole === 'Kepala Lab' && kepalaLabIdFromContext) { 
      console.log('DEBUG_ROLE_EFFECT: Role is Kepala Lab. Lab ID from context (authState.lab_id_kepala):', kepalaLabIdFromContext);
      setSelectedLabId(kepalaLabIdFromContext.toString());
      const fetchLabDetail = async () => {
          try {
            const labDetail = await get(`/lab/${kepalaLabIdFromContext}`); 
            setNamaSelectedLab(labDetail.data?.nama_lab || `Lab ID ${kepalaLabIdFromContext}`);
            console.log('DEBUG_KEPALA_LAB: Detail Lab Kepala Lab ->', labDetail.data);
          } catch (e) {
            setNamaSelectedLab(`Lab ID ${kepalaLabIdFromContext}`);
            console.error(`DEBUG_KEPALA_LAB_ERROR: Error fetching detail for lab ID ${kepalaLabIdFromContext}:`, e);
          }
      }
      fetchLabDetail();
    } else if (userRole === 'Guru') {
      console.log('DEBUG_ROLE_EFFECT: Role is Guru');
      const initGuruLabs = async () => {
        await getLabsList(); 
        setSelectedLabId(''); 
        setNamaSelectedLab('');
      };
      initGuruLabs();
    }
  }, [userRole, kepalaLabIdFromContext]); // currentUser dihapus jika tidak digunakan langsung di sini, kepalaLabIdFromContext ditambahkan

  const fetchJadwal = useCallback(async () => {
    console.log('DEBUG_FETCH_JADWAL: fetchJadwal CALLED. current selectedLabId:', selectedLabId, 'Periode API:', periodeDataUntukAPI);
    if (!selectedLabId) {
      console.log('DEBUG_FETCH_JADWAL: selectedLabId is EMPTY, returning.');
      setJadwalData([]);
      setProcessedJadwal({});
      return;
    }
    
    setIsLoading(true);
    try {
      const params = {
        start_date: periodeDataUntukAPI.start_date_api, 
        end_date: periodeDataUntukAPI.end_date_api,
        lab_id: selectedLabId,
      };
      console.log('DEBUG_FETCH_JADWAL: API Request Params ->', params);
      const response = await get('/jadwal-lab', params); 
      console.log("DEBUG_FETCH_JADWAL: API Response for /jadwal-lab ->", response); 
      setJadwalData(response.data || []);
    } catch (err) {
      console.error("DEBUG_FETCH_JADWAL_ERROR: Error fetching jadwal lab:", err.response ? err.response.data : err.message);
      setJadwalData([]);
      const errorMessage = err.response?.data?.message || err.message || 'Terjadi kesalahan saat memuat jadwal.';
      Swal.fire({
        title: 'Gagal Memuat Jadwal', text: errorMessage, icon: 'error',
        confirmButtonText: 'OK', customClass: { confirmButton: swalErrorButtonClass, actions: 'flex justify-center mt-2' }, buttonsStyling: false,
      });
    } finally { setIsLoading(false); }
  }, [selectedLabId, periodeDataUntukAPI.start_date_api, periodeDataUntukAPI.end_date_api]);

  useEffect(() => {
    console.log('DEBUG_EFFECT_FETCH_TRIGGER: Effect for fetchJadwal TRIGGERED. current selectedLabId:', selectedLabId);
    if (selectedLabId) { 
        fetchJadwal();
    } else {
        setJadwalData([]);
        setProcessedJadwal({});
    }
  }, [fetchJadwal, selectedLabId]);

  useEffect(() => {
    console.log('DEBUG_PROCESS_JADWAL: Processing jadwalData. Current jadwalData ->', JSON.parse(JSON.stringify(jadwalData)));
    console.log('DEBUG_PROCESS_JADWAL: Grid dates for processing -> start:', tampilanMingguGrid.start_date_grid, 'end:', tampilanMingguGrid.end_date_grid);

    const newProcessedJadwal = {};
    HARI.forEach((hari) => {
      newProcessedJadwal[hari] = {};
      JAM_SLOTS.forEach(jam => { newProcessedJadwal[hari][jam] = null; });
    });

    const parseDateAsLocal = (dateString) => {
        const [year, month, day] = dateString.substring(0,10).split('-').map(Number);
        return new Date(year, month - 1, day); 
    };

    const tglGridMulaiObj = parseDateAsLocal(tampilanMingguGrid.start_date_grid);
    const tglGridSelesaiObj = parseDateAsLocal(tampilanMingguGrid.end_date_grid);

    (jadwalData || []).forEach(item => { 
      const tanggalItemObj = parseDateAsLocal(item.tanggal); 
      console.log('DEBUG_PROCESS_JADWAL_ITEM: Processing item_id:', item.jadwal_id, 'item_tanggal:', item.tanggal, 'parsed_item_date:', tanggalItemObj);

      if (tanggalItemObj >= tglGridMulaiObj && tanggalItemObj <= tglGridSelesaiObj) {
        console.log('DEBUG_PROCESS_JADWAL_ITEM: Item ID', item.jadwal_id, 'IS IN grid date range.');
        const hariItemIndex = tanggalItemObj.getDay(); 
        const targetHariIndex = hariItemIndex === 0 ? 6 : hariItemIndex - 1; 
        
        if (targetHariIndex >= 0 && targetHariIndex < HARI.length) { 
          const namaHari = HARI[targetHariIndex];
          const jamMulaiInt = parseInt(item.jam_mulai.split(':')[0]);
          const jamSelesaiInt = parseInt(item.jam_selesai.split(':')[0]);
          let jamCursor = jamMulaiInt;
          let isStartCell = true;
          const duration = Math.max(1, jamSelesaiInt - jamMulaiInt);

          while (jamCursor < jamSelesaiInt && jamCursor < 17) { 
            const jamKey = `${String(jamCursor).padStart(2, '0')}:00`;
            if (JAM_SLOTS.includes(jamKey) && (!newProcessedJadwal[namaHari][jamKey] || !newProcessedJadwal[namaHari][jamKey]?.isOccupiedByOther)) {
              if (isStartCell) {
                newProcessedJadwal[namaHari][jamKey] = { ...item, rowspan: duration, isStartCell: true };
                isStartCell = false;
              } else {
                newProcessedJadwal[namaHari][jamKey] = { isOccupiedByOther: true };
              }
            }
            jamCursor++;
          }
        } else {
          console.warn('DEBUG_PROCESS_JADWAL_ITEM: targetHariIndex out of bounds for item ID', item.jadwal_id, 'targetHariIndex:', targetHariIndex);
        }
      } else {
        console.log('DEBUG_PROCESS_JADWAL_ITEM: Item ID', item.jadwal_id, 'IS NOT IN grid date range. ItemDate:', tanggalItemObj, 'GridStart:', tglGridMulaiObj, 'GridEnd:', tglGridSelesaiObj);
      }
    });
    console.log('DEBUG_PROCESS_JADWAL: setProcessedJadwal complete. newProcessedJadwal ->', JSON.parse(JSON.stringify(newProcessedJadwal)));
    setProcessedJadwal(newProcessedJadwal);
  }, [jadwalData, tampilanMingguGrid.start_date_grid, tampilanMingguGrid.end_date_grid]);

  const handleLabChange = (event) => {
    const newLabId = event.target.value;
    console.log('DEBUG_HANDLE_LAB_CHANGE: Lab selected by Guru/Admin ->', newLabId);
    setSelectedLabId(newLabId);
    const selectedLabObj = labs.find(lab => lab.lab_id.toString() === newLabId);
    setNamaSelectedLab(selectedLabObj ? selectedLabObj.nama_lab : '');
  };
  
  const gantiPeriodeData = (offset) => {
    setModeTanggal('manual');
    const refLama = referensiTanggalAwal;
    const refBaru = new Date(refLama);
    refBaru.setDate(refLama.getDate() + offset * 7); 
    setReferensiTanggalAwal(refBaru);
    console.log('DEBUG_PERIODE: gantiPeriodeData, referensiTanggalAwal baru ->', refBaru);
  };

  const handleTanggalManualChange = (event) => {
    const tanggalDipilihString = event.target.value;
    if (tanggalDipilihString) {
      setModeTanggal('manual');
      const [year, month, day] = tanggalDipilihString.split('-').map(Number);
      const tanggalBaru = new Date(year, month - 1, day);
      setReferensiTanggalAwal(tanggalBaru);
      console.log('DEBUG_PERIODE: handleTanggalManualChange, referensiTanggalAwal baru ->', tanggalBaru);
    }
  };

  const kembaliKeModeOtomatis = () => {
    setModeTanggal('otomatis');
    const tanggalHariIni = new Date();
    setReferensiTanggalAwal(tanggalHariIni); 
    console.log('DEBUG_PERIODE: kembaliKeModeOtomatis, referensiTanggalAwal baru ->', tanggalHariIni);
  };

  const handleCetakJadwal = () => {
    if (!selectedLabId && (userRole === 'Admin' || userRole === 'Guru')) {
        Swal.fire('Info', 'Silakan pilih laboratorium terlebih dahulu.', 'info');
        return;
    }
    
    const adaDataDiGrid = Object.values(processedJadwal).some(hari => 
        Object.values(hari).some(jadwal => jadwal?.isStartCell)
    );

    if (!adaDataDiGrid) {
        Swal.fire('Info', 'Tidak ada data jadwal untuk dicetak pada tampilan grid minggu ini.', 'info');
        return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const namaLabUntukCetak = namaSelectedLab || (selectedLabId ? `Lab ID ${selectedLabId}` : 'Nama Lab Tidak Diketahui');
    doc.text(`Jadwal Laboratorium: ${namaLabUntukCetak}`, pageWidth / 2, margin + 2, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Periode Tampilan Grid: ${tampilanMingguGrid.display_grid}`, pageWidth / 2, margin + 7, { align: 'center' });
    doc.text(`Periode Data Aktual (API): ${periodeDataUntukAPI.display_api}`, pageWidth / 2, margin + 11, { align: 'center' });
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth - margin, margin + 2, { align: 'right' });

    const tableColumn = ["Jam", ...HARI];
    const tableRows = [];

    JAM_SLOTS.forEach(jam => {
        const rowData = [jam];
        HARI.forEach(hari => {
            const jadwalItem = processedJadwal[hari]?.[jam];
            if (jadwalItem?.isStartCell) {
                rowData.push(
                    `${jadwalItem.kelas || '-'}\n` +
                    `${jadwalItem.mata_pelajaran || '-'}\n` +
                    `(${jadwalItem.nama_guru || '-'})` +
                    `${jadwalItem.kegiatan ? '\nKeg: ' + jadwalItem.kegiatan.substring(0,18) + (jadwalItem.kegiatan.length > 18 ? '...' : '') : ''}`
                );
            } else if (jadwalItem?.isOccupiedByOther) {
                rowData.push(''); 
            } else {
                rowData.push('');
            }
        });
        tableRows.push(rowData);
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: margin + 18,
        theme: 'grid',
        headStyles: { fillColor: [107, 33, 168], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 7 },
        styles: { fontSize: 5.5, cellPadding: 0.7, halign: 'center', valign: 'middle', overflow: 'linebreak' },
        columnStyles: {
            0: { halign: 'center', fontStyle: 'bold', cellWidth: 15, fontSize: 6 },
            1: { cellWidth: (pageWidth - (margin*2) - 15) / 5 }, 
            2: { cellWidth: (pageWidth - (margin*2) - 15) / 5 },
            3: { cellWidth: (pageWidth - (margin*2) - 15) / 5 },
            4: { cellWidth: (pageWidth - (margin*2) - 15) / 5 },
            5: { cellWidth: (pageWidth - (margin*2) - 15) / 5 },
        },
    });
    
    const namaFileLab = (namaSelectedLab || `Lab_ID_${selectedLabId}` || 'Jadwal_Lab').replace(/[\s/]/g, '_');
    doc.save(`Jadwal_${namaFileLab}_${tampilanMingguGrid.start_date_grid}_hingga_${tampilanMingguGrid.end_date_grid}.pdf`);
  };

  if (authIsLoading) return <Dashboard><div className="p-6 text-center">Memverifikasi autentikasi...</div></Dashboard>;
  // Jika currentUser (dari authState.user) tidak ada, mungkin lebih baik untuk user non-terotentikasi
  if (!userRole) return <Dashboard><div className="p-6 text-center">Silakan login untuk melihat jadwal.</div></Dashboard>;

  // Disederhanakan: Jika selectedLabId ada (baik dari pilihan Admin/Guru atau otomatis dari Kepala Lab), maka valid.
  const isLabValidForDisplay = !!selectedLabId; 

  console.log('DEBUG_RENDER: isLabValidForDisplay ->', isLabValidForDisplay, 'selectedLabId ->', selectedLabId, 'isLoading ->', isLoading, 'jadwalData.length ->', jadwalData.length, 'userRole ->', userRole, 'kepalaLabIdFromContext ->', kepalaLabIdFromContext);

  return (
    <Dashboard>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Lihat Jadwal Laboratorium</h1>
          {(userRole === 'Admin' || userRole === 'Guru') && (
            <div className="w-full sm:w-auto sm:min-w-[200px] md:min-w-[250px]">
              <select id="labFilterJadwal" value={selectedLabId} onChange={handleLabChange}
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-red-600 focus:red-purple-600 block w-full p-2.5"
                disabled={isLoading || labs.length === 0}>
                <option value="">{(labs.length === 0 && !isLoading && userRole !== 'Kepala Lab') ? 'Tidak ada lab' : 'Pilih Laboratorium'}</option>
                {labs.map(lab => (<option key={lab.lab_id} value={lab.lab_id.toString()}>{lab.nama_lab}</option>))}
              </select>
            </div>
          )}
          {/* Menampilkan nama lab untuk Kepala Lab (atau role lain yang labnya sudah ditentukan) */}
          {userRole === 'Kepala Lab' && namaSelectedLab && ( 
             <div className="text-lg font-medium text-gray-700">{namaSelectedLab}</div>
          )}
        </div>

        <div className="mb-4 p-4 bg-gray-50 rounded-lg shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <button onClick={() => gantiPeriodeData(-1)} disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2">
              &lt; <span className="hidden xs:inline">Periode Seb.</span>
            </button>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-700">
                {tampilanMingguGrid.display_grid}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                (Mode: {modeTanggal})
              </div>
            </div>
            <button onClick={() => gantiPeriodeData(1)} disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2">
              <span className="hidden xs:inline">Periode Berik.</span> &gt;
            </button>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3 border-t border-gray-200">
            <button onClick={kembaliKeModeOtomatis}
              disabled={isLoading || modeTanggal === 'otomatis'}
              className="w-full sm:w-auto px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              title="Lihat data untuk 7 hari mulai hari ini">
              <FaSyncAlt /> 7 Hari (Hari Ini)
            </button>
            <div className="w-full sm:w-auto relative flex items-center">
                <label htmlFor="inputTanggalManual" className="sr-only">Pilih Tanggal Awal Periode Data</label>
                <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input type="date" id="inputTanggalManual" value={inputTanggalPilihan}
                    onChange={handleTanggalManualChange} disabled={isLoading}
                    className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-purple-600 focus:border-purple-600 block p-2.5 pl-10"
                    title="Pilih tanggal awal untuk periode data 7 hari" />
            </div>
          </div>
            <p className="text-xs text-center text-gray-500 mt-1">{periodeDataUntukAPI.display_api}</p>
        </div>
        
        {/* Tombol Cetak hanya muncul jika lab valid (sudah dipilih/ditentukan) dan tidak sedang loading */}
        {isLabValidForDisplay && !isLoading && (
            <div className="flex justify-end mb-4">
                <button onClick={handleCetakJadwal}
                    className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 flex items-center gap-2 text-sm"
                    title="Cetak Jadwal Mingguan (Grid)">
                    <FaPrint /> Cetak Jadwal Grid
                </button>
            </div>
        )}

        {isLoading && (
          <div className="text-center py-10 text-gray-500">
            <div className="flex flex-col justify-center items-center">
              <svg className="animate-spin h-8 w-8 text-purple-600 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Memuat jadwal...</span>
            </div>
          </div>
        )}

        {/* Pesan untuk Admin/Guru jika belum memilih lab */}
        {!isLoading && (userRole === 'Admin' || userRole === 'Guru') && !selectedLabId && (
             <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow"> Silakan pilih laboratorium untuk menampilkan jadwal. </div>
        )}

        {/* Pesan jika lab sudah valid (terpilih/ditentukan) TAPI tidak ada data jadwal dari API */}
        {!isLoading && isLabValidForDisplay && jadwalData.length === 0 && (
            <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow"> Tidak ada jadwal untuk laboratorium dan periode data yang dipilih. </div>
        )}

        {/* Tabel ditampilkan jika tidak loading, lab valid, DAN ada data jadwal dari API */}
        {!isLoading && isLabValidForDisplay && jadwalData.length > 0 && (
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 border border-gray-300 text-left text-sm font-semibold text-gray-700 w-24 sticky left-0 bg-gray-100 z-10">Jam</th>
                  {HARI.map(hari => ( <th key={hari} className="p-3 border border-gray-300 text-center text-sm font-semibold text-gray-700 min-w-[150px] sm:min-w-[180px] md:min-w-[200px]">{hari}</th> ))}
                </tr>
              </thead>
              <tbody>
                {Object.keys(processedJadwal).length > 0 && JAM_SLOTS.map(jam => (
                  <tr key={jam}>
                    <td className="p-3 border border-gray-300 text-sm text-gray-600 align-top sticky left-0 bg-white z-10 h-20">{jam}</td>
                    {HARI.map(hari => {
                      const jadwalItem = processedJadwal[hari]?.[jam];
                      if (jadwalItem?.isStartCell) {
                        return (
                          <td key={`${hari}-${jam}`} 
                            className="p-2 border border-gray-300 align-top relative bg-red-50 hover:bg-purple-100 transition-colors"
                            rowSpan={jadwalItem.rowspan}>
                            <div className="text-xs text-red-800 h-full flex flex-col justify-start">
                              <p className="font-semibold">{jadwalItem.kelas}</p>
                              <p>{jadwalItem.mata_pelajaran}</p>
                              <p className="text-gray-600 text-[11px]">({jadwalItem.nama_guru})</p>
                              {jadwalItem.kegiatan && <p className="mt-1 text-gray-500 text-[10px] italic" title={jadwalItem.kegiatan}>{jadwalItem.kegiatan.length > 25 ? jadwalItem.kegiatan.substring(0,25) + '...' : jadwalItem.kegiatan}</p>}
                            </div>
                          </td>
                        );
                      } else if (jadwalItem?.isOccupiedByOther) {
                        return null; 
                      } else {
                        return <td key={`${hari}-${jam}`} className="p-2 border border-gray-300 h-20"></td>;
                      }
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Dashboard>
  );
}
