import { useSettings } from '../../Context/SettingsContext';
import LoadingSkeleton from '../Loading/Skeleton';
// src/pages/Pengajuan/AddJadwalLab.js
// (Sesuaikan path jika direktori Anda berbeda)

import { validateScheduleTime } from "../../../../shared/schedule.mjs";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { post, get } from "../../utils/api"; 
import Dashboard from "../../Layouts/Dashboard";
import useTitle from "../../utils/useTitle";
import FormContainer from "../FormContainer"; 
 

const AddJadwalLab = () => {
  useTitle("Pengajuan Jadwal Lab - Dashboard");
  const navigate = useNavigate();
 

  const [formData, setFormData] = useState({
    lab_id: "",
    tanggal_pakai: "",
    jam_mulai: "",
    jam_selesai: "",
    kelas: "",
    mata_pelajaran: "",
    kegiatan: "Jadwal Biasa", 
  });
  const { settings, loaded: settingsLoaded, loading: settingsLoading, error: settingsError, reloadSettings } = useSettings();
  const settingsReady = settingsLoaded && !settingsLoading && !settingsError;
  const [labs, setLabs] = useState([]);
  const [loadingLabs, setLoadingLabs] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch data laboratorium untuk dropdown
  useEffect(() => {
    const fetchLabs = async () => {
      try {
        const response = await get("/lab"); 
        if (response && Array.isArray(response.data)) {
          setLabs(response.data);
        } else {
          console.warn(
            "Data laboratorium tidak ditemukan atau format salah:",
            response
          );
          setLabs([]);
        }
      } catch (err) {
        console.error(
          "Gagal mengambil data laboratorium:",
          err.response?.data || err.message || err
        );
        setError(
          "Gagal memuat daftar laboratorium. Silakan coba muat ulang halaman."
        );
      } finally {
        setLoadingLabs(false);
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

    const scheduleError = validateScheduleTime(formData.jam_mulai, formData.jam_selesai, settings);
    if (!settingsReady || scheduleError) {
      setError(!settingsReady ? 'Konfigurasi jadwal belum dimuat.' : scheduleError);
      setIsSubmitting(false);
      return;
    }
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

    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const selectedDate = new Date(formData.tanggal_pakai);
    selectedDate.setHours(0, 0, 0, 0); 

    if (selectedDate < today) {
      setError("Tanggal pakai tidak boleh kurang dari tanggal hari ini.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      lab_id: formData.lab_id,
      tanggal_pakai: formData.tanggal_pakai,
      jam_mulai: formData.jam_mulai, 
      jam_selesai: formData.jam_selesai, 
      kelas: formData.kelas,
      mata_pelajaran: formData.mata_pelajaran,
      kegiatan: formData.kegiatan,
    };


    console.log(
      "AddJadwalLab - handleSubmit: Payload yang akan dikirim:",
      payload
    );

    // ... (kode sebelum try-catch tetap sama)

    try {
      await post("/pengajuan/create", payload); 

      navigate("/riwayat-pengajuan", {
        // Atau halaman lain yang relevan
        state: { successMsg: "Pengajuan jadwal lab berhasil dikirim" },
      });
    } catch (err) {
      
      console.error(
        "AddJadwalLab - handleSubmit: Gagal mengirim pengajuan (RAW):",
        {
          err_direct_error_prop: err.error, 
          err_direct_message_prop: err.message, 
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
        error={error || settingsError}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)} // Kembali ke halaman sebelumnya
        submitText="Kirim Pengajuan"
      >
        {!settingsReady && <div role="status" className="mb-4">Konfigurasi jadwal belum siap.
          {!settingsLoading && <button type="button" onClick={reloadSettings} className="min-h-11 px-3 underline">Coba muat konfigurasi</button>}
        </div>}
        {/* Baris 1: Lab dan Tanggal Pakai */}
        {loadingLabs || (!settingsLoaded && settingsLoading && !settingsError) ? <LoadingSkeleton variant="form" label="Memuat konfigurasi dan laboratorium..." /> : <>
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
              disabled={loadingLabs || labs.length === 0}
            >
              <option value="" disabled>
                {labs.length === 0 && !error
                  ? "Tidak ada laboratorium tersedia"
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
              min={settings.schedule_start || '07:00'}
              max={settings.schedule_end || '17:00'}
              step="60"
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
              min={settings.schedule_start || '07:00'}
              max={settings.schedule_end || '17:00'}
              step="60"
              id="jam_selesai"
              name="jam_selesai"
              value={formData.jam_selesai}
              onChange={handleChange}
              required
              className="shadow-sm bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            />
          </div>
        </div>

        <p className="mt-2 text-xs text-gray-500">Jam operasional {settings.schedule_start || '07:00'}–{settings.schedule_end || '17:00'} · Durasi pelajaran {settings.lesson_duration || 60} menit (sesuai konfigurasi admin).</p>
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
        </>}
      </FormContainer>
    </Dashboard>
  );
};

export default AddJadwalLab;
