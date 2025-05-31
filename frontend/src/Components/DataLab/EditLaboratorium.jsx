// EditPengumuman.js
import React, { useState, useEffect } from "react";
import { get, putWithFile } from "../../utils/api"; // Pastikan path ini benar
import ModalContainer from "../DetailModal/ModalContainer"; // Pastikan path ini benar
import LoadingSpinner from "../DetailModal/LoadingSpinner"; // Pastikan path ini benar

const EditPengumuman = ({ id, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    judul: "",
    content: "",
    is_active: true,
  });
  const [currentFilePath, setCurrentFilePath] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null); // Ini untuk objek File aktual

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL || 'http://localhost:5500'; // Sesuaikan port jika backend di 5000
  const PENGUMUMAN_ASSET_SUBFOLDER = '/uploads/pengumuman/'; // Pastikan konsisten dengan backend static serving

  useEffect(() => {
    const fetchDetailPengumuman = async () => {
      if (!id) {
        setError("ID Pengumuman tidak valid.");
        setLoading(false);
        console.warn("EditPengumuman - fetchDetail: ID tidak valid, fetch dibatalkan.");
        return;
      }
      console.log(`EditPengumuman - fetchDetail: Memulai fetch untuk ID ${id}`);
      setLoading(true);
      try {
        const response = await get(`/pengumuman/${id}`);
        console.log("EditPengumuman - fetchDetail: Respons API GET:", response);
        if (response.data) {
          setFormData({
            judul: response.data.judul || "",
            content: response.data.content || "",
            is_active: response.data.is_active === 1 || response.data.is_active === true,
          });
          setCurrentFilePath(response.data.file_path);
          console.log("EditPengumuman - fetchDetail: Data form di-set, currentFilePath:", response.data.file_path);
        } else {
          setError("Data pengumuman tidak ditemukan dari API.");
          console.warn("EditPengumuman - fetchDetail: Data tidak ditemukan di respons API.");
        }
      } catch (error) {
        console.error("EditPengumuman - fetchDetail: Gagal mengambil data pengumuman:", error.response?.data || error.message || error);
        setError("Gagal mengambil data pengumuman");
      } finally {
        setLoading(false);
      }
    };
    fetchDetailPengumuman();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    console.log("EditPengumuman - handleFileChange: File dipilih dari input:", file);
    if (file) {
      console.log("EditPengumuman - handleFileChange: Apakah file instance dari File?", file instanceof File);
      console.log("EditPengumuman - handleFileChange: Tipe file:", file.type);
      console.log("EditPengumuman - handleFileChange: Ukuran file:", file.size);
    }
    setSelectedFile(file || null); // Set ke null jika e.target.files kosong atau file tidak valid
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.judul.trim() || !formData.content.trim()) {
      setError("Judul dan Konten tidak boleh kosong.");
      return;
    }
    setSaving(true);
    setError("");

    console.log("EditPengumuman - handleSubmit: Memulai submit...");
    console.log("EditPengumuman - handleSubmit: formData state:", formData);
    console.log("EditPengumuman - handleSubmit: selectedFile state sebelum append:", selectedFile);

    const dataToSubmit = new FormData();
    dataToSubmit.append("judul", formData.judul);
    dataToSubmit.append("content", formData.content);
    dataToSubmit.append("is_active", formData.is_active ? 1 : 0);

    if (selectedFile && selectedFile instanceof File) { // Pastikan selectedFile adalah objek File
      dataToSubmit.append("file_pengumuman", selectedFile, selectedFile.name); // Key "file_pengumuman"
      console.log("EditPengumuman - handleSubmit: File ditambahkan ke FormData dengan key 'file_pengumuman':", selectedFile);
    } else if (selectedFile) {
      console.warn("EditPengumuman - handleSubmit: selectedFile ada, tapi bukan instance dari File. Tidak di-append.", selectedFile);
    } else {
      console.log("EditPengumuman - handleSubmit: Tidak ada file baru yang dipilih (selectedFile null atau undefined).");
    }

    console.log("EditPengumuman - handleSubmit: Isi FormData yang akan dikirim:");
    for (let pair of dataToSubmit.entries()) {
      console.log(`FormData Entry: ${pair[0]} =`, pair[1]);
    }

    try {
      // Pastikan fungsi 'put' di utils/api.js dikonfigurasi untuk mengirim FormData dengan benar
      // Parameter ketiga 'true' biasanya menandakan bahwa 'dataToSubmit' adalah FormData
      console.log("EditPengumuman - handleSubmit: Memanggil put API...");
      const response = await putWithFile(`/pengumuman/update/${id}`, dataToSubmit, true);
      console.log("EditPengumuman - handleSubmit: Respons API PUT:", response);
      onUpdate();
      onClose();
    } catch (error) {
      console.error("EditPengumuman - handleSubmit: Gagal menyimpan data pengumuman:", error.response?.data || error.message || error);
      let errorMessage = "Gagal mengubah data pengumuman.";
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ModalContainer title="Edit Pengumuman" onClose={onClose}>
        <LoadingSpinner />
      </ModalContainer>
    );
  }

  const primaryButton = (
    <button
      onClick={handleSubmit}
      disabled={saving}
      className="w-full px-5 py-2 text-sm font-semibold text-center rounded-md bg-red-600 hover:bg-red-700 text-white active:scale-95 focus:outline-none"
    >
      {saving ? "Menyimpan..." : "Simpan Perubahan"}
    </button>
  );

  const secondaryButton = (
    <button
      onClick={onClose}
      className="w-full px-5 py-2 text-sm font-semibold text-center bg-white border-2 rounded-md text-gray-700 border-gray-300 hover:bg-gray-50 active:scale-95 focus:outline-none"
    >
      Batal
    </button>
  );

  return (
    <ModalContainer
      title="Edit Pengumuman"
      subtitle="Edit informasi pengumuman"
      onClose={onClose}
      primaryButton={primaryButton}
      secondaryButton={secondaryButton}
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-gray-700">
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="judul" className="block mb-1.5 font-medium text-sm">Judul Pengumuman</label>
          <input
            type="text"
            id="judul"
            name="judul"
            value={formData.judul}
            onChange={handleChange}
            className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            placeholder="Masukan Judul Pengumuman"
            required
          />
        </div>

        <div>
          <label htmlFor="content" className="block mb-1.5 font-medium text-sm">Konten</label>
          <textarea
            id="content"
            name="content"
            rows="4"
            value={formData.content}
            onChange={handleChange}
            className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            placeholder="Masukan Isi Pengumuman"
            required
          ></textarea>
        </div>
        
        <div>
          <label htmlFor="file" className="block mb-1.5 font-medium text-sm">File Pendukung (Opsional)</label>
          {currentFilePath && !selectedFile && (
            <div className="mb-2 text-xs text-gray-600">
              File saat ini: <a href={`${ASSET_BASE_URL}${PENGUMUMAN_ASSET_SUBFOLDER}${currentFilePath}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{currentFilePath.split('/').pop() || currentFilePath}</a>
            </div>
          )}
          {selectedFile && (
             <div className="mb-2 text-xs text-gray-500">File baru dipilih: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)</div>
          )}
          <input
            type="file"
            id="file"
            // name="file_pengumuman_input" // Atribut name HTML tidak terlalu krusial jika FormData di-append manual
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-md cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="mt-1 text-xs text-gray-500">
            Kosongkan jika tidak ingin mengubah file. File baru akan menggantikan file lama.
          </p>
        </div>

        <div className="pt-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium">Jadikan Pengumuman Aktif</span>
          </label>
        </div>
      </form>
    </ModalContainer>
  );
};

export default EditPengumuman;
