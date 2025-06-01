// src/Components/Pengajuan/RejectPengajuanModal.jsx
import React, { useState, useEffect } from 'react';
import ModalContainer from '../DetailModal/ModalContainer'; // Sesuaikan path ke ModalContainer Anda

const RejectPengajuanModal = ({ onClose, onSubmit, requestData, isSubmitting }) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');

  // Reset alasan ketika requestData berubah (modal dibuka untuk request yang berbeda)
  useEffect(() => {
    if (requestData) {
      setRejectionReason(''); // Selalu reset alasan saat request baru masuk
      setError('');
    }
  }, [requestData]);

  const handleSubmitInternal = (e) => {
    if (e) e.preventDefault(); // Mencegah submit form default jika dipanggil dari event form
    if (!rejectionReason.trim()) {
      setError("Alasan penolakan tidak boleh kosong.");
      return;
    }
    setError('');
    // onSubmit adalah fungsi yang di-pass dari JadwalLab.js untuk menangani pemanggilan API
    if (requestData && requestData.pengajuan_id) {
      onSubmit(requestData.pengajuan_id, rejectionReason);
    } else {
      setError("Data pengajuan tidak valid.");
    }
  };

  // Tombol utama (Kirim Penolakan), gayanya mengikuti referensi EditPengecekan.jsx
  const primaryButton = (
    <button
      type="button" // type="button" agar tidak men-trigger submit form jika ada di dalam <form> tag dan tidak diklik langsung
      onClick={handleSubmitInternal}
      disabled={isSubmitting}
      className={`w-full px-5 py-2 text-sm font-semibold text-center rounded-md active:scale-95 focus:outline-none ${
        isSubmitting 
        ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
        : 'bg-red-600 hover:bg-red-700 text-white'
      }`}
    >
      {isSubmitting ? "Mengirim..." : "Kirim Penolakan"}
    </button>
  );

  // Tombol sekunder (Batal), gayanya mengikuti referensi EditPengecekan.jsx
  const secondaryButton = (
    <button
      type="button"
      onClick={onClose}
      disabled={isSubmitting}
      className="w-full px-5 py-2 text-sm font-semibold text-center bg-white border-2 rounded-md text-gray-700 border-gray-300 hover:bg-gray-50 active:scale-95 focus:outline-none"
    >
      Batal
    </button>
  );

  // Jangan render apapun jika tidak ada requestData (atau handle di ModalContainer jika ia mengontrol 'show')
  if (!requestData) {
    return null;
  }

  return (
    <ModalContainer
      title={`Tolak Pengajuan Lab oleh ${requestData?.guru_nama || 'Pengguna'}`}
      subtitle="Masukkan alasan penolakan untuk pengajuan jadwal penggunaan laboratorium ini."
      onClose={onClose}
      primaryButton={primaryButton}
      secondaryButton={secondaryButton}
    >
      {/* Form di dalam ModalContainer */}
      <form onSubmit={handleSubmitInternal} className="space-y-4 text-gray-700">
        {error && (
          <div className="mb-3 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Detail Pengajuan */}
        <div className="p-3 bg-gray-50 rounded-md border border-gray-200 text-sm space-y-1">
          <p><strong>Nama Lab:</strong> {requestData.nama_lab || '-'}</p>
          <p>
            <strong>Tanggal & Jam Pakai:</strong>{' '}
            {requestData.tanggal_pakai
              ? new Date(requestData.tanggal_pakai).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : '-'}{' '}
            ({requestData.jam_mulai || '-'} - {requestData.jam_selesai || '-'})
          </p>
          <p><strong>Mata Pelajaran:</strong> {requestData.mata_pelajaran || '-'}</p>
          <p><strong>Kegiatan:</strong> {requestData.kegiatan || '-'}</p>
        </div>

        {/* Input Alasan Penolakan */}
        <div>
          <label htmlFor="rejectionReasonModal" className="block mb-1.5 font-medium text-sm">
            Alasan Penolakan <span className="text-red-500">*</span>
          </label>
          <textarea
            id="rejectionReasonModal" // ID unik untuk textarea di dalam modal
            value={rejectionReason}
            onChange={(e) => {
              setRejectionReason(e.target.value);
              if (error && e.target.value.trim()) setError(''); // Hapus error jika pengguna mulai mengetik
            }}
            rows="4"
            className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-maroon-500 focus:border-maroon-500 block w-full p-2.5"
            placeholder="Jelaskan alasan penolakan pengajuan..."
            required
          />
        </div>
        {/* Tombol submit sudah dihandle oleh primaryButton yang di-pass ke ModalContainer */}
      </form>
    </ModalContainer>
  );
};

export default RejectPengajuanModal;
