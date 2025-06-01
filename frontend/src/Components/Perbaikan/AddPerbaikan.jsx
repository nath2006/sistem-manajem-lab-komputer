// AddPerbaikan.jsx
// (Biasanya ditempatkan di folder seperti src/Components/Perbaikan/AddPerbaikan.jsx)

import React, { useState, useEffect } from 'react';
import { post } from '../../utils/api'; // Sesuaikan path jika perlu
import ModalContainer from '../../Components/DetailModal/ModalContainer'; // Asumsi Anda punya komponen ModalContainer generik
// Jika ModalContainer Anda ada di DetailModal, gunakan path itu:
// import ModalContainer from '../DetailModal/ModalContainer'; 

const AddPerbaikan = ({ pengecekanData, loggedInUserId, onClose, onSuccess }) => {
  // pengecekanData berisi detail dari item pengecekan yang dipilih, termasuk:
  // - pengecekan_id
  // - nama_perangkat
  // - ditemukan_kerusakan
  // - nama_lab
  // loggedInUserId adalah ID user yang login (Teknisi/Admin yang melakukan perbaikan)

  const [formData, setFormData] = useState({
    tanggal_perbaikan: new Date().toISOString().split('T')[0], // Default ke hari ini
    tindakan: '',
    hasil_perbaikan: 'Berhasil', // Default value, pastikan cocok dengan ENUM ('Berhasil')
    catatan_tambahan: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(''); // Reset error

    if (!pengecekanData || !pengecekanData.pengecekan_id) {
      setError("Data pengecekan tidak valid atau tidak ditemukan.");
      return;
    }
    if (!loggedInUserId) {
      setError("ID User pelaksana perbaikan tidak ditemukan. Pastikan Anda sudah login.");
      return;
    }
    if (!formData.tanggal_perbaikan || !formData.tindakan.trim() || !formData.hasil_perbaikan) {
      setError("Tanggal perbaikan, tindakan, dan hasil perbaikan wajib diisi.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      pengecekan_id: pengecekanData.pengecekan_id,
      user_id: loggedInUserId, // User yang melakukan/mencatat perbaikan
      tanggal_perbaikan: formData.tanggal_perbaikan,
      tindakan: formData.tindakan,
      hasil_perbaikan: formData.hasil_perbaikan, // Pastikan ini 'Berhasil', 'Gagal', atau 'Perlu Penggantian Komponen'
      catatan_tambahan: formData.catatan_tambahan,
    };

    try {
      const response = await post('/perbaikan/create', payload); // Endpoint API Anda
      onSuccess(response); // Kirim seluruh respons ke parent component
      onClose(); // Tutup modal setelah sukses
    } catch (err) {
      console.error("Error creating perbaikan:", err.response?.data || err.message || err);
      setError(err.response?.data?.message || "Gagal menambahkan data perbaikan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Opsi untuk ENUM hasil_perbaikan
  const hasilPerbaikanOptions = [
    { value: 'Berhasil', label: 'Berhasil' },
    { value: 'Gagal', label: 'Gagal' },
    { value: 'Perlu Penggantian Komponen', label: 'Perlu Penggantian Komponen' },
  ];

  // Tombol untuk ModalContainer
  const primaryButton = (
    <button
      type="button" // Type button agar tidak submit form secara otomatis jika form di luar ModalContainer
      onClick={handleSubmit}
      disabled={isSubmitting}
      className="w-full px-5 py-2 text-sm font-semibold text-center rounded-md bg-red-600 hover:bg-red-700 text-white active:scale-95 focus:outline-none"
    >
      {isSubmitting ? 'Menyimpan...' : 'Simpan Data Perbaikan'}
    </button>
  );

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

  return (
    <ModalContainer
      title="Buat Data Perbaikan Baru"
      subtitle={`Untuk Pengecekan ID: ${pengecekanData?.pengecekan_id || 'Tidak Diketahui'}`}
      onClose={onClose}
      primaryButton={primaryButton}
      secondaryButton={secondaryButton}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-gray-700">
        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Informasi dari Pengecekan (Read-only) */}
        {pengecekanData && (
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200 space-y-1">
            <p className="text-sm">
              <span className="font-medium">Perangkat:</span> {pengecekanData.nama_perangkat || '-'} (ID: {pengecekanData.perangkat_id || '-'})
            </p>
            <p className="text-sm">
              <span className="font-medium">Lokasi:</span> {pengecekanData.nama_lab || '-'}
            </p>
            <p className="text-sm">
              <span className="font-medium">Kerusakan Awal:</span>
              <span className="block whitespace-pre-wrap break-words text-xs mt-1 p-2 bg-gray-100 rounded">
                {pengecekanData.ditemukan_kerusakan || '-'}
              </span>
            </p>
          </div>
        )}

        <div>
          <label htmlFor="tanggal_perbaikan" className="block mb-1.5 font-medium text-sm">Tanggal Perbaikan <span className="text-red-500">*</span></label>
          <input
            type="date"
            id="tanggal_perbaikan"
            name="tanggal_perbaikan"
            value={formData.tanggal_perbaikan}
            onChange={handleChange}
            className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            required
          />
        </div>

        <div>
          <label htmlFor="tindakan" className="block mb-1.5 font-medium text-sm">Tindakan yang Dilakukan <span className="text-red-500">*</span></label>
          <textarea
            id="tindakan"
            name="tindakan"
            rows="3"
            value={formData.tindakan}
            onChange={handleChange}
            className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            placeholder="Jelaskan tindakan perbaikan yang telah dilakukan"
            required
          ></textarea>
        </div>

        <div>
          <label htmlFor="hasil_perbaikan" className="block mb-1.5 font-medium text-sm">Hasil Perbaikan <span className="text-red-500">*</span></label>
          <select
            id="hasil_perbaikan"
            name="hasil_perbaikan"
            value={formData.hasil_perbaikan}
            onChange={handleChange}
            className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            required
          >
            {hasilPerbaikanOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="catatan_tambahan" className="block mb-1.5 font-medium text-sm">Catatan Tambahan (Opsional)</label>
          <textarea
            id="catatan_tambahan"
            name="catatan_tambahan"
            rows="2"
            value={formData.catatan_tambahan}
            onChange={handleChange}
            className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            placeholder="Informasi tambahan mengenai perbaikan"
          ></textarea>
        </div>
        {/* Tombol submit sudah dihandle oleh ModalContainer jika primaryButton di-pass */}
      </form>
    </ModalContainer>
  );
};

export default AddPerbaikan;
