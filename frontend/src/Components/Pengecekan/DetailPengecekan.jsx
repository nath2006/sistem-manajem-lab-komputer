import React, { useState, useEffect } from "react";
import { get } from "../../utils/api"; // Pastikan path ini benar
import InfoItem from "../DetailModal/InfoItem"; // Pastikan path ini benar
import InfoSection from "../DetailModal/InfoSection"; // Pastikan path ini benar
import ModalContainer from "../DetailModal/ModalContainer"; // Pastikan path ini benar
import LoadingSpinner from "../DetailModal/LoadingSpinner"; // Pastikan path ini benar
import formatDate from '../../utils/formatDateView'; // Menggunakan formatDateView yang sama

const DetailPengecekan = ({ id, onClose }) => {
  const [pengecekanData, setPengecekanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ASSET_BASE_URL tidak diperlukan di sini karena pengecekan tidak memiliki file_path seperti pengumuman

  useEffect(() => {
    const fetchPengecekanData = async () => {
      try {
        // Endpoint disesuaikan dengan API Anda untuk detail pengecekan
        const response = await get(`/pengecekan/${id}`);
        setPengecekanData(response.data);
      } catch (err) {
        setError("Gagal mengambil data pengecekan");
        console.error("Gagal mengambil data pengecekan:", err.response?.data || err.message || err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      setLoading(true);
      setError(""); // Reset error sebelum fetch baru
      fetchPengecekanData();
    } else {
      setError("ID Pengecekan tidak valid.");
      setLoading(false);
      console.warn("DetailPengecekan: ID is undefined, skipping fetch.");
    }
  }, [id]);

  return (
    <ModalContainer
      title="Detail Data Pengecekan"
      subtitle="Informasi lengkap mengenai data pengecekan perangkat"
      onClose={onClose}
    >
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="text-center py-4 text-red-500">
          <p>{error}</p>
          {/* Menampilkan pesan error dari API jika ada */}
          {pengecekanData && pengecekanData.message && <p className="text-sm">{pengecekanData.message}</p>}
        </div>
      ) : (
        pengecekanData && (
          <div className="space-y-6">
            <InfoSection title="Informasi Pengecekan Perangkat">
              <InfoItem label="ID Pengecekan" value={pengecekanData.pengecekan_id || '-'} />
              <InfoItem label="Tanggal Pengecekan" value={formatDate(pengecekanData.tanggal_pengecekan) || '-'} />
              <InfoItem 
                label="Kerusakan Ditemukan" 
                value={
                  <div className="whitespace-pre-wrap break-words">
                    {pengecekanData.ditemukan_kerusakan || '-'}
                  </div>
                } 
              />
              <InfoItem
                label="Status Pengecekan"
                value={
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      pengecekanData.status_pengecekan === 'Baru' ? "bg-yellow-100 text-yellow-800" :
                      pengecekanData.status_pengecekan === 'Menunggu Perbaikan' ? "bg-orange-100 text-orange-800" :
                      pengecekanData.status_pengecekan === 'Sudah Ditangani' ? "bg-green-100 text-green-800" :
                      "bg-gray-100 text-gray-800" 
                    }`}
                  >
                    {pengecekanData.status_pengecekan || 'N/A'}
                  </span>
                }
              />
              {/* Menampilkan ID Pemeriksaan jika ada */}
              {pengecekanData.pemeriksaan_id && (
                <InfoItem label="ID Pemeriksaan Terkait" value={pengecekanData.pemeriksaan_id} />
              )}
            </InfoSection>

            <InfoSection title="Detail Perangkat & Lokasi">
              <InfoItem label="Nama Perangkat" value={pengecekanData.nama_perangkat || '-'} />
              <InfoItem label="ID Perangkat" value={pengecekanData.perangkat_id || '-'} />
              <InfoItem label="Lokasi Lab" value={pengecekanData.nama_lab || '-'} />
            </InfoSection>
            
            <InfoSection title="Informasi Pelapor/Pengecek">
              <InfoItem label="Nama User (Pengecek)" value={pengecekanData.nama_user || '-'} />
              <InfoItem label="ID User (Pengecek)" value={pengecekanData.user_id || '-'} />
            </InfoSection>
          </div>
        )
      )}
      {!loading && !error && !pengecekanData && (
         <div className="text-center py-4 text-gray-500">
            <p>Data pengecekan tidak ditemukan atau tidak dapat dimuat.</p>
         </div>
      )}
    </ModalContainer>
  );
};

export default DetailPengecekan;
