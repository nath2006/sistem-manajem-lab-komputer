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

// Helper untuk memformat Date object ke "YYYY-MM-DD" berdasarkan tanggal lokalnya
const formatDateToYYYYMMDD = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Bulan (0-11) jadi +1
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getInfoMingguKalenderUntukGrid = (tanggalReferensiInput = new Date()) => {
  const tanggalKalkulasi = new Date(tanggalReferensiInput);
  let hariAcuanUntukGrid = new Date(tanggalKalkulasi.getFullYear(), tanggalKalkulasi.getMonth(), tanggalKalkulasi.getDate()); // Set ke 00:00 lokal

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

  const startDateGridStr = formatDateToYYYYMMDD(senin);
  const endDateGridStr = formatDateToYYYYMMDD(jumat);
  
  // console.log(`[DEBUG getInfoMingguKalenderUntukGrid] Input: ${tanggalReferensiInput.toString()}, Senin Lokal: ${senin.toString()}, Jumat Lokal: ${jumat.toString()}, startDateGridStr: ${startDateGridStr}, endDateGridStr: ${endDateGridStr}`);
  
  return {
    start_date_grid: startDateGridStr,
    end_date_grid: endDateGridStr,
    display_grid: `${senin.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${jumat.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    refDateUntukGrid: senin,
  };
};

// Helper untuk mendapatkan periode 7 hari untuk PENGAMBILAN DATA API
// Menggunakan formatDateToYYYYMMDD agar konsisten jika API backend mengharapkan tanggal lokal "YYYY-MM-DD"
// Jika API backend mengharapkan tanggal UTC "YYYY-MM-DD", maka versi lama dengan toISOString().split('T')[0] mungkin lebih sesuai.
// Untuk saat ini kita buat konsisten dengan grid.
const getPeriodeDataTujuhHari = (tanggalMulaiReferensiInput = new Date()) => {
  const tanggalMulai = new Date(tanggalMulaiReferensiInput.getFullYear(), tanggalMulaiReferensiInput.getMonth(), tanggalMulaiReferensiInput.getDate()); // Set ke 00:00 lokal
  const tanggalSelesai = new Date(tanggalMulai);
  tanggalSelesai.setDate(tanggalMulai.getDate() + 6); // +6 hari untuk total 7 hari
  
  const startDateApiStr = formatDateToYYYYMMDD(tanggalMulai);
  const endDateApiStr = formatDateToYYYYMMDD(tanggalSelesai);

  // console.log(`[DEBUG getPeriodeDataTujuhHari] Input: ${tanggalMulaiReferensiInput.toString()}, Mulai API Lokal: ${tanggalMulai.toString()}, Selesai API Lokal: ${tanggalSelesai.toString()}, startDateApiStr: ${startDateApiStr}, endDateApiStr: ${endDateApiStr}`);

  return {
    start_date_api: startDateApiStr,
    end_date_api: endDateApiStr,
    display_api: `Data untuk: ${tanggalMulai.toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})} s/d ${tanggalSelesai.toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})}`,
    refDateUntukData: tanggalMulai,
  };
};

// Fungsi untuk mendapatkan warna berdasarkan ID unik (misal guru_id) dari palet terbatas
const getGuruColor = (() => {
  const colors = [
    [255, 235, 238], // Light Pink
    [225, 245, 254], // Light Blue
    [232, 245, 233], // Light Green
    [255, 243, 224], // Light Orange
    [243, 229, 245], // Light Purple
    [255, 253, 231], // Light Yellow
    [224, 242, 241], // Light Teal
    [239, 235, 233], // Light Brownish (atau ganti dengan warna lain yang lebih kontras)
  ];
  let colorIndex = 0;
  const assignedColors = new Map();

  return (guruId) => {
    if (!guruId) return [250, 250, 250]; // Warna netral untuk jadwal tanpa guru_id spesifik
    if (!assignedColors.has(guruId)) {
      assignedColors.set(guruId, colors[colorIndex % colors.length]);
      colorIndex++;
    }
    return assignedColors.get(guruId);
  };
})();


export default function LihatJadwalLab() {
  useTitle('Lihat Jadwal Lab');
  const { state: authState, isLoading: authIsLoading } = useContext(AuthContext);
  const { user: currentUser, role: userRole, lab_id_kepala: kepalaLabIdFromContext } = authState || {};

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
    console.log('DEBUG_ROLE_EFFECT: Role Effect Triggered -> User Role:', userRole, 'kepalaLabIdFromContext:', kepalaLabIdFromContext);
    if (userRole === 'Admin') {
      console.log('DEBUG_ROLE_EFFECT: Role is Admin');
      const initAdminLabs = async () => {
        await getLabsList();
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
  }, [userRole, kepalaLabIdFromContext]);

  const fetchJadwal = useCallback(async () => {
    console.log('[DEBUG_FETCH_JADWAL] CALLED. selectedLabId:', selectedLabId, 'Periode API (start_date_api, end_date_api):', periodeDataUntukAPI.start_date_api, periodeDataUntukAPI.end_date_api);
    if (!selectedLabId) {
      console.log('[DEBUG_FETCH_JADWAL] selectedLabId is EMPTY, returning.');
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
      console.log('[DEBUG_FETCH_JADWAL] API Request Params ->', params);
      const response = await get('/jadwal-lab', params); 
      
      console.log("[DEBUG_FETCH_JADWAL] Raw API Response for /jadwal-lab ->", JSON.stringify(response, null, 2));
      if (response && response.data && Array.isArray(response.data)) {
        response.data.forEach(item => {
          console.log(`[DEBUG_FETCH_JADWAL_ITEM] Item ID: ${item.jadwal_id}, Raw item.tanggal from API: '${item.tanggal}', Mulai: '${item.jam_mulai}', Selesai: '${item.jam_selesai}'`);
        });
      }
      setJadwalData(response.data || []);

    } catch (err) {
      console.error("[DEBUG_FETCH_JADWAL_ERROR] Error fetching jadwal lab:", err.response ? err.response.data : err.message);
      setJadwalData([]);
      const errorMessage = err.response?.data?.message || err.message || 'Terjadi kesalahan saat memuat jadwal.';
      Swal.fire({
        title: 'Gagal Memuat Jadwal', text: errorMessage, icon: 'error',
        confirmButtonText: 'OK', customClass: { confirmButton: swalErrorButtonClass, actions: 'flex justify-center mt-2' }, buttonsStyling: false,
      });
    } finally { setIsLoading(false); }
  }, [selectedLabId, periodeDataUntukAPI]); // Hanya periodeDataUntukAPI karena start_date_api dan end_date_api ada di dalamnya

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
  console.log('[DEBUG_PROCESS_JADWAL] START Processing jadwalData. Current jadwalData (raw from API) ->', JSON.parse(JSON.stringify(jadwalData)));
  console.log('[DEBUG_PROCESS_JADWAL] Grid dates for processing -> start_date_grid:', tampilanMingguGrid.start_date_grid, 'end_date_grid:', tampilanMingguGrid.end_date_grid);

  const newProcessedJadwal = {};
  HARI.forEach((hari) => {
    newProcessedJadwal[hari] = {};
    JAM_SLOTS.forEach(jam => { newProcessedJadwal[hari][jam] = null; });
  });

  const parseYYYYMMDDToLocalMidnight = (dateString_YYYY_MM_DD) => {
    if (!dateString_YYYY_MM_DD || typeof dateString_YYYY_MM_DD !== 'string' || dateString_YYYY_MM_DD.length !== 10 || !dateString_YYYY_MM_DD.includes('-')) {
        console.error(`[DEBUG parseYYYYMMDDToLocalMidnight] Invalid dateString input: '${dateString_YYYY_MM_DD}'`);
        return new Date('Invalid Date');
    }
    const [year, month, day] = dateString_YYYY_MM_DD.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const tglGridMulaiObj = parseYYYYMMDDToLocalMidnight(tampilanMingguGrid.start_date_grid);
  const tglGridSelesaiObj = parseYYYYMMDDToLocalMidnight(tampilanMingguGrid.end_date_grid);
  console.log(`[DEBUG_PROCESS_JADWAL] Grid Date Objects (Local Midnight) -> GridStartObj: ${tglGridMulaiObj.toString()}, GridEndObj: ${tglGridSelesaiObj.toString()}`);

  (jadwalData || []).forEach(item => {
    console.log(
        `[DEBUG_JADWAL_ITEM_RAW] ID: ${item.jadwal_id}, Tanggal API: '${item.tanggal}', Mulai API: '${item.jam_mulai}', Selesai API: '${item.jam_selesai}'`
    );
    const tanggalItemDariAPI = new Date(item.tanggal); 

    console.log(`[DEBUG_PROCESS_JADWAL_ITEM] Processing item_id: ${item.jadwal_id}, Raw item.tanggal from API: '${item.tanggal}'`);
    console.log(`[DEBUG_PROCESS_JADWAL_ITEM] Parsed item.tanggal to JS Date (tanggalItemDariAPI): ${tanggalItemDariAPI.toString()} (UTC: ${tanggalItemDariAPI.toUTCString()})`);

    if (isNaN(tanggalItemDariAPI.getTime())) {
        console.warn(`[DEBUG_PROCESS_JADWAL_ITEM] Skipping item_id: ${item.jadwal_id} due to invalid parsed date from '${item.tanggal}'`);
        return; 
    }

    const tanggalItemUntukPerbandinganGrid = new Date(
      tanggalItemDariAPI.getFullYear(),
      tanggalItemDariAPI.getMonth(),
      tanggalItemDariAPI.getDate()
    );
    
    if (tanggalItemUntukPerbandinganGrid >= tglGridMulaiObj && tanggalItemUntukPerbandinganGrid <= tglGridSelesaiObj) {
      console.log('[DEBUG_PROCESS_JADWAL_ITEM] Item ID', item.jadwal_id, 'IS IN grid date range.');
      
      const hariItemIndex = tanggalItemDariAPI.getDay(); 
      const targetHariIndex = hariItemIndex === 0 ? 6 : hariItemIndex - 1; 
      
      console.log(`[DEBUG_PROCESS_JADWAL_ITEM] Item ID ${item.jadwal_id}: tanggalItemDariAPI.getDay() is ${hariItemIndex}, targetHariIndex is ${targetHariIndex}`);

      if (targetHariIndex >= 0 && targetHariIndex < HARI.length) { 
        const namaHari = HARI[targetHariIndex];
        const jamMulaiInt = parseInt(item.jam_mulai.split(':')[0]);
        const jamSelesaiInt = parseInt(item.jam_selesai.split(':')[0]);
        
        const duration = Math.max(1, (jamSelesaiInt - jamMulaiInt) + 1); 

        console.log(
            `[DEBUG_JADWAL_ITEM_CALC] ID: ${item.jadwal_id}, jamMulaiInt: ${jamMulaiInt}, jamSelesaiInt (dianggap inklusif): ${jamSelesaiInt}, duration (rowspan): ${duration}`
        );

        let jamCursor = jamMulaiInt;
        let isStartCell = true;

        while (jamCursor <= jamSelesaiInt && jamCursor < 17) { 
          const jamKey = `${String(jamCursor).padStart(2, '0')}:00`;
          if (JAM_SLOTS.includes(jamKey) && (!newProcessedJadwal[namaHari][jamKey] || !newProcessedJadwal[namaHari][jamKey]?.isOccupiedByOther)) {
            if (isStartCell) {
              newProcessedJadwal[namaHari][jamKey] = { 
                ...item, 
                rowspan: duration, 
                isStartCell: true, 
                tanggalObjectUntukDebug: tanggalItemDariAPI.toString() 
              };
              isStartCell = false;
            } else {
              newProcessedJadwal[namaHari][jamKey] = { isOccupiedByOther: true };
            }
          }
          jamCursor++;
        }
      } else {
        console.warn('[DEBUG_PROCESS_JADWAL_ITEM] Item ID', item.jadwal_id, 'targetHariIndex out of bounds (not Mon-Fri):', targetHariIndex);
      }
    } else {
      console.log('[DEBUG_PROCESS_JADWAL_ITEM] Item ID', item.jadwal_id, 'IS NOT IN grid date range. ItemDateForCompare:', tanggalItemUntukPerbandinganGrid.toString(), 'GridStart:', tglGridMulaiObj.toString(), 'GridEnd:', tglGridSelesaiObj.toString());
    }
  });
  console.log('[DEBUG_PROCESS_JADWAL] END setProcessedJadwal complete. newProcessedJadwal ->', JSON.parse(JSON.stringify(newProcessedJadwal)));
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
    console.log('[DEBUG_PERIODE] gantiPeriodeData, referensiTanggalAwal lama ->', refLama.toISOString());
    setReferensiTanggalAwal(refBaru);
    console.log('[DEBUG_PERIODE] gantiPeriodeData, referensiTanggalAwal baru ->', refBaru.toISOString());
  };

  const handleTanggalManualChange = (event) => {
    const tanggalDipilihString = event.target.value; 
    if (tanggalDipilihString) {
      setModeTanggal('manual');
      const [year, month, day] = tanggalDipilihString.split('-').map(Number);
      const tanggalBaru = new Date(year, month - 1, day); 
      
      console.log('[DEBUG_PERIODE] handleTanggalManualChange, tanggalDipilihString:', tanggalDipilihString);
      setReferensiTanggalAwal(tanggalBaru);
      console.log('[DEBUG_PERIODE] handleTanggalManualChange, referensiTanggalAwal baru ->', tanggalBaru.toISOString());
    }
  };

  const kembaliKeModeOtomatis = () => {
    setModeTanggal('otomatis');
    const tanggalHariIni = new Date(); 
    console.log('[DEBUG_PERIODE] kembaliKeModeOtomatis, tanggalHariIni (local) ->', tanggalHariIni.toString());
    setReferensiTanggalAwal(tanggalHariIni); 
    console.log('[DEBUG_PERIODE] kembaliKeModeOtomatis, referensiTanggalAwal baru (local) ->', tanggalHariIni.toISOString());
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

    const head = [[
        { content: "Jam", styles: { halign: 'center', fontStyle: 'bold', fillColor: [107, 33, 168], textColor: 255, fontSize: 7, cellWidth: 15, minCellHeight: 7 } },
        ...HARI.map(hari => ({ content: hari, styles: { halign: 'center', fontStyle: 'bold', fillColor: [107, 33, 168], textColor: 255, fontSize: 7, minCellHeight: 7 } }))
    ]];

    const body = [];
    const guruColorsLegend = new Map(); 

    JAM_SLOTS.forEach(jam => {
        const rowData = [];
        rowData.push({
            content: jam,
            styles: { halign: 'center', fontStyle: 'bold', fontSize: 6, cellWidth: 15, minCellHeight: 10 } 
        });

        HARI.forEach(hari => {
            const jadwalItem = processedJadwal[hari]?.[jam];
            
            if (jadwalItem?.isStartCell) {
                const guruColor = getGuruColor(jadwalItem.guru_id);
                if (jadwalItem.guru_id && jadwalItem.nama_guru && !guruColorsLegend.has(jadwalItem.guru_id)) {
                    guruColorsLegend.set(jadwalItem.guru_id, { nama: jadwalItem.nama_guru, color: guruColor });
                }
                rowData.push({
                    content: `${jadwalItem.kelas || '-'}\n${jadwalItem.mata_pelajaran || '-'}\n(${jadwalItem.nama_guru || '-'})` +
                             `${jadwalItem.kegiatan ? `\nKeg: ${jadwalItem.kegiatan.substring(0,18)}${jadwalItem.kegiatan.length > 18 ? '...' : ''}` : ''}`,
                    rowSpan: jadwalItem.rowspan,
                    styles: { 
                        fillColor: guruColor, 
                        valign: 'middle', 
                        halign: 'center',
                        fontSize: 5.5,
                        minCellHeight: 10 * (jadwalItem.rowspan || 1) 
                    }
                });
            } else if (jadwalItem?.isOccupiedByOther) {
                // Sel ini ditutupi oleh rowspan, jadi tidak perlu ditambahkan ke rowData
            } else {
                rowData.push({ content: '', styles: { minCellHeight: 10 } });
            }
        });
        body.push(rowData);
    });

    const columnWidth = (pageWidth - (margin*2) - 15) / 5; // Lebar untuk kolom hari
    const columnStyles = {
        0: { cellWidth: 15 }, // Kolom Jam
        1: { cellWidth: columnWidth }, 
        2: { cellWidth: columnWidth },
        3: { cellWidth: columnWidth },
        4: { cellWidth: columnWidth },
        5: { cellWidth: columnWidth },
    };
    
    // Jika tidak ada kolom sama sekali (misalnya karena HARI kosong, atau hanya kolom Jam)
    // Autotable mungkin error. Ini hanya pengaman, HARI seharusnya tidak kosong.
    const finalColumnStyles = HARI.length > 0 ? columnStyles : { 0: { cellWidth: 'auto'} };


    autoTable(doc, {
        head: head,
        body: body,
        startY: margin + 18,
        theme: 'grid',
        styles: { fontSize: 5.5, cellPadding: 0.7, halign: 'center', valign: 'middle', overflow: 'linebreak', lineWidth: 0.1, lineColor: [180,180,180] },
        columnStyles: finalColumnStyles,
        didDrawPage: (data) => {
            if (guruColorsLegend.size > 0 && data.pageNumber === doc.getNumberOfPages()) {
                let legendY = data.cursor.y + 7; 
                const legendX = margin;
                const legendItemHeight = 4;
                const legendColorBoxSize = 3;
                const legendTextOffsetX = 4;
                const maxLegendItemsPerPage = 10; // Perkiraan
                let itemsOnCurrentPage = 0;

                const drawLegendHeader = (yPos) => {
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.text("Legenda Warna Guru:", legendX, yPos);
                    doc.setFont('helvetica', 'normal');
                    return yPos + legendItemHeight;
                };
                
                legendY = drawLegendHeader(legendY);

                Array.from(guruColorsLegend.entries()).forEach(([guru_id, info]) => {
                    if (legendY > doc.internal.pageSize.getHeight() - (margin + 5) || itemsOnCurrentPage >= maxLegendItemsPerPage) {
                        doc.addPage();
                        legendY = margin + 7;
                        legendY = drawLegendHeader(legendY);
                        itemsOnCurrentPage = 0;
                    }
                    doc.setFillColor(info.color[0], info.color[1], info.color[2]);
                    doc.rect(legendX, legendY - (legendColorBoxSize/2) -1 , legendColorBoxSize, legendColorBoxSize, 'F'); 
                    doc.text(`${info.nama || 'Tidak Diketahui'}`, legendX + legendTextOffsetX, legendY);
                    legendY += legendItemHeight;
                    itemsOnCurrentPage++;
                });
            }
        }
    });
    
    const namaFileLab = (namaSelectedLab || `Lab_ID_${selectedLabId}` || 'Jadwal_Lab').replace(/[\s/]/g, '_');
    doc.save(`Jadwal_${namaFileLab}_${tampilanMingguGrid.start_date_grid}_hingga_${tampilanMingguGrid.end_date_grid}.pdf`);
};


  if (authIsLoading) return <Dashboard><div className="p-6 text-center">Memverifikasi autentikasi...</div></Dashboard>;
  if (!userRole) return <Dashboard><div className="p-6 text-center">Silakan login untuk melihat jadwal.</div></Dashboard>;

  const isLabValidForDisplay = !!selectedLabId; 
  console.log('DEBUG_RENDER: isLabValidForDisplay ->', isLabValidForDisplay, 'selectedLabId ->', selectedLabId, 'isLoading ->', isLoading, 'jadwalData.length ->', jadwalData.length);

  return (
    <Dashboard>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Lihat Jadwal Laboratorium</h1>
          {(userRole === 'Admin' || userRole === 'Guru') && (
            <div className="w-full sm:w-auto sm:min-w-[200px] md:min-w-[250px]">
              <select id="labFilterJadwal" value={selectedLabId} onChange={handleLabChange}
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-red-600 focus:border-red-600 block w-full p-2.5"
                disabled={isLoading || labs.length === 0}>
                <option value="">{(labs.length === 0 && !isLoading && userRole !== 'Kepala Lab') ? 'Tidak ada lab' : 'Pilih Laboratorium'}</option>
                {labs.map(lab => (<option key={lab.lab_id} value={lab.lab_id.toString()}>{lab.nama_lab}</option>))}
              </select>
            </div>
          )}
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
        
        {isLabValidForDisplay && !isLoading && (userRole === 'Admin' || userRole === 'Kepala Lab') && (
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

        {!isLoading && (userRole === 'Admin' || userRole === 'Guru') && !selectedLabId && (
            <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow"> Silakan pilih laboratorium untuk menampilkan jadwal. </div>
        )}

        {!isLoading && isLabValidForDisplay && jadwalData.length === 0 && (
            <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow"> Tidak ada jadwal untuk laboratorium dan periode data yang dipilih. </div>
        )}

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
                            className="p-2 border border-gray-300 align-top relative bg-red-50 hover:bg-purple-100 transition-colors" // Warna dasar bisa dihilangkan jika mau full dari getGuruColor
                            style={{ backgroundColor: `rgb(${getGuruColor(jadwalItem.guru_id).join(',')})` }} // Dinamis background color
                            rowSpan={jadwalItem.rowspan}>
                            <div className="text-xs text-gray-800 h-full flex flex-col justify-start"> {/* Warna teks bisa disesuaikan agar kontras */}
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
