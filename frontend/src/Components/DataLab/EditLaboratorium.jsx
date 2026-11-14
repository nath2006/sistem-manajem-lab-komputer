// EditLaboratorium.js
import React, { useState, useEffect } from "react";
import { get, putWithFile } from "../../utils/api"; // Menggunakan putWithFile
import ModalContainer from "../DetailModal/ModalContainer";
import LoadingSpinner from "../DetailModal/LoadingSpinner";

const EditLaboratorium = ({ id, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    nama_lab: "",
    lokasi: "",
    kapasitas: "", // Akan di-parse ke integer saat submit jika perlu
    kepala_lab_id: "", // Akan berisi ID user
    deskripsi: "",
    status: "Tersedia", // Default status
    jam_buka: "07:00:00", // Default jam buka
    jam_tutup: "16:00:00", // Default jam tutup
  });
  const [currentFotoPath, setCurrentFotoPath] = useState(null);
  const [selectedFoto, setSelectedFoto] = useState(null);
  const [users, setUsers] = useState([]); // Untuk menyimpan daftar user (calon kepala lab)
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL || 'http://localhost:5500';
  const LAB_IMAGE_SUBFOLDER = '/uploads/labs/'; // Path subfolder untuk foto lab

  // Fetch data user untuk dropdown Kepala Lab (opsional, jika Anda punya endpoint ini)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Asumsi Anda punya endpoint untuk mengambil user dengan role tertentu atau semua user
        const response = await get("/user?role=Kepala Lab&role=Admin&role=Koordinator Lab"); // Contoh filter
        if (response && response.data) {
          setUsers(response.data);
        }
      } catch (err) {
        console.error("Gagal mengambil data user untuk Kepala Lab:", err);
        // Tidak perlu set error utama di sini, dropdown bisa tetap kosong atau tampilkan pesan
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchDetailLab = async () => {
      if (!id) {
        setError("ID Laboratorium tidak valid.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await get(`/lab/${id}`); // Endpoint detail lab
        if (response.data) {
          const labData = response.data;
          setFormData({
            nama_lab: labData.nama_lab || "",
            lokasi: labData.lokasi || "",
            kapasitas: labData.kapasitas?.toString() || "",
            kepala_lab_id: labData.kepala_lab_id?.toString() || "", // Simpan ID nya
            deskripsi: labData.deskripsi || "",
            status: labData.status || "Tersedia",
            jam_buka: labData.jam_buka ? labData.jam_buka.substring(0, 5) : "07:00",
            jam_tutup: labData.jam_tutup ? labData.jam_tutup.substring(0, 5) : "16:00",
          });
          setCurrentFotoPath(labData.foto_lab);
        } else {
          setError("Data laboratorium tidak ditemukan.");
        }
      } catch (error) {
        console.error("Gagal mengambil data laboratorium:", error.response?.data || error.message || error);
        setError("Gagal mengambil data laboratorium.");
      } finally {
        setLoading(false);
      }
    };
    fetchDetailLab();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFoto(file || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama_lab.trim() || !formData.lokasi.trim() || !formData.kapasitas || !formData.kepala_lab_id || !formData.status || !formData.jam_buka || !formData.jam_tutup) {
      setError("Semua field yang wajib diisi harus lengkap, kecuali foto.");
      return;
    }
    setSaving(true);
    setError("");

    const dataToSubmit = new FormData();
    dataToSubmit.append("nama_lab", formData.nama_lab);
    dataToSubmit.append("lokasi", formData.lokasi);
    dataToSubmit.append("kapasitas", formData.kapasitas);
    dataToSubmit.append("kepala_lab_id", formData.kepala_lab_id);
    dataToSubmit.append("deskripsi", formData.deskripsi);
    dataToSubmit.append("status", formData.status);
    dataToSubmit.append("jam_buka", `${formData.jam_buka}:00`); // Pastikan format HH:MM:SS jika backend butuh
    dataToSubmit.append("jam_tutup", `${formData.jam_tutup}:00`);

    if (selectedFoto && selectedFoto instanceof File) {
      dataToSubmit.append("foto_lab", selectedFoto, selectedFoto.name); // Key "foto_lab" sesuai Multer config
    }

    try {
      await putWithFile(`/lab/update/${id}`, dataToSubmit); // Menggunakan putWithFile
      onUpdate();
      onClose();
    } catch (error) {
      console.error("Gagal menyimpan data laboratorium:", error.response?.data || error.message || error);
      let errorMessage = "Gagal mengubah data laboratorium.";
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
      <ModalContainer title="Edit Laboratorium" onClose={onClose}>
        <LoadingSpinner />
      </ModalContainer>
    );
  }

  const primaryButton = (
    <button onClick={handleSubmit} disabled={saving}
      className="w-full px-5 py-2 text-sm font-semibold text-center rounded-md bg-red-600 hover:bg-red-700 text-white active:scale-95 focus:outline-none">
      {saving ? "Menyimpan..." : "Simpan Perubahan"}
    </button>
  );

  const secondaryButton = (
    <button onClick={onClose}
      className="w-full px-5 py-2 text-sm font-semibold text-center bg-white border-2 rounded-md text-gray-700 border-gray-300 hover:bg-gray-50 active:scale-95 focus:outline-none">
      Batal
    </button>
  );

  return (
    <ModalContainer
      title="Edit Laboratorium"
      subtitle="Edit informasi laboratorium"
      onClose={onClose}
      primaryButton={primaryButton}
      secondaryButton={secondaryButton}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-gray-700">
        {error && (
          <div className="mb-3 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="nama_lab" className="block mb-1.5 font-medium text-sm">Nama Laboratorium</label>
            <input type="text" id="nama_lab" name="nama_lab" value={formData.nama_lab} onChange={handleChange}
              className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              placeholder="Mis: Lab RPL 1" required />
          </div>
          <div>
            <label htmlFor="lokasi" className="block mb-1.5 font-medium text-sm">Lokasi</label>
            <input type="text" id="lokasi" name="lokasi" value={formData.lokasi} onChange={handleChange}
              className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              placeholder="Mis: Gedung A Lt. 2" required />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="kapasitas" className="block mb-1.5 font-medium text-sm">Kapasitas (Orang)</label>
            <input type="number" id="kapasitas" name="kapasitas" value={formData.kapasitas} onChange={handleChange}
              className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              placeholder="Mis: 36" required min="1" />
          </div>
          <div>
            <label htmlFor="kepala_lab_id" className="block mb-1.5 font-medium text-sm">Kepala Lab</label>
            <select id="kepala_lab_id" name="kepala_lab_id" value={formData.kepala_lab_id} onChange={handleChange} required
              className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
              <option value="" disabled>Pilih Kepala Lab</option>
              {users.map(user => (
                <option key={user.user_id} value={user.user_id}>{user.nama_lengkap} ({user.role})</option>
              ))}
            </select>
          </div>
        </div>
        
        <div>
          <label htmlFor="deskripsi" className="block mb-1.5 font-medium text-sm">Deskripsi</label>
          <textarea id="deskripsi" name="deskripsi" rows="3" value={formData.deskripsi} onChange={handleChange}
            className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            placeholder="Deskripsi singkat laboratorium..."></textarea>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="status" className="block mb-1.5 font-medium text-sm">Status Lab</label>
            <select id="status" name="status" value={formData.status} onChange={handleChange} required
              className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
              <option value="Tersedia">Tersedia</option>
              <option value="Tidak Tersedia">Tidak Tersedia</option>
              <option value="Pemeliharaan">Pemeliharaan</option>
            </select>
          </div>
          <div>
            <label htmlFor="jam_buka" className="block mb-1.5 font-medium text-sm">Jam Buka</label>
            <input type="time" id="jam_buka" name="jam_buka" value={formData.jam_buka} onChange={handleChange} required
              className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" />
          </div>
          <div>
            <label htmlFor="jam_tutup" className="block mb-1.5 font-medium text-sm">Jam Tutup</label>
            <input type="time" id="jam_tutup" name="jam_tutup" value={formData.jam_tutup} onChange={handleChange} required
              className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" />
          </div>
        </div>

        <div>
          <label htmlFor="foto_lab_input" className="block mb-1.5 font-medium text-sm">Foto Laboratorium (Opsional)</label>
          {currentFotoPath && !selectedFoto && (
            <div className="mb-2 text-xs text-gray-600">
              Foto saat ini: <a href={`${ASSET_BASE_URL}${LAB_IMAGE_SUBFOLDER}${currentFotoPath}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{currentFotoPath.split('/').pop() || currentFotoPath}</a>
            </div>
          )}
           {selectedFoto && (
             <div className="mb-2 text-xs text-gray-500">Foto baru dipilih: {selectedFoto.name} ({Math.round(selectedFoto.size / 1024)} KB)</div>
          )}
          <input type="file" id="foto_lab_input" name="foto_lab_input_name" onChange={handleFileChange} accept="image/png, image/jpeg, image/jpg"
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-md cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          <p className="mt-1 text-xs text-gray-500">
            Kosongkan jika tidak ingin mengubah foto. Foto baru akan menggantikan foto lama. (Max: 10MB, Tipe: JPG, PNG, JPEG)
          </p>
        </div>
      </form>
    </ModalContainer>
  );
};

export default EditLaboratorium;
