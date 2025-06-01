// AddPengecekan.jsx

import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { post, get } from "../../utils/api";
import Dashboard from "../../Layouts/Dashboard";
import useTitle from "../../utils/useTitle";
import FormContainer from "../../components/FormContainer";
import { AuthContext } from "../../Context/AuthContext";

const AddPengecekan = () => {
  useTitle("Tambah Data Pengecekan - Dashboard");
  const navigate = useNavigate();
  const { state: authState } = useContext(AuthContext);
  const loggedInUserId = authState?.userId;

  const [formData, setFormData] = useState({
    user_id: loggedInUserId || "",
    perangkat_id: "",
    tanggal_pengecekan: new Date().toISOString().split('T')[0],
    ditemukan_kerusakan: "",
    // pemeriksaan_id: "", // Dihilangkan dari form, akan selalu null/tidak dikirim
    status_pengecekan: "Baru",
  });

  const [users, setUsers] = useState([]);
  const [perangkatList, setPerangkatList] = useState([]);
  // const [pemeriksaanList, setPemeriksaanList] = useState([]); // Dihilangkan

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loadingDropdown, setLoadingDropdown] = useState(true);

  useEffect(() => {
    const fetchDropdownData = async () => {
      setLoadingDropdown(true);
      setError("");
      let fetchErrorOccurred = false;

      try {
        const results = await Promise.allSettled([
          get("/user"),      // Pastikan endpoint ini benar
          get("/perangkat")   // Pastikan endpoint ini benar dan MENGEMBALIKAN nama_lab
          // Panggilan API untuk pemeriksaan dihilangkan
        ]);

        const usersResponse = results[0];
        if (usersResponse.status === 'fulfilled' && usersResponse.value && Array.isArray(usersResponse.value.data)) {
          setUsers(usersResponse.value.data);
          if (loggedInUserId && !usersResponse.value.data.find(u => u.user_id === loggedInUserId)) {
            console.warn(`User yang login (ID: ${loggedInUserId}) tidak ditemukan dalam daftar user dari API.`);
          }
        } else {
          setUsers([]);
          console.warn("Gagal memuat data users atau format tidak sesuai:", usersResponse.reason || usersResponse.value);
          fetchErrorOccurred = true;
        }

        const perangkatResponse = results[1];
        if (perangkatResponse.status === 'fulfilled' && perangkatResponse.value && Array.isArray(perangkatResponse.value.data)) {
          setPerangkatList(perangkatResponse.value.data);
        } else {
          setPerangkatList([]);
          console.warn("Gagal memuat data perangkat atau format tidak sesuai:", perangkatResponse.reason || perangkatResponse.value);
          fetchErrorOccurred = true;
        }
        
        if (fetchErrorOccurred) {
            setError("Gagal memuat sebagian data pendukung (Users/Perangkat). Pastikan API endpoint terkait berfungsi dan mengembalikan data yang benar.");
        }

      } catch (err) { 
        console.error("Error kritis saat mengambil data untuk dropdown:", err);
        setError("Gagal memuat data pendukung untuk form. Terjadi kesalahan tidak terduga.");
        setUsers([]);
        setPerangkatList([]);
      } finally {
        setLoadingDropdown(false);
      }
    };
    fetchDropdownData();
  }, [loggedInUserId]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); 
    setIsSubmitting(true);

    if (!formData.user_id || !formData.perangkat_id || !formData.tanggal_pengecekan || !formData.ditemukan_kerusakan.trim()) {
      setError("User Pengecek, Perangkat, Tanggal Pengecekan, dan Kerusakan Ditemukan wajib diisi.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      user_id: formData.user_id,
      perangkat_id: formData.perangkat_id,
      tanggal_pengecekan: formData.tanggal_pengecekan,
      ditemukan_kerusakan: formData.ditemukan_kerusakan,
      status_pengecekan: formData.status_pengecekan,
      pemeriksaan_id: null, // Eksplisit kirim null atau jangan kirim field ini jika backend bisa handle
    };

    try {
      await post("/pengecekan/create", payload);
      navigate("/kelola-pengecekan", {
        state: { successMsg: "Data pengecekan berhasil ditambahkan" },
      });
    } catch (err) {
      console.error("AddPengecekan - handleSubmit: Gagal menambahkan data pengecekan:", err.response?.data || err.message || err);
      setError(err.response?.data?.message || "Gagal menambahkan data pengecekan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusPengecekanOptions = [
    { value: "Baru", label: "Baru" },
    { value: "Menunggu Perbaikan", label: "Menunggu Perbaikan" },
    { value: "Sudah Ditangani", label: "Sudah Ditangani" },
  ];

  return (
    <Dashboard title="Tambah Data Pengecekan">
      <FormContainer
        title="Form Tambah Data Pengecekan"
        description="Masukkan detail temuan pengecekan perangkat"
        error={error}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/kelola-pengecekan")}
        submitText="Tambah Pengecekan"
      >
        {loadingDropdown ? (
            <div className="text-center py-4">Memuat data pilihan...</div>
        ) : (
          <>
            <div className="mb-4">
              <label htmlFor="user_id" className="block mb-1.5 font-medium text-sm">
                User Pengecek <span className="text-red-500">*</span>
              </label>
              <select
                id="user_id"
                name="user_id"
                value={formData.user_id}
                onChange={handleChange}
                className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                required
                disabled={users.length === 0 && !loadingDropdown && !loggedInUserId} 
              >
                <option value="">Pilih User Pengecek</option>
                {users.map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.nama_lengkap} ({user.role})
                  </option>
                ))}
              </select>
              {users.length === 0 && !loadingDropdown && !loggedInUserId && <p className="text-xs text-red-500 mt-1">Data user tidak tersedia.</p>}
            </div>

            <div className="mb-4">
              <label htmlFor="perangkat_id" className="block mb-1.5 font-medium text-sm">
                Perangkat yang Dicek <span className="text-red-500">*</span>
              </label>
              <select
                id="perangkat_id"
                name="perangkat_id"
                value={formData.perangkat_id}
                onChange={handleChange}
                className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                required
                disabled={perangkatList.length === 0 && !loadingDropdown}
              >
                <option value="">Pilih Perangkat</option>
                {perangkatList.map((perangkat) => (
                  <option key={perangkat.perangkat_id} value={perangkat.perangkat_id}>
                    {perangkat.nama_perangkat} 
                    (Lab: {perangkat.nama_lab || 'N/A'}) {/* MENAMPILKAN NAMA LAB */}
                    (Inv: {perangkat.nomor_inventaris || 'N/A'})
                  </option>
                ))}
              </select>
              {perangkatList.length === 0 && !loadingDropdown && <p className="text-xs text-red-500 mt-1">Data perangkat tidak tersedia.</p>}
            </div>

            <div className="mb-4">
              <label htmlFor="tanggal_pengecekan" className="block mb-1.5 font-medium text-sm">
                Tanggal Pengecekan <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="tanggal_pengecekan"
                name="tanggal_pengecekan"
                value={formData.tanggal_pengecekan}
                onChange={handleChange}
                className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="ditemukan_kerusakan" className="block mb-1.5 font-medium text-sm">
                Kerusakan yang Ditemukan <span className="text-red-500">*</span>
              </label>
              <textarea
                id="ditemukan_kerusakan"
                name="ditemukan_kerusakan"
                rows="4"
                value={formData.ditemukan_kerusakan}
                onChange={handleChange}
                className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                placeholder="Jelaskan kerusakan yang ditemukan pada perangkat"
                required
              ></textarea>
            </div>

            <div className="mb-4">
              <label htmlFor="status_pengecekan" className="block mb-1.5 font-medium text-sm">
                Status Pengecekan <span className="text-red-500">*</span>
              </label>
              <select
                id="status_pengecekan"
                name="status_pengecekan"
                value={formData.status_pengecekan}
                onChange={handleChange}
                className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                required
              >
                {statusPengecekanOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Bagian untuk ID Pemeriksaan Terkait telah dihilangkan dari form aktif */}
            {/* <div className="mb-4">
              <label htmlFor="pemeriksaan_id" className="block mb-1.5 font-medium text-sm">
                ID Pemeriksaan Terkait (Opsional)
              </label>
              <select
                id="pemeriksaan_id"
                name="pemeriksaan_id"
                value={formData.pemeriksaan_id}
                onChange={handleChange}
                className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              >
                <option value="">Tidak ada / Buat Pengecekan Manual</option>
                {pemeriksaanList.map((pemeriksaan) => (
                  <option key={pemeriksaan.pemeriksaan_id} value={pemeriksaan.pemeriksaan_id}>
                    ID: {pemeriksaan.pemeriksaan_id} ({pemeriksaan.nama_perangkat || 'Perangkat ?'} - {pemeriksaan.tanggal_pemeriksaan ? new Date(pemeriksaan.tanggal_pemeriksaan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Tgl ?'})
                  </option>
                ))}
              </select>
              {pemeriksaanList.length === 0 && !loadingDropdown && <p className="text-xs text-gray-400 mt-1">Data pemeriksaan (bermasalah) tidak tersedia untuk dilink.</p>}
            </div> 
            */}
          </>
        )}
      </FormContainer>
    </Dashboard>
  );
};

export default AddPengecekan;
