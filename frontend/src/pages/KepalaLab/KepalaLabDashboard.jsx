// src/pages/KepalaLab/KepalaLabPage.js
import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../Context/AuthContext"; // Sesuaikan path jika perlu
import Dashboard from "../../Layouts/Dashboard"; // Sesuaikan path jika perlu
import Footer from "../../components/Footer"; // Sesuaikan path jika perlu
import { getGreetingTime } from "../../utils/greetingTime"; // Sesuaikan path jika perlu
import moment from "moment";
import useTitle from "../../utils/useTitle"; // Sesuaikan path jika perlu
import { get } from "../../utils/api"; // Sesuaikan path jika perlu
import {
  FaTasks,
  FaHourglassHalf,
  FaCheckCircle,
  FaTimesCircle,
  FaClipboardList,
} from "react-icons/fa";

// Komponen baru untuk kartu statistik
const StatisticItemCard = ({
  IconComponent,
  count,
  label,
  iconColorClass = "text-gray-700",
}) => (
  <div className="p-4 py-5 bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-all duration-300 ease-in-out flex flex-col items-center justify-center text-center">
    <div className={`mb-2 text-3xl md:text-4xl ${iconColorClass}`}>
      <IconComponent />
    </div>
    <p className="text-2xl md:text-3xl font-bold text-gray-800">{count}</p>
    <p className="text-xs md:text-sm text-gray-500 mt-1 capitalize">{label}</p>
  </div>
);

export default function KepalaLabPage() {
  useTitle("Dashboard Kepala Lab - SIM Lab Komputer");
  const navigate = useNavigate();
  const { state: authState } = useContext(AuthContext);
  const userName = authState?.fullName || authState?.user || "Pengguna";

  const [pengajuanStats, setPengajuanStats] = useState({
    menunggu: 0,
    disetujui: 0,
    ditolak: 0,
    total_filter: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState("");

  const fetchPengajuanStats = async (isInitialLoad = false) => {
    if (isInitialLoad) setIsLoadingStats(true);
    setErrorStats(""); // Clear previous errors
    try {
      const response = await get("/pengajuan/statistik"); // Pastikan 'get' adalah utilitas API Anda

      // --- MULAI LOGGING UNTUK DEBUG ---
      console.log("KepalaLabPage - Full API Response object:", response);
      if (response) {
        console.log("KepalaLabPage - API Response data:", response.data);
        console.log(
          "KepalaLabPage - Type of API Response data:",
          typeof response.data
        );
      }
      // --- AKHIR LOGGING UNTUK DEBUG ---

      // Periksa apakah response ada dan response.data adalah objek non-null
      if (
        response &&
        typeof response.data === "object" &&
        response.data !== null
      ) {
        // Pastikan properti yang diharapkan ada dan parse, default ke 0 jika NaN atau hilang
        setPengajuanStats({
          menunggu: parseInt(response.data.menunggu, 10) || 0,
          disetujui: parseInt(response.data.disetujui, 10) || 0,
          ditolak: parseInt(response.data.ditolak, 10) || 0,
          total_filter: parseInt(response.data.total_filter, 10) || 0,
        });
      } else {
        // Di sinilah error spesifik Anda kemungkinan besar dipicu
        console.error(
          "KepalaLabPage - API response.data is not a valid object or is null. Response:",
          response
        );
        if (isInitialLoad)
          setErrorStats(
            "Format data statistik tidak valid atau data tidak ditemukan."
          );
        setPengajuanStats({
          menunggu: 0,
          disetujui: 0,
          ditolak: 0,
          total_filter: 0,
        }); // Reset stats
      }
    } catch (err) {
      console.error("KepalaLabPage - Error fetching pengajuan stats:", err);
      // Log objek error untuk melihat apakah ada detail lebih lanjut (misalnya, err.response)
      console.error(
        "KepalaLabPage - Detailed error object:",
        err.response || err.message || err
      );

      if (isInitialLoad) {
        // Coba dapatkan pesan yang lebih spesifik dari objek error
        const message =
          err.response?.data?.message ||
          (typeof err.response?.data === "string" ? err.response.data : null) || // Jika response.data adalah string error
          err.message ||
          "Gagal mengambil data statistik pengajuan.";
        setErrorStats(message);
      }
      setPengajuanStats({
        menunggu: 0,
        disetujui: 0,
        ditolak: 0,
        total_filter: 0,
      }); // Reset stats saat error
    } finally {
      if (isInitialLoad) setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchPengajuanStats(true);
    // Anda bisa menambahkan interval refresh jika statistik perlu sering diperbarui
    // const refreshInterval = 300000; // 5 menit
    // const interval = setInterval(() => fetchPengajuanStats(false), refreshInterval);
    // return () => clearInterval(interval);
  }, []); // Dependency array kosong agar hanya berjalan sekali saat mount

  return (
    <>
      <Dashboard title={`Dashboard Kepala Lab`}>
        <div className="min-h-[calc(100vh-80px)] flex flex-col px-4 py-6 md:px-6 lg:px-8 bg-white text-gray-800">
          <div className="flex-grow">
            {/* Ucapan Selamat Datang */}
            <div className="mb-6 p-6 ">
              <h1 className="font-semibold text-xl md:text-2xl text-gray-800">
                Selamat {getGreetingTime(moment())}, {userName}!
              </h1>
              <p className="text-gray-600">
                Semoga harimu menyenangkan dan produktif!
              </p>
            </div>

            {/* Shortcut ACC Pengajuan */}
            <div className="mb-8 md:mb-12 group">
              <div
                className="h-[70px] max-w-full bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg hover:shadow-xl hover:cursor-pointer transition-all duration-300 ease-in-out transform hover:-translate-y-1 active:translate-y-0"
                onClick={() => navigate("/kelola-jadwal-lab")}
              >
                <div className="flex justify-start items-center h-full mx-4 sm:mx-6">
                  <div className="p-3 bg-white/20 rounded-full mr-4">
                    <FaCheckCircle size={20} className="text-white" />
                  </div>
                  <h1 className="text-white text-md sm:text-lg font-semibold">
                    Cek Pengajuan Lab
                  </h1>
                </div>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </Dashboard>
    </>
  );
}
