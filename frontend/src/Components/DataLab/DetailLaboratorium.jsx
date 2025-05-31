import React, { useState, useEffect } from "react";
import { get } from "../../utils/api";
import InfoItem from "../DetailModal/InfoItem"; 
import InfoSection from "../DetailModal/InfoSection"; 
import ModalContainer from "../DetailModal/ModalContainer"; 
import LoadingSpinner from "../DetailModal/LoadingSpinner"; 

import formatDate from '../../utils/formatDateView'; 

const DetailPenguman = ({ id, onClose }) => {
  const [pengumumanData, setPengumumanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

 
  const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL || 'http://localhost:5500/Uploads/Pengumuman/';

  useEffect(() => {
    const fetchPengumumanData = async () => {
      try {
        const response = await get(`/pengumuman/${id}`);
        setPengumumanData(response.data);
      } catch (err) {
        setError("Gagal mengambil data pengumuman");
        console.error("Gagal mengambil data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) { 
      setLoading(true);
      fetchPengumumanData();
    } else {
      setError("ID Pengumuman tidak valid.");
      setLoading(false);
      console.warn("DetailPenguman: ID is undefined, skipping fetch.");
    }
  }, [id]);

  return (
    <ModalContainer
      title="Detail Pengumuman"
      subtitle="Informasi lengkap data pengumuman"
      onClose={onClose}
    >
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="text-center py-4 text-red-500">
          <p>{error}</p>
        </div>
      ) : (
        pengumumanData && ( 
          <div className="space-y-6"> 
            <InfoSection title="Informasi Pengumuman">
              <InfoItem label="Judul" value={pengumumanData.judul || '-'} />
              <InfoItem label="Konten" value={
                <div className="whitespace-pre-wrap break-words"> 
                  {pengumumanData.content || '-'}
                </div>
              } />
              <InfoItem 
                label="File Pendukung" 
                value={
                  pengumumanData.file_path ? (
                    <a
                      href={`${ASSET_BASE_URL}${pengumumanData.file_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {pengumumanData.file_path.split('/').pop() || 'Lihat File'} 
                    </a>
                  ) : (
                    'Tidak ada file'
                  )
                }
              />
              <InfoItem
                label="Status"
                value={
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      pengumumanData.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800" 
                    }`}
                  >
                    {pengumumanData.is_active ? "Aktif" : "Tidak Aktif"} 
                  </span>
                }
              />
            </InfoSection>

            <InfoSection title="Detail Pembuatan"> {/* Judul section diganti */}
              <InfoItem
                label="Dibuat Oleh"
                value={pengumumanData.created_by?.nama_lengkap || 'Tidak Diketahui'}
              />
              <InfoItem
                label="Tanggal Dibuat"
                // Menggunakan fungsi formatDate yang sama dengan di list view
                value={formatDate(pengumumanData.created_at) || '-'} 
              />
            </InfoSection>

            {/* Section "Informasi Tambahan" (additional_info) dihilangkan karena tidak ada di skema pengumuman */}
          </div>
        )
      )}
    </ModalContainer>
  );
};

export default DetailPenguman;
