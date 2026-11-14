import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { postWithFile, get } from "../../utils/api";
import Dashboard from "../../Layouts/Dashboard";
import useTitle from "../../utils/useTitle";
import FormContainer from "../FormContainer"; 
import { AuthContext } from "../../Context/AuthContext";

const AddPerangkat = () => {
  useTitle("Tambah Perangkat Baru - SIM Lab Komputer");
  const navigate = useNavigate();
  const location = useLocation();

  const { state: authState } = useContext(AuthContext);
  const userRole = authState?.role; 
  const isAdmin = userRole === 'Admin';
  const isKepalaLab = userRole === 'Kepala Lab';
  const preselectedLabId = location.state?.labId;
  const preselectedLabName = location.state?.labName;
  const kepalaLabAssignedLabId = isKepalaLab ? authState?.lab_id_kepala?.toString() : null;
  
  const initialLabId = kepalaLabAssignedLabId || preselectedLabId || "";
  
  console.log("AddPerangkat - Role dari Context:", authState?.role);
 console.log("AddPerangkat - lab_id_kepala dari Context:", authState?.lab_id_kepala);
 console.log("AddPerangkat - kepalaLabAssignedLabId (variabel lokal):", kepalaLabAssignedLabId);
  const [formData, setFormData] = useState({
    nama_perangkat: "",
    spesifikasi: "",
    status: "Baik",
    lab_id: initialLabId,
    nomor_inventaris: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [allLabsForAdminDropdown, setAllLabsForAdminDropdown] = useState([]);
  
  // Untuk menampilkan nama lab jika field lab_id di-disable
  const [displayLabName, setDisplayLabName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loadingPage, setLoadingPage] = useState(true);

  // Field lab_id di-disable jika:
  // 1. Role Kepala Lab (otomatis pakai labnya)
  // 2. Role Admin TAPI sudah ada lab yang dipilih dari halaman sebelumnya (preselectedLabId)
  const isLabIdFieldDisabled = isKepalaLab || (isAdmin && !!preselectedLabId);

  useEffect(() => {
    console.log("AddPerangkat mounted. Role:", userRole, "KaLabID:", kepalaLabAssignedLabId, "PreselectedLabID:", preselectedLabId, "PreselectedLabName:", preselectedLabName);
    
    // Set nama lab yang akan ditampilkan jika field lab_id disable
    if (isLabIdFieldDisabled) {
      if (preselectedLabName) {
        setDisplayLabName(preselectedLabName);
      } else if (isKepalaLab && kepalaLabAssignedLabId) {
        // Jika KaLab dan preselectedLabName tidak ada (misal akses langsung ke /add-perangkat)
        // Fetch nama lab untuk KaLab
        const fetchKaLabName = async () => {
            try {
                const labDetail = await get(`/lab/${kepalaLabAssignedLabId}`);
                if(labDetail.data?.nama_lab) {
                    setDisplayLabName(labDetail.data.nama_lab);
                } else {
                    setDisplayLabName(`Lab ID: ${kepalaLabAssignedLabId}`);
                }
            } catch (e) {
                console.error("Error fetching KaLab name", e);
                setDisplayLabName(`Lab ID: ${kepalaLabAssignedLabId}`);
            }
        };
        fetchKaLabName();
      } else if (isAdmin && preselectedLabId) {
          // Jika Admin, preselectedLabId ada, tapi preselectedLabName tidak terkirim (seharusnya terkirim)
          setDisplayLabName(`Lab ID: ${preselectedLabId}`);
      }
    }

    // Admin perlu daftar lab jika belum ada lab yang dipilih sebelumnya DAN bukan KaLab
    const shouldFetchLabsForAdmin = isAdmin && !preselectedLabId;

    if (shouldFetchLabsForAdmin) {
      setLoadingPage(true);
      get("/lab")
        .then(response => {
          if (response.data && Array.isArray(response.data)) {
            setAllLabsForAdminDropdown(response.data);
          } else {
            setError("Gagal memuat daftar laboratorium untuk pilihan.");
          }
        })
        .catch(err => {
          console.error("Error fetching labs for Admin AddPerangkat:", err);
          setError("Gagal memuat daftar laboratorium.");
        })
        .finally(() => setLoadingPage(false));
    } else {
      setLoadingPage(false); // Tidak perlu loading jika lab sudah ditentukan atau bukan Admin
    }
  }, [isAdmin, isKepalaLab, preselectedLabId, preselectedLabName, kepalaLabAssignedLabId]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0] || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    if (!formData.nama_perangkat.trim() || !formData.status || !formData.lab_id || !formData.nomor_inventaris.trim()) {
      setError("Nama Perangkat, Status, Lab, dan Nomor Inventaris wajib diisi.");
      setIsSubmitting(false);
      return;
    }

    const dataToSubmit = new FormData();
    dataToSubmit.append("nama_perangkat", formData.nama_perangkat);
    dataToSubmit.append("spesifikasi", formData.spesifikasi);
    dataToSubmit.append("status", formData.status);
    dataToSubmit.append("lab_id", formData.lab_id);
    dataToSubmit.append("nomor_inventaris", formData.nomor_inventaris);

    if (selectedFile && selectedFile instanceof File) {
      dataToSubmit.append("foto_perangkat", selectedFile, selectedFile.name);
    }

    try {
      const response = await postWithFile("/perangkat/create", dataToSubmit);
      const labIdParam = formData.lab_id ? `?lab_id=${formData.lab_id}` : "";
      // Mengarahkan kembali ke daftar perangkat, idealnya dengan filter lab jika relevan
      navigate(`/kelola-perangkat${isAdmin && formData.lab_id ? `?initialLabId=${formData.lab_id}` : ''}`, {
        state: { successMsg: response.message || "Data perangkat berhasil ditambahkan" },
      });
    } catch (err) {
      console.error("AddPerangkat - handleSubmit: Gagal menambahkan perangkat:", err.response?.data || err.message || err);
      setError(err.response?.data?.message || "Gagal menambahkan perangkat. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusPerangkatOptions = [
    { value: 'Baik', label: 'Baik' },
    { value: 'Rusak', label: 'Rusak' },
    { value: 'Perlu Perbaikan', label: 'Perlu Perbaikan' },
    { value: 'Dalam Perbaikan', label: 'Dalam Perbaikan' },
  ];

  const cancelPath = isAdmin && preselectedLabId 
    ? `/kelola-perangkat?initialLabId=${preselectedLabId}`
    : "/kelola-perangkat";

  if (loadingPage && isAdmin && !preselectedLabId) {
      return <Dashboard title="Tambah Perangkat Baru"><div className="p-6 text-center">Memuat data...</div></Dashboard>;
  }

  return (
    <Dashboard title="Tambah Perangkat Baru">
      <FormContainer
        title="Form Tambah Data Perangkat"
        description="Masukkan detail lengkap untuk perangkat baru"
        error={error}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={() => navigate(cancelPath)}
        submitText="Tambah Perangkat"
      >
        <div className="mb-4">
          <label htmlFor="nama_perangkat" className="block mb-2 font-medium text-md">Nama Perangkat <span className="text-red-500">*</span></label>
          <input type="text" id="nama_perangkat" name="nama_perangkat" value={formData.nama_perangkat} onChange={handleChange}
            className="shadow-sm bg-white border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 h-12"
            placeholder="Cth: PC-01, Proyektor Epson L200" required />
        </div>

        <div className="mb-4">
          <label htmlFor="nomor_inventaris" className="block mb-2 font-medium text-md">Nomor Inventaris <span className="text-red-500">*</span></label>
          <input type="text" id="nomor_inventaris" name="nomor_inventaris" value={formData.nomor_inventaris} onChange={handleChange}
            className="shadow-sm bg-white border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 h-12"
            placeholder="Masukkan Nomor Inventaris Unik" required />
        </div>
        
        <div className="mb-4">
          <label htmlFor="lab_id" className="block mb-2 font-medium text-md">Laboratorium <span className="text-red-500">*</span></label>
          {isLabIdFieldDisabled ? (
            <input 
              type="text"
              value={displayLabName || `Memuat nama lab...`} // Tampilkan nama lab jika ada
              className="shadow-sm bg-gray-100 border-[2px] border-gray-300 outline-none text-sm rounded-md block w-full p-2.5 h-12"
              disabled
            />
          ) : ( 
            <select
              id="lab_id" name="lab_id" value={formData.lab_id} onChange={handleChange}
              className="shadow-sm bg-white border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 h-12"
              required
              disabled={allLabsForAdminDropdown.length === 0 && !loadingPage}
            >
              <option value="">{loadingPage ? "Memuat lab..." : "Pilih Laboratorium"}</option>
              {allLabsForAdminDropdown.map(lab => (
                <option key={lab.lab_id} value={lab.lab_id.toString()}>
                  {lab.nama_lab} (ID: {lab.lab_id})
                </option>
              ))}
            </select>
          )}
          {isAdmin && !preselectedLabId && allLabsForAdminDropdown.length === 0 && !loadingPage && 
            <p className="text-xs text-red-500 mt-1">Tidak ada data lab. Tambahkan lab terlebih dahulu.</p>
          }
        </div>

        <div className="mb-4">
          <label htmlFor="status" className="block mb-2 font-medium text-md">Status Perangkat <span className="text-red-500">*</span></label>
          <select id="status" name="status" value={formData.status} onChange={handleChange}
            className="shadow-sm bg-white border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 h-12" required >
            {statusPerangkatOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="spesifikasi" className="block mb-2 font-medium text-md">Spesifikasi (Opsional)</label>
          <textarea id="spesifikasi" name="spesifikasi" rows="4" value={formData.spesifikasi} onChange={handleChange}
            className="shadow-sm bg-white border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            placeholder="Cth: RAM 8GB, SSD 256GB, Intel i5 Gen 7" />
        </div>

        <div className="mb-4">
          <label htmlFor="foto_perangkat_input" className="block mb-2 font-medium text-md">Foto Perangkat (Opsional)</label>
          <input type="file" id="foto_perangkat_input" name="foto_perangkat_input" onChange={handleFileChange} accept="image/*"
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-md cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          {selectedFile && (
            <div className="mt-2 text-xs text-gray-500">File dipilih: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)</div>
          )}
        </div>
      </FormContainer>
    </Dashboard>
  );
};

export default AddPerangkat;
