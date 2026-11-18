// Perangkat.jsx
import React, { useState, useRef, useEffect, useContext, useCallback, useMemo } from 'react';
import Dashboard from '../../Layouts/Dashboard';
import Tabel from '../../Layouts/Table';
import { FaEye, FaTrash, FaFilePen, FaClipboardList } from "react-icons/fa6";
import { get, deleteData} from '../../utils/api';
import { useLocation, useNavigate } from 'react-router-dom';
import Notification from '../../Components/Notification/Notif';
import useTitle from '../../utils/useTitle';
import { AuthContext } from '../../Context/AuthContext';
import useDeletionDialog from '../../Components/Deletion/useDeletionDialog';

import DetailPerangkat from '../../Components/Perangkat/DetailPerangkat';
import EditPerangkat from '../../Components/Perangkat/EditPerangkat';
import AddPemeriksaan from '../../Components/Pemeriksaan/AddPemeriksaan';
import truncateText from '../../utils/truncateText';

import InventoryExportMenu from '../../Components/InventoryExportMenu';
import { useSettings } from '../../Context/SettingsContext';
import { getDocumentBranding } from '../../utils/documentBranding';
import { filterLabDevices } from '../AsetIT/assetView';
import { deletionRelation } from '../../utils/deletionContext';

const Perangkat = () => {
  const { settings, logoSrc } = useSettings();
  const request = useRef(0);
  const [dataOwner, setDataOwner] = useState(null);
  const [loadError, setLoadError] = useState(false);
  useTitle('Kelola Data Perangkat');
  const location = useLocation();
  const navigate = useNavigate();

  const { state: authState } = useContext(AuthContext);
  const userRole = authState?.role;
  const kepalaLabAssignedLabId = authState?.lab_id_kepala;
  // Teknisi can read all assigned laboratory devices without gaining CRUD access.

  const [successMsg, setSuccessMsg] = useState(location.state?.successMsg || '');
  const [errorMsg, setErrorMsg] = useState(location.state?.errorMsg || '');
  
  const [allLabs, setAllLabs] = useState([]); 
  const [labsOwner, setLabsOwner] = useState(null);
  const [selectedLabId, setSelectedLabId] = useState(location.state?.labId || '');
  
  const [dataPerangkat, setDataPerangkat] = useState([]); 
  const [isLoading, setIsLoading] = useState(true); 
  
  const [selectedPerangkatId, setSelectedPerangkatId] = useState(null); // Untuk Detail & Edit
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // --- 2. State untuk Modal Pemeriksaan ---
  const [showAddPemeriksaanModal, setShowAddPemeriksaanModal] = useState(false);
  const [selectedPerangkatForPemeriksaan, setSelectedPerangkatForPemeriksaan] = useState(null);
  // --- End State untuk Modal Pemeriksaan ---

  const isAdmin = userRole === 'Admin';
  const isKepalaLab = userRole === 'Kepala Lab';
  const isTeknisi = userRole === 'Teknisi'; 
  const canBrowseAllLabs = isAdmin || isTeknisi;
  
  const canManageRowActions = isAdmin || isKepalaLab; 
  const canPerformPemeriksaan = isAdmin || isTeknisi || isKepalaLab; 
  const canAccessAddPerangkatPage = isAdmin || (isKepalaLab && !!kepalaLabAssignedLabId);
  const canPrintData = isAdmin || isTeknisi;
  const relatedLabId = deletionRelation(location.pathname, location.state?.deletionContext)?.id;
  const exportLabId = selectedLabId || relatedLabId;
  const scope = useMemo(() => ({ auth: authState, labId: selectedLabId, relatedLabId }), [authState, selectedLabId, relatedLabId]);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const scopeReady = dataOwner === scope;
  const scopedLoading = isLoading || !scopeReady || labsOwner !== authState || authState?.isLoading || authState?.isAuthenticated === false;

  // ... (useEffect fetchLabs, fetchPerangkatData, notifikasi tetap sama) ...
  useEffect(() => {
    let active = true;
    const fetchLabs = async () => {
      setIsLoading(true);
      try {
        if (canBrowseAllLabs) {
          const response = await get('/lab');
          if (!active) return;
          if (response.data && Array.isArray(response.data)) {
            setAllLabs(response.data);
            setLabsOwner(authState);
          } else {
            setAllLabs([]);
            setErrorMsg("Gagal memuat daftar laboratorium.");
          }
        } else if (isKepalaLab && kepalaLabAssignedLabId) {
            const userLabId = kepalaLabAssignedLabId;
            const response = await get(`/lab/${userLabId}`);
            if (!active) return;
            if (response.data) {
              setAllLabs([response.data]);
              setLabsOwner(authState);
              setSelectedLabId(userLabId.toString());
            } else {
              setErrorMsg(`Gagal memuat detail lab untuk ${userRole}.`);
            }
        }
      } catch (err) {
        if (!active) return;
        console.error("Error fetching labs:", err);
        setErrorMsg("Gagal memuat data laboratorium.");
        setAllLabs([]);
      } finally {
        if (active && !canBrowseAllLabs &&
            !(isKepalaLab && kepalaLabAssignedLabId)
           ) {
          setIsLoading(false);
        }
      }
    };
    fetchLabs();
    return () => { active = false; };
  }, [authState, canBrowseAllLabs, isKepalaLab, kepalaLabAssignedLabId, userRole]);

  const fetchPerangkatData = useCallback(async (currentSelectedLabId) => {
    const generation = ++request.current;
    const owner = scope;
    setLoadError(false);
    setIsLoading(true); 
    setErrorMsg(''); 
    try {
      let perangkatToDisplay = [];
      const response = await get('/perangkat');
      if (generation !== request.current || currentScope.current !== owner) return;
      if (response.data && Array.isArray(response.data)) {
        const userSpecificLabId = isKepalaLab ? kepalaLabAssignedLabId?.toString() : '';
        const labIdToFilter = canBrowseAllLabs ? currentSelectedLabId : userSpecificLabId;
        if (labIdToFilter) { 
          perangkatToDisplay = filterLabDevices(response.data.filter(row => row.penggunaan !== 'Operasional'), labIdToFilter);
        } else if (canBrowseAllLabs && !currentSelectedLabId) {
          perangkatToDisplay = response.data.filter(row => row.lab_id != null && row.penggunaan !== 'Operasional');
        } else if (!isAdmin && !userSpecificLabId) {
            perangkatToDisplay = []; 
            if (!isKepalaLab && !isTeknisi) setErrorMsg("Role tidak dikenal atau tidak memiliki akses ke lab.")
        } else { 
            perangkatToDisplay = [];
        }
        setDataPerangkat(perangkatToDisplay);
        setDataOwner(owner);
      } else {
        setDataPerangkat([]);
        setLoadError(true);
        setErrorMsg("Data perangkat tidak ditemukan atau format respons salah.");
      }
    } catch (err) {
      if (generation !== request.current || currentScope.current !== owner) return;
      setLoadError(true);
      console.error("Error fetching perangkat data:", err);
      setErrorMsg("Gagal mengambil data perangkat. " + (err.response?.data?.message || err.message || ''));
      setDataPerangkat([]);
    } finally {
      if (generation === request.current && currentScope.current === owner) setIsLoading(false);
    }
  }, [scope, canBrowseAllLabs, isAdmin, isKepalaLab, kepalaLabAssignedLabId, isTeknisi]);

  useEffect(() => {
    if (canBrowseAllLabs) {
      fetchPerangkatData(selectedLabId);
    } else if (isKepalaLab && kepalaLabAssignedLabId) {
      fetchPerangkatData(kepalaLabAssignedLabId.toString());

    }
     else { 
      if (!isKepalaLab && !isTeknisi) { 
        setIsLoading(false);
        setDataPerangkat([]);
      }
    }
  }, [selectedLabId, canBrowseAllLabs, isKepalaLab, kepalaLabAssignedLabId, isTeknisi, fetchPerangkatData]);

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
  
  const {requestDeletion:handleDelete,dialog:deletionDialog} = useDeletionDialog({
    resource: 'perangkat',
    onDelete: (id) => deleteData(`/perangkat/delete/${id}`),
    itemName: 'data perangkat',
    onSuccess: (deletedId) => {
      setDataPerangkat(prevData => prevData.filter(item => item.perangkat_id !== deletedId));
      setSuccessMsg('Data perangkat berhasil dihapus');
    },
    onError: (error) => setErrorMsg('Gagal menghapus data perangkat. ' + (error.response?.data?.message || error.message || ''))
  });

  // --- 3. Modifikasi handleGoToPemeriksaan menjadi handleOpenAddPemeriksaanModal ---
  const handleOpenAddPemeriksaanModal = (perangkatItem) => {
    // Log ini penting untuk memastikan perangkatItem yang dikirim valid
    console.log("Perangkat.jsx - Membuka modal pemeriksaan untuk item:", perangkatItem);
    if (perangkatItem && perangkatItem.perangkat_id) { // Pastikan item valid sebelum membuka modal
        setSelectedPerangkatForPemeriksaan(perangkatItem);
        setShowAddPemeriksaanModal(true);
    } else {
        console.error("handleOpenAddPemeriksaanModal: perangkatItem tidak valid atau tidak ada perangkat_id.", perangkatItem);
        setErrorMsg("Tidak dapat membuka form pemeriksaan, data perangkat tidak lengkap.");
    }
  };
  // --- End Modifikasi ---

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
        {/* ... (td lainnya tetap sama) ... */}
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
            
            {canPerformPemeriksaan &&
             (item.status !== 'Rusak' && item.status !== 'Dalam Perbaikan' && item.status !== 'Perlu Perbaikan') && 
             <button
                onClick={() => handleOpenAddPemeriksaanModal(item)} // Panggil fungsi yang benar
                className="p-2 text-green-600 hover:text-green-800 rounded-full hover:bg-green-100" 
                title="Lakukan Pemeriksaan">
                <FaClipboardList size={17} /> 
             </button>
            }

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

  // ... (getLabNameById, addPerangkatPathObject, labIdUntukEdit, getCurrentTableTitle, formatDateForFilename, handlePrintData, displayUserLabInfo tetap sama) ...
  const getLabNameById = (labId) => {
    if (!labId || !allLabs.length) return `ID: ${labId || 'Semua'}`;
    const lab = allLabs.find(l => l.lab_id.toString() === labId.toString());
    return lab?.nama_lab || `ID: ${labId}`;
  };
  
  const addPerangkatPathObject = () => {
    if (!canAccessAddPerangkatPage) return null;
    let navState = {};
    let userLabForAdd = isKepalaLab ? kepalaLabAssignedLabId : null;

    if (isAdmin) {
      if (selectedLabId) {
        navState = { labId: selectedLabId, labName: getLabNameById(selectedLabId) };
      } else {
        navState = { labId: null, labName: null }; 
      }
    } else if (userLabForAdd) { // Untuk Kepala Lab & Teknisi
      navState = { labId: userLabForAdd.toString(), labName: getLabNameById(userLabForAdd) };
    }
    
    if (isAdmin || (isKepalaLab && !!kepalaLabAssignedLabId)) {
      return { pathname: "/add-perangkat", state: navState };
    }
    return null;
  };

  const labIdUntukEdit = isAdmin ? selectedLabId : (isKepalaLab ? kepalaLabAssignedLabId?.toString() : null);

  const getCurrentTableTitle = () => {
    let titleLabId = selectedLabId; // Default untuk admin
    if (isKepalaLab) titleLabId = kepalaLabAssignedLabId;

    
    if (canBrowseAllLabs && !selectedLabId) return "Data Perangkat (Semua Lab)";
    return `Data Perangkat Lab: ${getLabNameById(titleLabId)}`;
  };
  
  const displayUserLabInfo = () => {
    if (isAdmin) return null; 
    return null;
  };

  return (
    <Dashboard title="Kelola Data Perangkat">
      <div className="flex flex-col w-full min-h-[calc(100vh-110px)] px-4 py-6 md:px-6 lg:px-8">
        {successMsg && <Notification type="success" message={successMsg} onClose={() => setSuccessMsg('')} />}
        {errorMsg && <Notification type="error" message={errorMsg} onClose={() => setErrorMsg('')} />}

        {/* ... (Layout Tombol Print dan Filter Lab tetap sama) ... */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
          {canBrowseAllLabs && (
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
          {!canBrowseAllLabs && <div className="w-full sm:w-1/3"></div>} {/* Placeholder */}

        </div>
        {displayUserLabInfo()}

        <Tabel
          isLoading={scopedLoading}
          title={getCurrentTableTitle()}
          breadcrumbContext={userRole}
          headers={headTable}
          data={scopeReady ? dataPerangkat : []}
          renderActions={(rows) => canPrintData && <InventoryExportMenu lab_id={exportLabId} owner={scope} key={scopeReady ? 'ready' : 'pending'} rows={rows} kind="lab" title={getCurrentTableTitle()} branding={getDocumentBranding(settings, logoSrc)} disabled={scopedLoading || loadError || !!errorMsg} />}
          itemsPerPage={10}
          renderRow={renderPerangkatRow}
          to={addPerangkatPathObject()} 
          buttonText={canAccessAddPerangkatPage ? "Tambah Perangkat" : ""}
        />

        {/* --- 4. Render Modal AddPemeriksaan --- */}
        {showAddPemeriksaanModal && selectedPerangkatForPemeriksaan && (
          <AddPemeriksaan
            perangkatData={selectedPerangkatForPemeriksaan}
            onClose={() => {
                setShowAddPemeriksaanModal(false);
                setSelectedPerangkatForPemeriksaan(null); // Reset state setelah modal ditutup
            }}
            onSuccess={(response, perangkatId, hasilPemeriksaan) => {
              setSuccessMsg(response.message || "Data pemeriksaan berhasil ditambahkan.");
              setShowAddPemeriksaanModal(false);
              setSelectedPerangkatForPemeriksaan(null);
              // Opsional: Update status perangkat di UI jika hasil pemeriksaan mengubahnya
              // Ini bisa dilakukan dengan memfilter `dataPerangkat` dan mengupdate item yang sesuai,
              // atau dengan memanggil `fetchPerangkatData` lagi.
              // Contoh sederhana: jika hasil pemeriksaan 'Ditemukan Masalah', ubah status jadi 'Perlu Perbaikan'
              if (hasilPemeriksaan === 'Ditemukan Masalah') {
                setDataPerangkat(prevData => prevData.map(p => 
                  p.perangkat_id === perangkatId ? { ...p, status: 'Perlu Perbaikan' } : p
                ));
              }
              // Atau, lebih simpel, fetch ulang semua data untuk lab saat ini
              // const currentActiveLabId = isAdmin ? selectedLabId : (isKepalaLab ? kepalaLabAssignedLabId?.toString() : teknisiAssignedLabId?.toString());
              // fetchPerangkatData(currentActiveLabId);
            }}
          />
        )}
        {/* --- End Render Modal AddPemeriksaan --- */}

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
                                            : isTeknisi ? selectedLabId
                                            : '';
                    fetchPerangkatData(currentActiveLabId); 
                    setShowEditModal(false);
                }}
            />
        }
      </div>
      {deletionDialog}
    </Dashboard>
  );
}

export default Perangkat;
