// src/pages/Pengajuan/AddJadwalLab.js
// (Sesuaikan path jika direktori Anda berbeda)

import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { post, get } from "../../utils/api"; // Pastikan Anda memiliki fungsi 'post' (bukan 'postWithFile') dan 'get'
import Dashboard from "../../Layouts/Dashboard";
import useTitle from "../../utils/useTitle";
import FormContainer from "../../Components/FormContainer"; // Pastikan path ini benar
import { AuthContext } from "../../Context/AuthContext"; // Info user yang login, mungkin tidak langsung dipakai di payload tapi bisa berguna

const AddJadwalLab = () => {
  useTitle("Pengajuan Jadwal Lab - Dashboard");
  const navigate = useNavigate();
  const { state: authState } = useContext(AuthContext); // Info user yang login

  const [formData, setFormData] = useState({
    lab_id: "",
    tanggal_pakai: "",
    jam_mulai: "",
    jam_selesai: "",
    kelas: "",
    mata_pelajaran: "",
    kegiatan: "Jadwal Biasa", // Default value
  });
  const [labs, setLabs] = useState([]); // Untuk daftar laboratorium

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch data laboratorium untuk dropdown
  useEffect(() => {
    const fetchLabs = async () => {
      try {
        // Sesuaikan endpoint ini jika berbeda untuk mengambil daftar lab
        const response = await get("/lab"); // Atau /lab/list, /lab/all, dll.
        if (response && Array.isArray(response.data)) {
          setLabs(response.data);
        } else {
          console.warn(
            "Data laboratorium tidak ditemukan atau format salah:",
            response
          );
          setLabs([]);
          // Pertimbangkan untuk setError di sini jika daftar lab penting untuk melanjutkan
          // setError("Gagal memuat daftar laboratorium. Tidak dapat membuat pengajuan.");
        }
      } catch (err) {
        console.error(
          "Gagal mengambil data laboratorium:",
          err.response?.data || err.message || err
        );
        setError(
          "Gagal memuat daftar laboratorium. Silakan coba muat ulang halaman."
        );
      }
    };
    fetchLabs();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    // Validasi dasar
    if (
      !formData.lab_id ||
      !formData.tanggal_pakai ||
      !formData.jam_mulai ||
      !formData.jam_selesai ||
      !formData.kelas.trim() ||
      !formData.mata_pelajaran.trim() ||
      !formData.kegiatan.trim()
    ) {
      setError("Semua field yang ditandai bintang (*) wajib diisi.");
      setIsSubmitting(false);
      return;
    }

    // Validasi jam mulai vs jam selesai
    if (formData.jam_mulai >= formData.jam_selesai) {
      setError("Jam mulai harus sebelum jam selesai.");
      setIsSubmitting(false);
      return;
    }

    // Validasi tanggal tidak boleh di masa lalu (opsional, tapi baik)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set ke awal hari
    const selectedDate = new Date(formData.tanggal_pakai);
    selectedDate.setHours(0, 0, 0, 0); // Normalisasi tanggal pilihan user

    if (selectedDate < today) {
      setError("Tanggal pakai tidak boleh kurang dari tanggal hari ini.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      lab_id: formData.lab_id,
      tanggal_pakai: formData.tanggal_pakai, // Format YYYY-MM-DD dari input type="date"
      jam_mulai: formData.jam_mulai, // Format HH:MM dari input type="time"
      jam_selesai: formData.jam_selesai, // Format HH:MM dari input type="time"
      kelas: formData.kelas,
      mata_pelajaran: formData.mata_pelajaran,
      kegiatan: formData.kegiatan,
    };

    // Jika backend memerlukan user_id dari frontend (meskipun biasanya dari token)
    // payload.user_id = authState.userId; // Sesuaikan dengan field di authState

    console.log(
      "AddJadwalLab - handleSubmit: Payload yang akan dikirim:",
      payload
    );

    // ... (kode sebelum try-catch tetap sama)

    try {
      // Gunakan 'post' dan endpoint yang benar
      await post("/pengajuan/create", payload); // Sesuaikan path navigasi setelah berhasil

      navigate("/riwayat-pengajuan", {
        // Atau halaman lain yang relevan
        state: { successMsg: "Pengajuan jadwal lab berhasil dikirim" },
      });
    } catch (err) {
      // Log detail error untuk diagnosis - tambahkan err.error dan err.message langsung
      console.error(
        "AddJadwalLab - handleSubmit: Gagal mengirim pengajuan (RAW):",
        {
          err_direct_error_prop: err.error, // <--- Periksa ini
          err_direct_message_prop: err.message, // <--- Periksa ini
          responseStatus: err.response?.status,
          responseData: err.response?.data,
          fullErrorObject: err,
        }
      );

      let messageToDisplay = "Gagal mengirim pengajuan. Silakan coba lagi."; // Pesan default

      // 1. Cek apakah 'err' secara langsung memiliki properti 'error' (berdasarkan log Anda)
      if (typeof err.error === "string" && err.error.trim() !== "") {
        messageToDisplay = err.error; // Ini SEHARUSNYA menangkap "Jadwal bentrok..."
      }
      // 2. Alternatif, cek apakah 'err' secara langsung memiliki properti 'message'
      //    (ini untuk kasus jika API Anda terkadang mengembalikan { message: "..." } secara langsung di 'err')
      //    dan pastikan itu bukan bagian dari err.response (yang mana undefined dalam kasus Anda)
      else if (
        typeof err.message === "string" &&
        err.message.trim() !== "" &&
        !err.response
      ) {
        messageToDisplay = err.message;
      }
      // 3. Jika tidak ada di 'err' langsung, baru cek struktur error standar Axios (err.response.data)
      //    (Meskipun dalam kasus Anda err.response undefined, ini untuk jaga-jaga jika error lain berbeda)
      else if (err.response && err.response.data) {
        const apiErrorData = err.response.data;
        if (
          typeof apiErrorData.message === "string" &&
          apiErrorData.message.trim() !== ""
        ) {
          messageToDisplay = apiErrorData.message;
        } else if (
          typeof apiErrorData.error === "string" &&
          apiErrorData.error.trim() !== ""
        ) {
          messageToDisplay = apiErrorData.error;
        } else if (
          typeof apiErrorData === "string" &&
          apiErrorData.trim() !== ""
        ) {
          messageToDisplay = apiErrorData;
        }
      }
      // 4. Fallback terakhir ke err.message jika messageToDisplay masih default
      //    Ini untuk error umum seperti "Network Error" atau jika err.message didefinisikan tapi tidak tertangkap di atas.
      //    Dalam kasus Anda, err.message adalah undefined, jadi ini tidak akan berpengaruh untuk error spesifik ini.
      if (
        messageToDisplay === "Gagal mengirim pengajuan. Silakan coba lagi." &&
        typeof err.message === "string" &&
        err.message.trim() !== ""
      ) {
        messageToDisplay = err.message;
      }

      console.log(
        "AddJadwalLab - handleSubmit: Pesan error FINAL yang akan ditampilkan ke user:",
        messageToDisplay
      );

      setError(messageToDisplay);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dashboard title="Pengajuan Jadwal Laboratorium">
      <FormContainer
        title="Form Pengajuan Jadwal Lab"
        description="Isi detail pengajuan penggunaan laboratorium"
        error={error}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)} // Kembali ke halaman sebelumnya
        submitText="Kirim Pengajuan"
      >
        {/* Baris 1: Lab dan Tanggal Pakai */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div className="mb-1">
            <label
              htmlFor="lab_id"
              className="block mb-1.5 text-sm font-medium text-gray-700"
            >
              Pilih Laboratorium <span className="text-red-500">*</span>
            </label>
            <select
              id="lab_id"
              name="lab_id"
              value={formData.lab_id}
              onChange={handleChange}
              required
              className="shadow-sm bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              disabled={labs.length === 0 && !error} // Disable jika lab belum load dan tidak ada error load lab
            >
              <option value="" disabled>
                {labs.length === 0 && !error
                  ? "Memuat daftar lab..."
                  : "Pilih Laboratorium"}
              </option>
              {labs.map((lab) => (
                // Pastikan 'lab.id' atau 'lab.lab_id' dan 'lab.nama_lab' sesuai dengan respons API Anda
                <option key={lab.lab_id || lab.id} value={lab.lab_id || lab.id}>
                  {lab.nama_lab}
                </option>
              ))}
            </select>
            {labs.length === 0 && error && (
              <p className="text-xs text-red-500 mt-1">
                {error.includes("laboratorium")
                  ? "Gagal memuat lab. Coba muat ulang."
                  : ""}
              </p>
            )}
          </div>
          <div className="mb-1">
            <label
              htmlFor="tanggal_pakai"
              className="block mb-1.5 text-sm font-medium text-gray-700"
            >
              Tanggal Pakai <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="tanggal_pakai"
              name="tanggal_pakai"
              value={formData.tanggal_pakai}
              onChange={handleChange}
              className="shadow-sm bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              required
              min={new Date().toISOString().split("T")[0]} // Minimal tanggal hari ini
            />
          </div>
        </div>

        {/* Baris 2: Jam Mulai dan Jam Selesai */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-4">
          <div className="mb-1">
            <label
              htmlFor="jam_mulai"
              className="block mb-1.5 text-sm font-medium text-gray-700"
            >
              Jam Mulai <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              id="jam_mulai"
              name="jam_mulai"
              value={formData.jam_mulai}
              onChange={handleChange}
              required
              className="shadow-sm bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            />
          </div>
          <div className="mb-1">
            <label
              htmlFor="jam_selesai"
              className="block mb-1.5 text-sm font-medium text-gray-700"
            >
              Jam Selesai <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              id="jam_selesai"
              name="jam_selesai"
              value={formData.jam_selesai}
              onChange={handleChange}
              required
              className="shadow-sm bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            />
          </div>
        </div>

        {/* Baris 3: Kelas dan Mata Pelajaran */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-4">
          <div className="mb-1">
            <label
              htmlFor="kelas"
              className="block mb-1.5 text-sm font-medium text-gray-700"
            >
              Kelas <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="kelas"
              name="kelas"
              value={formData.kelas}
              onChange={handleChange}
              className="shadow-sm bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              placeholder="Mis: XII PPLG 1"
              required
            />
          </div>
          <div className="mb-1">
            <label
              htmlFor="mata_pelajaran"
              className="block mb-1.5 text-sm font-medium text-gray-700"
            >
              Mata Pelajaran <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="mata_pelajaran"
              name="mata_pelajaran"
              value={formData.mata_pelajaran}
              onChange={handleChange}
              className="shadow-sm bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              placeholder="Mis: Pemrograman Web"
              required
            />
          </div>
        </div>

        {/* Kegiatan */}
        <div className="mt-4 mb-1">
          <label
            htmlFor="kegiatan"
            className="block mb-1.5 text-sm font-medium text-gray-700"
          >
            Kegiatan <span className="text-red-500">*</span>
          </label>
          <textarea
            id="kegiatan"
            name="kegiatan"
            rows="3"
            value={formData.kegiatan}
            onChange={handleChange}
            className="shadow-sm bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            placeholder="Mis: Praktikum Basis Data, Ujian Praktik, dll."
            required
          />
        </div>
      </FormContainer>
    </Dashboard>
  );
};

export default AddJadwalLab;
