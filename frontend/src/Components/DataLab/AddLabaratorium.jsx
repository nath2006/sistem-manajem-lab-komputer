// AddPengumuman.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { postWithFile } from "../../utils/api"; // GANTI: Impor postWithFile
import Dashboard from "../../Layouts/Dashboard";
import useTitle from "../../utils/useTitle";
import FormContainer from "../FormContainer";

const AddPengumuman = () => {
  useTitle("Tambah Pengumuman - Dashboard"); // GANTI: Judul halaman
  const navigate = useNavigate();

  // State untuk form data pengumuman
  const [formData, setFormData] = useState({
    judul: "",
    content: "",
    is_active: true, // Default pengumuman aktif saat dibuat
  });
  const [selectedFile, setSelectedFile] = useState(null); // State untuk file yang diupload

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    console.log("AddPengumuman - handleFileChange: File dipilih:", file);
    setSelectedFile(file || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    if (!formData.judul.trim() || !formData.content.trim()) {
      setError("Judul dan Konten Pengumuman tidak boleh kosong.");
      setIsSubmitting(false);
      return;
    }

    const dataToSubmit = new FormData();
    dataToSubmit.append("judul", formData.judul);
    dataToSubmit.append("content", formData.content);
    dataToSubmit.append("is_active", formData.is_active ? 1 : 0); // Kirim 1 atau 0

    if (selectedFile && selectedFile instanceof File) {
      dataToSubmit.append("file_pengumuman", selectedFile, selectedFile.name); // Key 'file_pengumuman'
      console.log("AddPengumuman - handleSubmit: File ditambahkan ke FormData:", selectedFile);
    } else {
      console.log("AddPengumuman - handleSubmit: Tidak ada file yang dipilih.");
    }
    
    console.log("AddPengumuman - handleSubmit: Isi FormData yang akan dikirim:");
    for (let pair of dataToSubmit.entries()) {
      console.log(`FormData Entry -> Key: ${pair[0]}, Value:`, pair[1]);
    }

    try {
      // GANTI: Gunakan postWithFile dan endpoint yang benar
      await postWithFile("/pengumuman/create", dataToSubmit);

      navigate("/kelola-pengumuman", { // GANTI: Navigasi ke halaman daftar pengumuman
        state: { successMsg: "Pengumuman berhasil ditambahkan" }, // GANTI: Pesan sukses
      });
    } catch (err) {
      console.error("AddPengumuman - handleSubmit: Gagal menambahkan pengumuman:", err.response?.data || err.message || err);
      setError(err.message || "Gagal menambahkan pengumuman. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dashboard title="Tambah Pengumuman"> {/* GANTI: Judul Dashboard */}
      <FormContainer
        title="Form Tambah Pengumuman" // GANTI: Judul Form
        description="Tambahkan informasi lengkap untuk pengumuman baru" // GANTI: Deskripsi Form
        error={error}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/kelola-pengumuman")} // GANTI: Navigasi batal
        submitText="Tambah Pengumuman" // GANTI: Teks tombol submit
      >
        {/* Input untuk Judul Pengumuman */}
        <div className="mb-4">
          <label htmlFor="judul" className="block mb-2 font-medium text-md">Judul Pengumuman</label>
          <input
            type="text"
            id="judul"
            name="judul"
            value={formData.judul}
            onChange={handleChange}
            className="shadow-sm bg-white border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 h-12"
            placeholder="Masukan Judul Pengumuman"
            required
          />
        </div>

        {/* Input untuk Konten Pengumuman */}
        <div className="mb-4">
          <label htmlFor="content" className="block mb-2 font-medium text-md">Konten Pengumuman</label>
          <textarea
            id="content"
            name="content"
            rows="5" // Tambah tinggi textarea
            value={formData.content}
            onChange={handleChange}
            className="shadow-sm bg-white border-[2px] border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            placeholder="Masukan Isi Konten Pengumuman"
            required
          />
        </div>

        {/* Input untuk File Pendukung */}
        <div className="mb-4">
          <label htmlFor="file_pengumuman_input" className="block mb-2 font-medium text-md">File Pendukung (Opsional)</label>
          <input
            type="file"
            id="file_pengumuman_input"
            name="file_pengumuman_input" // Nama atribut HTML, tidak harus sama dengan key FormData
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-md cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
           {selectedFile && (
             <div className="mt-2 text-xs text-gray-500">File dipilih: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)</div>
          )}
        </div>

        {/* Checkbox untuk Status Aktif */}
        <div className="mb-6 pt-2"> {/* Beri sedikit margin atas */}
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-md font-medium">Aktifkan Pengumuman</span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Jika dicentang, pengumuman akan langsung tampil setelah ditambahkan.
          </p>
        </div>
      </FormContainer>
    </Dashboard>
  );
};

export default AddPengumuman;
