// src/Components/Pemeriksaan/DetailPemeriksaan.jsx
import React, { useState, useEffect } from "react";
import { get } from "../../utils/api"; // Pastikan path ini benar
import InfoItem from "../DetailModal/InfoItem"; // Sesuaikan path jika perlu
import InfoSection from "../DetailModal/InfoSection"; // Sesuaikan path jika perlu
import ModalContainer from "../DetailModal/ModalContainer"; // Sesuaikan path jika perlu
import LoadingSpinner from "../DetailModal/LoadingSpinner"; // Sesuaikan path jika perlu

const DetailPemeriksaan = ({ id, onClose }) => {
  const [pemeriksaanData, setPemeriksaanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPemeriksaanData = async () => {
      if (!id) {
        setError("ID Pemeriksaan tidak valid.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(""); // Reset error sebelum fetch baru
      try {
        const response = await get(`/pemeriksaan/${id}`); // Menggunakan endpoint yang diberikan
        if (response.data) {
          setPemeriksaanData(response.data);
        } else {
          setError("Data pemeriksaan tidak ditemukan.");
          console.warn("Data pemeriksaan tidak ditemukan dalam respons:", response);
        }
      } catch (err) {
        setError("Gagal mengambil detail data pemeriksaan.");
        console.error("Gagal mengambil detail data pemeriksaan:", err.response?.data || err.message || err);
      } finally {
        setLoading(false);
      }
    };

    fetchPemeriksaanData();
  }, [id]);

  const getHasilPemeriksaanBadgeClass = (hasil) => {
    switch (hasil) {
      case 'Baik':
        return 'bg-green-100 text-green-800';
      case 'Bermasalah': // Sesuai dengan payload Anda
        return 'bg-red-100 text-red-800';
      // Tambahkan case lain jika ada, misal 'Perlu Tindakan Lanjut'
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusPerangkatBadgeClass = (status) => {
    switch (status) {
      case 'Baik':
        return 'bg-green-100 text-green-800';
      case 'Rusak':
        return 'bg-red-100 text-red-800';
      case 'Perlu Perbaikan':
        return 'bg-yellow-100 text-yellow-800';
      case 'Dalam Perbaikan':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; // Jika parsing gagal, kembalikan string asli
        return date.toLocaleString("id-ID", {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit' // Tambahkan jam dan menit jika perlu
        });
    } catch (e) {
        console.error("Error formatting date:", e);
        return dateString; // Kembalikan string asli jika ada error lain
    }
  };


  return (
    <ModalContainer
      title="Detail Riwayat Pemeriksaan"
      subtitle={`Informasi lengkap untuk pemeriksaan ID: ${id}`}
      onClose={onClose}
    >
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="text-center py-4 text-red-500">
          <p>{error}</p>
        </div>
      ) : (
        pemeriksaanData && (
          <div className="space-y-6">
            <InfoSection title="Informasi Pemeriksaan">
              <InfoItem label="ID Pemeriksaan" value={pemeriksaanData.pemeriksaan_id} />
              <InfoItem label="Tanggal Pemeriksaan" value={formatDate(pemeriksaanData.tanggal_pemeriksaan)} />
              <InfoItem 
                label="Hasil Pemeriksaan" 
                value={
                  <span
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${getHasilPemeriksaanBadgeClass(pemeriksaanData.hasil_pemeriksaan)}`}
                  >
                    {pemeriksaanData.hasil_pemeriksaan || "N/A"}
                  </span>
                } 
              />
               <InfoItem 
                label="Pelaksana Pemeriksaan" 
                value={`${pemeriksaanData.nama_pemeriksa || 'N/A'} (ID: ${pemeriksaanData.pemeriksa_user_id || 'N/A'})`} 
              />
            </InfoSection>

            <InfoSection title="Detail Perangkat yang Diperiksa">
              <InfoItem label="ID Perangkat" value={pemeriksaanData.perangkat_id} />
              <InfoItem label="Nama Perangkat" value={pemeriksaanData.nama_perangkat} />
              <InfoItem label="Nomor Inventaris" value={pemeriksaanData.nomor_inventaris} />
              <InfoItem label="Laboratorium" value={`${pemeriksaanData.nama_lab || 'N/A'} (ID: ${pemeriksaanData.lab_id || 'N/A'})`} />
              <InfoItem 
                label="Status Perangkat (Saat Ini)" 
                value={
                  <span
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${getStatusPerangkatBadgeClass(pemeriksaanData.status_perangkat_saat_ini)}`}
                  >
                    {pemeriksaanData.status_perangkat_saat_ini || "N/A"}
                  </span>
                } 
              />
            </InfoSection>
            
            {pemeriksaanData.spesifikasi_perangkat && (
                <InfoSection title="Spesifikasi Perangkat (Saat Pemeriksaan)">
                    <div className="col-span-full bg-gray-50 p-3 rounded-md border">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                            {pemeriksaanData.spesifikasi_perangkat}
                        </pre>
                    </div>
                </InfoSection>
            )}

            <InfoSection title="Catatan Pemeriksaan">
                <div className="col-span-full bg-gray-50 p-3 rounded-md border">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                        {pemeriksaanData.catatan || "Tidak ada catatan."}
                    </pre>
                </div>
            </InfoSection>

          </div>
        )
      )}
    </ModalContainer>
  );
};

export default DetailPemeriksaan;
