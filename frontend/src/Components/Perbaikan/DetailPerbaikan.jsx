import React, { useState, useEffect } from "react";
import { get } from "../../utils/api"; // Pastikan path ini benar
import InfoItem from "../DetailModal/InfoItem"; 
import InfoSection from "../DetailModal/InfoSection"; // Pastikan path ini benar
import ModalContainer from "../DetailModal/ModalContainer"; // Pastikan path ini benar
import LoadingSpinner from "../DetailModal/LoadingSpinner"; // Pastikan path ini benar
//import formatDate from '../../utils/formatDateView'; // Asumsi Anda punya utilitas ini atau sesuaikan

const DetailPerbaikan = ({ id, onClose }) => {
  const [perbaikanData, setPerbaikanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPerbaikanData = async () => {
      if (!id) {
        setError("ID Perbaikan tidak valid.");
        setLoading(false);
        console.warn("DetailPerbaikan: ID is undefined, skipping fetch.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const response = await get(`/perbaikan/${id}`); // Endpoint detail perbaikan
        if (response.data) {
          setPerbaikanData(response.data);
        } else {
          // Jika response.data kosong tapi tidak ada error dari API (misal status 200 tapi data null/kosong)
          setError("Data perbaikan tidak ditemukan atau format respons tidak sesuai.");
          console.warn("DetailPerbaikan: Data tidak ditemukan di respons API atau format salah", response);
        }
      } catch (err) {
        setError("Gagal mengambil detail data perbaikan.");
        console.error("Gagal mengambil detail data perbaikan:", err.response?.data || err.message || err);
      } finally {
        setLoading(false);
      }
    };

    fetchPerbaikanData();
  }, [id]);

  // Fungsi format tanggal, bisa disesuaikan atau pakai dari utilitas
  const formatTanggal = (dateString) => {
    if (!dateString) return '-';
    // Jika menggunakan formatDate dari utilitas:
    // return formatDate(dateString, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    // Jika manual:
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Kembalikan string asli jika tidak valid
    const options = { year: 'numeric', month: 'long', day: 'numeric' }; // Hanya tanggal untuk tanggal_perbaikan
    return date.toLocaleDateString('id-ID', options);
  };
  
  const formatTanggalSelesai = (dateString) => {
    if (!dateString) return 'Belum Selesai';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('id-ID', options);
  };


  return (
    <ModalContainer
      title="Detail Data Perbaikan"
      subtitle={`Informasi lengkap untuk Perbaikan ID: ${perbaikanData?.perbaikan_id || id}`}
      onClose={onClose}
    >
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="text-center py-4 text-red-500">
          <p>{error}</p>
        </div>
      ) : (
        perbaikanData && (
          <div className="space-y-6">
            <InfoSection title="Informasi Perbaikan">
              <InfoItem label="ID Perbaikan" value={perbaikanData.perbaikan_id || '-'} />
              <InfoItem label="Tanggal Perbaikan" value={formatTanggal(perbaikanData.tanggal_perbaikan) || '-'} />
              <InfoItem 
                label="Tindakan Dilakukan" 
                value={
                  <div className="whitespace-pre-wrap break-words">
                    {perbaikanData.tindakan || '-'}
                  </div>
                } 
              />
              <InfoItem
                label="Hasil Perbaikan"
                value={
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      perbaikanData.hasil_perbaikan === 'Berhasil' ? "bg-green-100 text-green-800" :
                      perbaikanData.hasil_perbaikan === 'Gagal' ? "bg-red-100 text-red-800" :
                      perbaikanData.hasil_perbaikan === 'Perlu Penggantian Komponen' ? "bg-yellow-100 text-yellow-800" :
                      "bg-gray-100 text-gray-800" 
                    }`}
                  >
                    {perbaikanData.hasil_perbaikan || 'N/A'}
                  </span>
                }
              />
              <InfoItem 
                label="Catatan Tambahan" 
                value={
                  <div className="whitespace-pre-wrap break-words">
                    {perbaikanData.catatan_tambahan || '-'}
                  </div>
                } 
              />
              <InfoItem label="Tanggal Selesai Perbaikan" value={formatTanggalSelesai(perbaikanData.tanggal_selesai_perbaikan)} />
            </InfoSection>

            <InfoSection title="Detail Perangkat & Lokasi">
              <InfoItem label="Nama Perangkat" value={perbaikanData.nama_perangkat || (perbaikanData.perangkat_id_snapshot ? `ID Perangkat: ${perbaikanData.perangkat_id_snapshot}`: 'N/A')} />
              <InfoItem label="Lokasi Lab" value={perbaikanData.nama_lab || '-'} />
              {/* Jika ingin menampilkan ID Perangkat Snapshot jika nama_perangkat null */}
              {/* {perbaikanData.perangkat_id_snapshot && !perbaikanData.nama_perangkat && (
                <InfoItem label="ID Perangkat (Snapshot)" value={perbaikanData.perangkat_id_snapshot} />
              )} */}
            </InfoSection>
            
            <InfoSection title="Informasi Teknis & Referensi">
              <InfoItem label="Nama Teknisi" value={perbaikanData.nama_user || '-'} />
              <InfoItem label="ID User (Teknisi)" value={perbaikanData.user_id || '-'} />
              <InfoItem 
                label="ID Pengecekan Asal" 
                value={perbaikanData.pengecekan_id || (perbaikanData.pengecekan_id === null ? 'Pengecekan sudah dihapus/diproses' : 'N/A')} 
              />
            </InfoSection>
          </div>
        )
      )}
      {!loading && !error && !perbaikanData && (
         <div className="text-center py-4 text-gray-500">
            <p>Data detail perbaikan tidak ditemukan atau tidak dapat dimuat.</p>
         </div>
      )}
    </ModalContainer>
  );
};

export default DetailPerbaikan;
