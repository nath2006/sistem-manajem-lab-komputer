// DetailLaboratorium.js
import React, { useState, useEffect } from "react";
import { get } from "../../utils/api"; // Pastikan path ini benar
import InfoItem from "../DetailModal/InfoItem"; 
import InfoSection from "../DetailModal/InfoSection"; 
import ModalContainer from "../DetailModal/ModalContainer"; 
import LoadingSpinner from "../DetailModal/LoadingSpinner"; 
// formatDate mungkin tidak terlalu relevan untuk semua field lab, kecuali Anda punya created_at/updated_at
// import formatDate from '../../utils/formatDateView'; 

const DetailLaboratorium = ({ id, onClose }) => {
  const [labData, setLabData] = useState(null); // Menggunakan nama state yang lebih spesifik
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Sesuaikan ASSET_BASE_URL dan path subfolder untuk foto lab
  const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL || 'http://localhost:5500'; // Port server Anda
  const LAB_IMAGE_SUBFOLDER = '/uploads/labs/'; // Path ke folder foto lab di server

  useEffect(() => {
    const fetchLabData = async () => {
      try {
        const response = await get(`/lab/${id}`); // Endpoint untuk detail lab
        console.log("Detail Lab API Response:", response); // Untuk debugging
        if (response && response.data) {
          setLabData(response.data);
        } else {
          setError("Data laboratorium tidak ditemukan atau format respons tidak sesuai.");
          setLabData(null); // Pastikan labData null jika error
        }
      } catch (err) {
        setError("Gagal mengambil data laboratorium");
        console.error("Gagal mengambil data laboratorium:", err.response?.data || err.message || err);
        setLabData(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) { 
      setLoading(true);
      fetchLabData();
    } else {
      setError("ID Laboratorium tidak valid.");
      setLoading(false);
      console.warn("DetailLaboratorium: ID is undefined or invalid, skipping fetch.");
    }
  }, [id]);

  return (
    <ModalContainer
      title="Detail Laboratorium"
      subtitle="Informasi lengkap data laboratorium"
      onClose={onClose}
    >
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="text-center py-4 text-red-500">
          <p>{error}</p>
        </div>
      ) : (
        labData && ( 
          <div className="space-y-6"> 
            <InfoSection title="Informasi Umum Laboratorium">
              <InfoItem label="Nama Lab" value={labData.nama_lab || '-'} />
              <InfoItem label="Lokasi" value={labData.lokasi || '-'} />
              <InfoItem label="Kapasitas" value={labData.kapasitas?.toString() || '0'} /> {/* toString jika kapasitas adalah angka */}
              <InfoItem 
                label="Status Lab" 
                value={
                  <span
                    className={`px-2.5 py-1.5 rounded-full text-xs font-semibold ${
                      labData.status === 'Tersedia' ? 'bg-green-100 text-green-800' :
                      labData.status === 'Pemeliharaan' ? 'bg-yellow-100 text-yellow-800' :
                      labData.status === 'Tidak Tersedia' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800' // Default
                    }`}
                  >
                    {labData.status || 'Tidak Diketahui'}
                  </span>
                }
              />
            </InfoSection>

            <InfoSection title="Detail Operasional">
              <InfoItem label="Jam Buka" value={labData.jam_buka ? labData.jam_buka.substring(0,5) : '-'} /> {/* Ambil HH:MM */}
              <InfoItem label="Jam Tutup" value={labData.jam_tutup ? labData.jam_tutup.substring(0,5) : '-'} />
              <InfoItem 
                label="Kepala Lab" 
                value={labData.kepala_lab?.nama_lengkap || 'Belum Ditentukan'} 
              />
            </InfoSection>
            
            {labData.deskripsi && (
              <InfoSection title="Deskripsi">
                <div className="text-sm text-gray-700 whitespace-pre-wrap break-words p-1">
                  {labData.deskripsi}
                </div>
              </InfoSection>
            )}

            {labData.foto_lab && (
              <InfoSection title="Foto Laboratorium">
                <div className="flex justify-center">
                  <img
                    src={`${ASSET_BASE_URL}${LAB_IMAGE_SUBFOLDER}${labData.foto_lab}`}
                    alt={`Foto ${labData.nama_lab}`}
                    className="max-w-full h-auto max-h-64 object-contain rounded-md shadow-md" // Ukuran disesuaikan, object-contain
                    onError={(e) => { 
                      e.target.onerror = null; 
                      e.target.style.display = 'none'; // Sembunyikan jika error
                      // Anda bisa menampilkan placeholder di sini jika mau
                      const parent = e.target.parentNode;
                      if (parent) {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'text-center text-gray-500 p-4';
                        placeholder.innerText = 'Gagal memuat gambar.';
                        parent.appendChild(placeholder);
                      }
                    }}
                  />
                </div>
              </InfoSection>
            )}
            
            {/* Jika ada field timestamp seperti created_at atau updated_at di data lab Anda */}
            {/* {(labData.created_at || labData.updated_at) && (
              <InfoSection title="Informasi Lain">
                {labData.created_at && <InfoItem label="Tanggal Dibuat" value={formatDate(labData.created_at) || '-'} />}
                {labData.updated_at && <InfoItem label="Terakhir Diupdate" value={formatDate(labData.updated_at) || '-'} />}
              </InfoSection>
            )}
            */}
          </div>
        )
      )}
    </ModalContainer>
  );
};

// Ganti nama export agar sesuai
export default DetailLaboratorium;
