// src/Components/Perangkat/DetailPerangkat.jsx
import React, { useState, useEffect } from "react";
import { get } from "../../utils/api"; // Pastikan path ini benar
import InfoItem from "../DetailModal/InfoItem"; // Sesuaikan path jika perlu
import InfoSection from "../DetailModal/InfoSection"; // Sesuaikan path jika perlu
import ModalContainer from "../DetailModal/ModalContainer"; // Sesuaikan path jika perlu
import LoadingSpinner from "../DetailModal/LoadingSpinner"; // Sesuaikan path jika perlu

// Asumsi base URL untuk aset gambar, sesuaikan jika berbeda
const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL || 'http://localhost:5500';
const PERANGKAT_IMAGE_SUBFOLDER = '/uploads/perangkat/';

const DetailPerangkat = ({ id, onClose }) => {
  const [perangkatData, setPerangkatData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPerangkatData = async () => {
      if (!id) {
        setError("ID Perangkat tidak valid.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await get(`/perangkat/${id}`); // Menggunakan endpoint yang diberikan
        if (response.data) {
          setPerangkatData(response.data);
        } else {
          setError("Data perangkat tidak ditemukan.");
          console.warn("Data perangkat tidak ditemukan dalam respons:", response);
        }
      } catch (err) {
        setError("Gagal mengambil data perangkat.");
        console.error("Gagal mengambil data perangkat:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPerangkatData();
  }, [id]);

  const getStatusBadgeClass = (status) => {
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

  return (
    <ModalContainer
      title="Detail Perangkat"
      subtitle="Informasi lengkap data perangkat"
      onClose={onClose}
    >
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="text-center py-4 text-red-500">
          <p>{error}</p>
        </div>
      ) : (
        perangkatData && (
          <div className="space-y-6">
            {perangkatData.foto_perangkat && (
              <div className="flex justify-center mb-4">
                <img
                  src={`${ASSET_BASE_URL}${PERANGKAT_IMAGE_SUBFOLDER}${perangkatData.foto_perangkat}`}
                  alt={`Foto ${perangkatData.nama_perangkat}`}
                  className="max-w-xs w-full h-auto object-cover rounded-lg shadow-md"
                  onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/300x200?text=Gagal+Muat+Gambar';}}
                />
              </div>
            )}
            {!perangkatData.foto_perangkat && (
                <div className="flex justify-center mb-4">
                    <div className="w-full max-w-xs h-48 bg-gray-200 rounded-lg shadow-md flex items-center justify-center text-gray-500">
                        Tidak ada foto
                    </div>
                </div>
            )}

            <InfoSection title="Informasi Dasar Perangkat">
              <InfoItem label="ID Perangkat" value={perangkatData.perangkat_id} />
              <InfoItem label="Nama Perangkat" value={perangkatData.nama_perangkat} />
              <InfoItem label="Nomor Inventaris" value={perangkatData.nomor_inventaris} />
              <InfoItem label="Laboratorium" value={`${perangkatData.nama_lab} (ID: ${perangkatData.lab_id})`} />
              <InfoItem
                label="Status"
                value={
                  <span
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${getStatusBadgeClass(perangkatData.status)}`}
                  >
                    {perangkatData.status || "N/A"}
                  </span>
                }
              />
            </InfoSection>

            <InfoSection title="Spesifikasi">
              {/* Menampilkan spesifikasi sebagai preformatted text untuk menjaga baris baru */}
              <div className="col-span-full bg-gray-50 p-3 rounded-md border">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                    {perangkatData.spesifikasi || "Tidak ada spesifikasi."}
                </pre>
              </div>
            </InfoSection>

            {/*menambahkan section lain jika ada data tambahan, seperti tanggal dibuat/update dari API */}
            {/*
            {(perangkatData.created_at || perangkatData.updated_at) && (
              <InfoSection title="Informasi Lain">
                {perangkatData.created_at && <InfoItem label="Tanggal Dibuat" value={new Date(perangkatData.created_at).toLocaleString("id-ID")} />}
                {perangkatData.updated_at && <InfoItem label="Terakhir Diupdate" value={new Date(perangkatData.updated_at).toLocaleString("id-ID")} />}
              </InfoSection>
            )}
            */}
          </div>
        )
      )}
    </ModalContainer>
  );
};

export default DetailPerangkat;
