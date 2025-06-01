// src/Components/Perangkat/EditPerangkat.jsx
import React, { useState, useEffect, useContext } from "react";
import { get, putWithFile } from "../../utils/api";
import ModalFormContainer from "../DetailModal/ModalContainer"; // Ini adalah ModalContainer Anda
import { AuthContext } from "../../Context/AuthContext";
import LoadingSpinner from "../DetailModal/LoadingSpinner";

const EditPerangkat = ({ id, labIdUntukEdit, onClose, onUpdate }) => {
  // ... (semua state dan useEffect Anda yang sudah ada tetap di sini) ...
  // const { state: authState } = useContext(AuthContext);
  // const userRole = authState?.role;
  // ... dan seterusnya ...

  const [formData, setFormData] = useState({
    nama_perangkat: "",
    spesifikasi: "",
    status: "Baik",
    lab_id: "",
    nomor_inventaris: "",
    _method: "PUT",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [allLabsForAdminDropdown, setAllLabsForAdminDropdown] = useState([]);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [isFetchingLabs, setIsFetchingLabs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { state: authState } = useContext(AuthContext); // Pastikan ini ada
  const userRole = authState?.role;
  const isAdmin = userRole === 'Admin';
  const isKepalaLab = userRole === 'Kepala Lab';
  const currentLabIdContext = isKepalaLab ? authState?.lab_id_kepala?.toString() : (isAdmin && labIdUntukEdit ? labIdUntukEdit : null);
  const isLabIdFieldDisabled = isKepalaLab || (isAdmin && !!labIdUntukEdit && labIdUntukEdit !== "");

  // ... useEffects untuk fetch data dan labs ...
  useEffect(() => {
    if (!id) {
        setError("ID Perangkat tidak valid untuk diedit.");
        setIsFetchingData(false);
        return;
    }
    setIsFetchingData(true);
    get(`/perangkat/${id}`)
      .then(response => {
        const perangkat = response.data;
        if (perangkat) {
          setFormData(prev => ({
            ...prev,
            nama_perangkat: perangkat.nama_perangkat || "",
            spesifikasi: perangkat.spesifikasi || "",
            status: perangkat.status || "Baik",
            lab_id: perangkat.lab_id?.toString() || (currentLabIdContext || ""),
            nomor_inventaris: perangkat.nomor_inventaris || "",
          }));
          if (perangkat.foto_perangkat) {
            const baseUrl = import.meta.env.VITE_ASSET_BASE_URL || 'http://localhost:5500';
            const subfolder = '/uploads/perangkat/';
            setCurrentImageUrl(`${baseUrl}${subfolder}${perangkat.foto_perangkat}`);
          }
        } else {
          setError("Gagal memuat data perangkat untuk diedit.");
        }
      })
      .catch(err => {
        console.error("Error fetching perangkat data for edit:", err);
        setError("Gagal memuat data perangkat: " + (err.response?.data?.message || err.message));
      })
      .finally(() => setIsFetchingData(false));
  }, [id, currentLabIdContext]);

  useEffect(() => {
    if (isAdmin && !isLabIdFieldDisabled) {
      setIsFetchingLabs(true);
      get("/lab")
        .then(response => {
          if (response.data && Array.isArray(response.data)) {
            setAllLabsForAdminDropdown(response.data);
          } else {
            setError("Gagal memuat daftar laboratorium untuk pilihan.");
          }
        })
        .catch(err => {
          console.error("Error fetching labs for Admin EditPerangkat:", err);
          setError("Gagal memuat daftar laboratorium.");
        })
        .finally(() => setIsFetchingLabs(false));
    }
  }, [isAdmin, isLabIdFieldDisabled]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    } else {
        setSelectedFile(null);
        setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Pastikan ini dipanggil
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
    dataToSubmit.append("_method", "PUT");

    if (selectedFile instanceof File) {
      dataToSubmit.append("foto_perangkat", selectedFile, selectedFile.name);
    }

    try {
      const response = await putWithFile(`/perangkat/update/${id}`, dataToSubmit);
      onUpdate({ message: response.message || "Data perangkat berhasil diupdate.", updatedId: id, newData: response.data });
      onClose();
    } catch (err) {
      console.error("EditPerangkat - handleSubmit: Gagal mengupdate perangkat:", err.response?.data || err.message || err);
      setError(err.response?.data?.message || "Gagal mengupdate perangkat. Silakan coba lagi.");
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

  // Logika untuk loading awal
  if (isFetchingData) {
    return (
      // Saat loading, kita tidak kirim primary/secondary button, jadi akan default ke "Tutup"
      <ModalFormContainer title="Edit Data Perangkat" onClose={onClose}>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
          <span className="ml-3">Memuat data perangkat...</span>
        </div>
      </ModalFormContainer>
    );
  }

  // Definisikan tombol-tombol di sini
  const primarySubmitButton = (
    <button
      form="editPerangkatForm" 
      disabled={isSubmitting}
      className="w-full bg-red-900 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium disabled:opacity-50"
    >
      {isSubmitting ? 'Menyimpan...' : 'Update Perangkat'}
    </button>
  );

  const secondaryCancelButton = (
    <button
      onClick={onClose}
      disabled={isSubmitting} // Opsional: nonaktifkan saat submit
      className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors duration-200 font-medium disabled:opacity-50"
    >
      Batal
    </button>
  );

  return (
    <ModalFormContainer
      title="Edit Data Perangkat"
      subtitle={`Mengubah detail untuk perangkat ID: ${id}`} // Gunakan subtitle
      onClose={onClose}
      primaryButton={primarySubmitButton}   // Kirim elemen tombol utama
      secondaryButton={secondaryCancelButton} // Kirim elemen tombol sekunder
    >
      {/* Tag <form> sekarang ada di dalam children */}
      <form id="editPerangkatForm" onSubmit={handleSubmit}>
        {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                {error}
            </div>
        )}

        {/* Semua field input Anda (Nama Perangkat, No Inventaris, Lab, Status, dll.) */}
        {/* Contoh field Nama Perangkat */}
        <div className="mb-4">
          <label htmlFor="nama_perangkat" className="block mb-2 font-medium text-md">Nama Perangkat <span className="text-red-500">*</span></label>
          <input type="text" id="nama_perangkat" name="nama_perangkat" value={formData.nama_perangkat} onChange={handleChange}
            className="shadow-sm bg-white border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 h-12"
            placeholder="Cth: PC-01, Proyektor Epson L200" required />
        </div>

        {/* Nomor Inventaris */}
        <div className="mb-4">
          <label htmlFor="nomor_inventaris" className="block mb-2 font-medium text-md">Nomor Inventaris <span className="text-red-500">*</span></label>
          <input type="text" id="nomor_inventaris" name="nomor_inventaris" value={formData.nomor_inventaris} onChange={handleChange}
            className="shadow-sm bg-white border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 h-12"
            placeholder="Masukkan Nomor Inventaris Unik" required />
        </div>

        {/* Laboratorium */}
        <div className="mb-4">
          <label htmlFor="lab_id" className="block mb-2 font-medium text-md">Laboratorium <span className="text-red-500">*</span></label>
          <select
            id="lab_id" name="lab_id" value={formData.lab_id} onChange={handleChange}
            className={`shadow-sm border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 h-12 ${isLabIdFieldDisabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
            required
            disabled={isLabIdFieldDisabled || (isAdmin && !isLabIdFieldDisabled && (isFetchingLabs || allLabsForAdminDropdown.length === 0))}
          >
            {isLabIdFieldDisabled ? (
              <option value={formData.lab_id}>
                Lab ID: {formData.lab_id} (Tidak dapat diubah)
              </option>
            ) : (
              <>
                <option value="">{isFetchingLabs ? "Memuat lab..." : "Pilih Laboratorium"}</option>
                {allLabsForAdminDropdown.map(lab => (
                  <option key={lab.lab_id} value={lab.lab_id.toString()}>
                    {lab.nama_lab} (ID: {lab.lab_id})
                  </option>
                ))}
              </>
            )}
          </select>
          {isAdmin && !isLabIdFieldDisabled && allLabsForAdminDropdown.length === 0 && !isFetchingLabs &&
            <p className="text-xs text-red-500 mt-1">Tidak ada data lab. Tambahkan lab terlebih dahulu.</p>
          }
        </div>

        {/* Status Perangkat */}
        <div className="mb-4">
          <label htmlFor="status" className="block mb-2 font-medium text-md">Status Perangkat <span className="text-red-500">*</span></label>
          <select id="status" name="status" value={formData.status} onChange={handleChange}
            className="shadow-sm bg-white border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 h-12" required >
            {statusPerangkatOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {/* Spesifikasi */}
        <div className="mb-4">
          <label htmlFor="spesifikasi" className="block mb-2 font-medium text-md">Spesifikasi (Opsional)</label>
          <textarea id="spesifikasi" name="spesifikasi" rows="4" value={formData.spesifikasi} onChange={handleChange}
            className="shadow-sm bg-white border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            placeholder="Cth: RAM 8GB, SSD 256GB, Intel i5 Gen 7" />
        </div>

        {/* Foto Perangkat */}
        <div className="mb-4">
          <label htmlFor="foto_perangkat_input" className="block mb-2 font-medium text-md">Ganti Foto Perangkat (Opsional)</label>
          { (previewUrl || currentImageUrl) && (
              <div className="my-2">
                  <img
                      src={previewUrl || currentImageUrl}
                      alt="Preview Perangkat"
                      className="w-40 h-40 object-cover rounded-md border"
                  />
              </div>
          )}
          <input type="file" id="foto_perangkat_input" name="foto_perangkat_input" onChange={handleFileChange} accept="image/*"
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-md cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          {selectedFile && (
            <div className="mt-2 text-xs text-gray-500">File baru dipilih: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)</div>
          )}
          {currentImageUrl && !selectedFile && (
              <div className="mt-2 text-xs text-gray-500">Foto saat ini akan tetap digunakan.</div>
          )}
        </div>
        {/* Tidak perlu tombol submit di sini karena sudah dihandle oleh primaryButton */}
      </form>
    </ModalFormContainer>
  );
};

export default EditPerangkat;
