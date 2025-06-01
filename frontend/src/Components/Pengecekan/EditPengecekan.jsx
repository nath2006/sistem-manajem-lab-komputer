// EditPengecekan.jsx
import React, { useState, useEffect, useContext } from "react";
import { get, put } from "../../utils/api"; // Menggunakan 'put' untuk JSON, atau sesuaikan jika 'putWithFile' bisa handle FormData tanpa file
import ModalContainer from "../DetailModal/ModalContainer";
import LoadingSpinner from "../DetailModal/LoadingSpinner";
import { AuthContext } from "../../Context/AuthContext"; // Untuk mengambil user yang login jika diperlukan

const EditPengecekan = ({ id, onClose, onUpdate }) => {
  const { state: authState } = useContext(AuthContext);
  // const loggedInUserId = authState?.user?.user_id; // ID user yang sedang login, bisa digunakan untuk validasi atau field 'diubah_oleh'

  const [formData, setFormData] = useState({
    user_id: "", // Akan di-fetch, biasanya tidak diedit
    perangkat_id: "", // Akan di-fetch, biasanya tidak diedit
    pemeriksaan_id: null, // Akan di-fetch, biasanya tidak diedit
    tanggal_pengecekan: "",
    ditemukan_kerusakan: "",
    status_pengecekan: "Baru", // Default atau akan di-fetch
    // Info tambahan yang mungkin ingin ditampilkan tapi tidak diedit
    nama_user_pengecek: "",
    nama_perangkat: "",
    nama_lab: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDetailPengecekan = async () => {
      if (!id) {
        setError("ID Pengecekan tidak valid.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const response = await get(`/pengecekan/${id}`);
        if (response.data) {
          const dataPengecekan = response.data;
          setFormData({
            user_id: dataPengecekan.user_id || "",
            perangkat_id: dataPengecekan.perangkat_id || "",
            pemeriksaan_id: dataPengecekan.pemeriksaan_id || null,
            // Untuk tanggal, pastikan formatnya YYYY-MM-DD untuk input type="date"
            tanggal_pengecekan: dataPengecekan.tanggal_pengecekan ? new Date(dataPengecekan.tanggal_pengecekan).toISOString().split('T')[0] : "",
            ditemukan_kerusakan: dataPengecekan.ditemukan_kerusakan || "",
            status_pengecekan: dataPengecekan.status_pengecekan || "Baru",
            // Data tambahan untuk display (jika ada dan dikirim API detail)
            nama_user_pengecek: dataPengecekan.nama_user || dataPengecekan.nama_user_pengecek || "",
            nama_perangkat: dataPengecekan.nama_perangkat || "",
            nama_lab: dataPengecekan.nama_lab || "",
          });
        } else {
          setError("Data pengecekan tidak ditemukan dari API.");
        }
      } catch (error) {
        console.error("EditPengecekan - fetchDetail: Gagal mengambil data pengecekan:", error.response?.data || error.message || error);
        setError("Gagal mengambil data pengecekan. " + (error.response?.data?.message || ""));
      } finally {
        setLoading(false);
      }
    };
    fetchDetailPengecekan();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.tanggal_pengecekan || !formData.ditemukan_kerusakan.trim() || !formData.status_pengecekan) {
      setError("Tanggal Pengecekan, Kerusakan Ditemukan, dan Status Pengecekan tidak boleh kosong.");
      return;
    }
    setSaving(true);
    setError("");

    // Data yang akan dikirim untuk update.
    // user_id dan perangkat_id biasanya tidak diubah.
    // Jika backend Anda mengharapkannya, sertakan. Jika tidak, hapus.
    const dataToSubmit = {
      user_id: formData.user_id, // Jika backend mengharapkan user_id pengecek awal
      perangkat_id: formData.perangkat_id, // Jika backend mengharapkan perangkat_id awal
      pemeriksaan_id: formData.pemeriksaan_id, // Jika backend mengharapkannya
      tanggal_pengecekan: formData.tanggal_pengecekan,
      ditemukan_kerusakan: formData.ditemukan_kerusakan,
      status_pengecekan: formData.status_pengecekan,
      // Anda mungkin ingin menambahkan field 'diubah_oleh_user_id: loggedInUserId' jika ada di backend
    };

    try {
      // Gunakan fungsi 'put' jika data adalah JSON.
      // Jika Anda harus menggunakan putWithFile dan FormData, Anda perlu konversi dataToSubmit ke FormData
      // const formDataInstance = new FormData();
      // Object.keys(dataToSubmit).forEach(key => formDataInstance.append(key, dataToSubmit[key]));
      // await putWithFile(`/pengecekan/update/${id}`, formDataInstance);

      await put(`/pengecekan/update/${id}`, dataToSubmit); // Asumsi endpoint dan method PUT
      onUpdate(); // Panggil callback onUpdate untuk refresh data di halaman list
      onClose();  // Tutup modal
    } catch (error) {
      console.error("EditPengecekan - handleSubmit: Gagal menyimpan data pengecekan:", error.response?.data || error.message || error);
      setError(error.response?.data?.message || "Gagal mengubah data pengecekan.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ModalContainer title="Edit Data Pengecekan" onClose={onClose}>
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

  // Opsi untuk ENUM status_pengecekan
  const statusPengecekanOptions = [
    { value: "Baru", label: "Baru" },
    { value: "Menunggu Perbaikan", label: "Menunggu Perbaikan" },
    { value: "Sudah Ditangani", label: "Sudah Ditangani" },
  ];

  return (
    <ModalContainer
      title="Edit Data Pengecekan"
      subtitle="Ubah informasi data pengecekan perangkat"
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

        {/* Informasi yang mungkin tidak diedit tapi ditampilkan */}
        {formData.nama_perangkat && (
            <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                <p className="text-sm font-medium">Perangkat: <span className="font-normal">{formData.nama_perangkat} (ID: {formData.perangkat_id})</span></p>
                {formData.nama_lab && <p className="text-sm font-medium">Lokasi: <span className="font-normal">{formData.nama_lab}</span></p>}
                {formData.nama_user_pengecek && <p className="text-sm font-medium">Dicek Oleh: <span className="font-normal">{formData.nama_user_pengecek} (ID: {formData.user_id})</span></p>}
                 {formData.pemeriksaan_id && <p className="text-sm font-medium">ID Pemeriksaan Terkait: <span className="font-normal">{formData.pemeriksaan_id}</span></p>}
            </div>
        )}

        <div>
          <label htmlFor="tanggal_pengecekan" className="block mb-1.5 font-medium text-sm">Tanggal Pengecekan</label>
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

        <div>
          <label htmlFor="ditemukan_kerusakan" className="block mb-1.5 font-medium text-sm">Kerusakan Ditemukan</label>
          <textarea
            id="ditemukan_kerusakan"
            name="ditemukan_kerusakan"
            rows="4"
            value={formData.ditemukan_kerusakan}
            onChange={handleChange}
            className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            placeholder="Jelaskan kerusakan yang ditemukan"
            required
          ></textarea>
        </div>

        <div>
          <label htmlFor="status_pengecekan" className="block mb-1.5 font-medium text-sm">Status Pengecekan</label>
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

        {/* Tombol submit sudah dihandle oleh ModalContainer jika primaryButton di-pass */}
      </form>
    </ModalContainer>
  );
};

export default EditPengecekan;
