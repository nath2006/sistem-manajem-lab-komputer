// src/Components/Pemeriksaan/AddPemeriksaan.jsx
import React, { useState, useEffect, useContext } from 'react';
import { post } from '../../utils/api'; // Sesuaikan path utils/api.js Anda
import ModalContainer from '../../Components/DetailModal/ModalContainer'; // Sesuaikan path ke ModalContainer Anda
import { AuthContext } from '../../Context/AuthContext'; // Sesuaikan path ke AuthContext Anda

const AddPemeriksaan = ({ perangkatData, onClose, onSuccess }) => {
  const { state: authState } = useContext(AuthContext);
  const loggedInUserId = authState?.userId;

  const [formData, setFormData] = useState({
    tanggal_pemeriksaan: new Date().toISOString().split('T')[0], // Default ke hari ini
    hasil_pemeriksaan: 'Baik', // Default value, sesuaikan jika ada ENUM di backend
    catatan: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log("AddPemeriksaan mounted/updated. perangkatData:", perangkatData, "loggedInUserId:", loggedInUserId);

    let currentErrorMessage = "";

    if (!loggedInUserId) {
      currentErrorMessage = "Informasi pengguna tidak ditemukan. Pastikan Anda telah login.";
    }
    
    if (!perangkatData || !perangkatData.perangkat_id) {
      currentErrorMessage = "Data perangkat tidak valid untuk pemeriksaan.";
      if (perangkatData) {
        console.error("AddPemeriksaan - perangkatData.perangkat_id:", perangkatData.perangkat_id);
      } else {
        console.error("AddPemeriksaan - perangkatData adalah null atau undefined.");
      }
    }
    setError(currentErrorMessage);
  }, [perangkatData, loggedInUserId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(''); 

    if (!perangkatData || !perangkatData.perangkat_id) {
      setError("Data perangkat untuk pemeriksaan tidak ditemukan.");
      return;
    }
    if (!loggedInUserId) {
      setError("ID User pelaksana pemeriksaan tidak ditemukan.");
      return;
    }
    if (!formData.tanggal_pemeriksaan || !formData.hasil_pemeriksaan) {
      setError("Tanggal pemeriksaan dan hasil pemeriksaan wajib diisi.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      user_id: loggedInUserId,
      perangkat_id: perangkatData.perangkat_id,
      tanggal_pemeriksaan: formData.tanggal_pemeriksaan,
      hasil_pemeriksaan: formData.hasil_pemeriksaan,
      catatan: formData.catatan,
    };

    try {
      const response = await post('/pemeriksaan/create', payload);
      onSuccess(response, perangkatData.perangkat_id, formData.hasil_pemeriksaan);
      onClose(); 
    } catch (err) {
      console.error("Error creating pemeriksaan:", err.response?.data || err.message || err);
      setError(err.response?.data?.message || "Gagal menambahkan data pemeriksaan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasilPemeriksaanOptions = [
    { value: 'Baik', label: 'Kondisi Baik' },
    { value: 'Bermasalah', label: 'Ditemukan Masalah/Kerusakan' },
    // Tambahkan opsi lain jika backend Anda mendukungnya
  ];

  const formIsDisabled = !!error || isSubmitting || !perangkatData || !perangkatData.perangkat_id || !loggedInUserId;

  const primaryButton = (
    <button
      type="submit"
      form="addPemeriksaanForm"
      disabled={formIsDisabled}
      className="w-full px-5 py-2 text-sm font-semibold text-center rounded-md bg-blue-600 hover:bg-blue-700 text-white active:scale-95 focus:outline-none disabled:opacity-50"
    >
      {isSubmitting ? 'Menyimpan...' : 'Simpan Data Pemeriksaan'}
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
      title="Buat Data Pemeriksaan Perangkat"
      subtitle={perangkatData && perangkatData.nama_perangkat ? `Untuk Perangkat: ${perangkatData.nama_perangkat} (${perangkatData.nomor_inventaris || 'N/A'})` : "Memuat info perangkat..."}
      onClose={onClose}
      primaryButton={primaryButton}
      secondaryButton={secondaryButton}
    >
      <form id="addPemeriksaanForm" onSubmit={handleSubmit} className="space-y-4 text-gray-700">
        {error && (
          <div className="p-3 mb-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {perangkatData && perangkatData.perangkat_id && (
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200 space-y-1">
            <p className="text-sm"><span className="font-medium">ID Perangkat:</span> {perangkatData.perangkat_id}</p>
            <p className="text-sm"><span className="font-medium">Nama Perangkat:</span> {perangkatData.nama_perangkat}</p>
            <p className="text-sm"><span className="font-medium">No. Inventaris:</span> {perangkatData.nomor_inventaris}</p>
            <p className="text-sm"><span className="font-medium">Lokasi:</span> {perangkatData.nama_lab || '-'} (ID Lab: {perangkatData.lab_id || '-'})</p>
          </div>
        )}

        <div>
          <label htmlFor="tanggal_pemeriksaan" className="block mb-1.5 font-medium text-sm">Tanggal Pemeriksaan <span className="text-red-500">*</span></label>
          <input
            type="date"
            id="tanggal_pemeriksaan"
            name="tanggal_pemeriksaan"
            value={formData.tanggal_pemeriksaan}
            onChange={handleChange}
            className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            required
            disabled={formIsDisabled}
          />
        </div>

        <div>
          <label htmlFor="hasil_pemeriksaan" className="block mb-1.5 font-medium text-sm">Hasil Pemeriksaan <span className="text-red-500">*</span></label>
          <select
            id="hasil_pemeriksaan"
            name="hasil_pemeriksaan"
            value={formData.hasil_pemeriksaan}
            onChange={handleChange}
            className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            required
            disabled={formIsDisabled}
          >
            {hasilPemeriksaanOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="catatan" className="block mb-1.5 font-medium text-sm">Catatan Pemeriksaan (Opsional)</label>
          <textarea
            id="catatan"
            name="catatan"
            rows="3"
            value={formData.catatan}
            onChange={handleChange}
            className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            placeholder="Catatan tambahan mengenai kondisi perangkat atau temuan lain"
            disabled={formIsDisabled}
          ></textarea>
        </div>
      </form>
    </ModalContainer>
  );
};

export default AddPemeriksaan;
