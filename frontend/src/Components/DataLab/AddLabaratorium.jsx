// AddLaboratorium.js
import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { postWithFile, get } from "../../utils/api"; // Impor get untuk mengambil daftar user
import Dashboard from "../../Layouts/Dashboard";
import useTitle from "../../utils/useTitle";
import FormContainer from "../../Components/FormContainer"; // Pastikan path ini benar
import { AuthContext } from "../../Context/AuthContext"; // Jika perlu info user login

const AddLaboratorium = () => {
  useTitle("Tambah Laboratorium - Dashboard");
  const navigate = useNavigate();
  const { state: authState } = useContext(AuthContext); // Info user yang login

  const [formData, setFormData] = useState({
    nama_lab: "",
    lokasi: "",
    kapasitas: "",
    kepala_lab_id: "", // Akan diisi dengan user_id Kepala Lab
    deskripsi: "",
    status: "Tersedia", // Default status
    jam_buka: "07:00",   // Default jam buka (format HH:MM)
    jam_tutup: "16:00",  // Default jam tutup (format HH:MM)
  });
  const [selectedFoto, setSelectedFoto] = useState(null); // Untuk file foto lab
  const [users, setUsers] = useState([]); // Untuk daftar user (calon Kepala Lab)

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch data user untuk dropdown Kepala Lab
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Ambil user dengan role yang relevan untuk menjadi Kepala Lab
        // Sesuaikan query parameter 'role' jika diperlukan oleh backend Anda
        const response = await get("/user?roles=Kepala Lab,Admin,Koordinator Lab"); 
        if (response && Array.isArray(response.data)) {
          setUsers(response.data);
        } else {
          console.warn("Data user untuk Kepala Lab tidak ditemukan atau format salah:", response);
          setUsers([]);
        }
      } catch (err) {
        console.error("Gagal mengambil data user untuk Kepala Lab:", err.response?.data || err.message || err);
        // Tidak set error utama di sini agar form tetap bisa digunakan
      }
    };
    fetchUsers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    console.log("AddLaboratorium - handleFileChange: Foto dipilih:", file);
    setSelectedFoto(file || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    // Validasi dasar
    if (!formData.nama_lab.trim() || !formData.lokasi.trim() || !formData.kapasitas || 
        !formData.kepala_lab_id || !formData.status || !formData.jam_buka || !formData.jam_tutup) {
      setError("Semua field yang ditandai bintang (*) wajib diisi.");
      setIsSubmitting(false);
      return;
    }
    if (isNaN(parseInt(formData.kapasitas)) || parseInt(formData.kapasitas) <= 0) {
        setError("Kapasitas harus berupa angka positif.");
        setIsSubmitting(false);
        return;
    }

    const dataToSubmit = new FormData();
    dataToSubmit.append("nama_lab", formData.nama_lab);
    dataToSubmit.append("lokasi", formData.lokasi);
    dataToSubmit.append("kapasitas", formData.kapasitas);
    dataToSubmit.append("kepala_lab_id", formData.kepala_lab_id);
    dataToSubmit.append("deskripsi", formData.deskripsi);
    dataToSubmit.append("status", formData.status);
    // Pastikan format jam sesuai dengan yang diharapkan backend (misal HH:MM:SS)
    dataToSubmit.append("jam_buka", `${formData.jam_buka}:00`); 
    dataToSubmit.append("jam_tutup", `${formData.jam_tutup}:00`);

    if (selectedFoto && selectedFoto instanceof File) {
      // Pastikan key "foto_lab" sesuai dengan yang diharapkan Multer di backend
      dataToSubmit.append("foto_lab", selectedFoto, selectedFoto.name);
      console.log("AddLaboratorium - handleSubmit: Foto lab ditambahkan ke FormData:", selectedFoto);
    } else {
      console.log("AddLaboratorium - handleSubmit: Tidak ada foto lab yang dipilih.");
      // Jika foto wajib, tambahkan validasi di sini
      // setError("Foto laboratorium wajib diisi.");
      // setIsSubmitting(false);
      // return;
    }
    
    console.log("AddLaboratorium - handleSubmit: Isi FormData yang akan dikirim:");
    for (let pair of dataToSubmit.entries()) {
      console.log(`FormData Entry -> Key: ${pair[0]}, Value:`, pair[1]);
    }

    try {
      // Gunakan postWithFile dan endpoint yang benar untuk create lab
      await postWithFile("/lab/create", dataToSubmit);

      navigate("/kelola/data-lab", { 
        state: { successMsg: "Data laboratorium berhasil ditambahkan" },
      });
    } catch (err) {
      console.error("AddLaboratorium - handleSubmit: Gagal menambahkan laboratorium:", err.response?.data || err.message || err);
      setError(err.response?.data?.message || err.message || "Gagal menambahkan laboratorium. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dashboard title="Tambah Laboratorium">
      <FormContainer
        title="Form Tambah Laboratorium"
        description="Isi informasi lengkap untuk laboratorium baru"
        error={error}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/kelola/data-lab")} 
        submitText="Tambah Laboratorium"
      >
        {/* Baris 1: Nama Lab dan Lokasi */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div className="mb-1"> {/* Mengurangi margin bottom */}
            <label htmlFor="nama_lab" className="block mb-1.5 text-sm font-medium text-gray-700">Nama Laboratorium <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="nama_lab"
              name="nama_lab"
              value={formData.nama_lab}
              onChange={handleChange}
              className="shadow-sm bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              placeholder="Mis: Laboratorium RPL 1"
              required
            />
          </div>
          <div className="mb-1">
            <label htmlFor="lokasi" className="block mb-1.5 text-sm font-medium text-gray-700">Lokasi <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="lokasi"
              name="lokasi"
              value={formData.lokasi}
              onChange={handleChange}
              className="shadow-sm bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              placeholder="Mis: Gedung A Lantai 2"
              required
            />
          </div>
        </div>

        {/* Baris 2: Kapasitas dan Kepala Lab */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-4">
          <div className="mb-1">
            <label htmlFor="kapasitas" className="block mb-1.5 text-sm font-medium text-gray-700">Kapasitas (Orang) <span className="text-red-500">*</span></label>
            <input
              type="number"
              id="kapasitas"
              name="kapasitas"
              value={formData.kapasitas}
              onChange={handleChange}
              className="shadow-sm bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              placeholder="Mis: 36"
              required
              min="1"
            />
          </div>
          <div className="mb-1">
            <label htmlFor="kepala_lab_id" className="block mb-1.5 text-sm font-medium text-gray-700">Kepala Lab <span className="text-red-500">*</span></label>
            <select
              id="kepala_lab_id"
              name="kepala_lab_id"
              value={formData.kepala_lab_id}
              onChange={handleChange}
              required
              className="shadow-sm bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            >
              <option value="" disabled>Pilih Kepala Lab</option>
              {users.length > 0 ? (
                users.map(user => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.nama_lengkap} ({user.role})
                  </option>
                ))
              ) : (
                <option value="" disabled>Memuat daftar user...</option>
              )}
            </select>
          </div>
        </div>
        
        {/* Deskripsi */}
        <div className="mt-4 mb-1">
          <label htmlFor="deskripsi" className="block mb-1.5 text-sm font-medium text-gray-700">Deskripsi (Opsional)</label>
          <textarea
            id="deskripsi"
            name="deskripsi"
            rows="3"
            value={formData.deskripsi}
            onChange={handleChange}
            className="shadow-sm bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            placeholder="Deskripsi singkat mengenai laboratorium..."
          />
        </div>

        {/* Baris 3: Status, Jam Buka, Jam Tutup */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 mt-4">
          <div className="mb-1">
            <label htmlFor="status" className="block mb-1.5 text-sm font-medium text-gray-700">Status Lab <span className="text-red-500">*</span></label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              className="shadow-sm bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            >
              <option value="Tersedia">Tersedia</option>
              <option value="Tidak Tersedia">Tidak Tersedia</option>
              <option value="Pemeliharaan">Pemeliharaan</option>
            </select>
          </div>
          <div className="mb-1">
            <label htmlFor="jam_buka" className="block mb-1.5 text-sm font-medium text-gray-700">Jam Buka <span className="text-red-500">*</span></label>
            <input
              type="time"
              id="jam_buka"
              name="jam_buka"
              value={formData.jam_buka}
              onChange={handleChange}
              required
              className="shadow-sm bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            />
          </div>
          <div className="mb-1">
            <label htmlFor="jam_tutup" className="block mb-1.5 text-sm font-medium text-gray-700">Jam Tutup <span className="text-red-500">*</span></label>
            <input
              type="time"
              id="jam_tutup"
              name="jam_tutup"
              value={formData.jam_tutup}
              onChange={handleChange}
              required
              className="shadow-sm bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            />
          </div>
        </div>

        {/* Input untuk Foto Lab */}
        <div className="mt-4 mb-1">
          <label htmlFor="foto_lab_input" className="block mb-1.5 text-sm font-medium text-gray-700">Foto Laboratorium (Opsional)</label>
          <input
            type="file"
            id="foto_lab_input"
            // name="foto_lab_input_name" // Atribut name HTML, opsional di sini
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/jpg, image/webp" // Batasi tipe file gambar
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2.5 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {selectedFoto && (
            <div className="mt-2 text-xs text-gray-500">
              File dipilih: {selectedFoto.name} ({Math.round(selectedFoto.size / 1024)} KB)
            </div>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Format: JPG, PNG, JPEG, WEBP. Maks: 10MB.
          </p>
        </div>
      </FormContainer>
    </Dashboard>
  );
};

export default AddLaboratorium;
