// EditPerbaikan.jsx
// (Biasanya ditempatkan di folder seperti src/Components/Perbaikan/EditPerbaikan.jsx)

import React, { useState, useEffect, useContext } from 'react';
import { get, put } from '../../utils/api'; // Pastikan 'put' untuk JSON ada
import ModalContainer from '../../Components/DetailModal/ModalContainer'; // Sesuaikan path
import LoadingSpinner from '../../Components/DetailModal/LoadingSpinner';   // Sesuaikan path
import { AuthContext } from '../../Context/AuthContext';       // Untuk mendapatkan role user

const EditPerbaikan = ({ id, onClose, onUpdate }) => {
  const { state: authState } = useContext(AuthContext);
  const currentUserRole = authState?.role;

  const [formData, setFormData] = useState({
    user_id: '', // Teknisi yang melakukan perbaikan (bisa diedit Admin)
    tanggal_perbaikan: '',
    tindakan: '',
    hasil_perbaikan: 'Berhasil',
    catatan_tambahan: '',
    tanggal_selesai_perbaikan: '', // Baru, bisa null
  });

  const [displayData, setDisplayData] = useState({
    nama_perangkat: '',
    nama_lab: '',
    pengecekan_id_original: '', // ID pengecekan awal (akan null)
    nama_user_teknisi_awal: '', // Nama teknisi awal
  });

  const [usersList, setUsersList] = useState([]); // Untuk dropdown teknisi (jika Admin)
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPerbaikanDetails = async () => {
      if (!id) {
        setError("ID Perbaikan tidak valid.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const response = await get(`/perbaikan/${id}`); // Endpoint detail perbaikan
        if (response.data) {
          const {
            user_id,
            tanggal_perbaikan,
            tindakan,
            hasil_perbaikan,
            catatan_tambahan,
            tanggal_selesai_perbaikan,
            nama_perangkat, // Diharapkan dari JOIN di backend
            nama_lab,       // Diharapkan dari JOIN di backend
            pengecekan_id,  // Ini akan NULL jika pengecekan sudah dihapus
            nama_user       // Nama teknisi awal
          } = response.data;

          setFormData({
            user_id: user_id || '',
            tanggal_perbaikan: tanggal_perbaikan ? new Date(tanggal_perbaikan).toISOString().split('T')[0] : '',
            tindakan: tindakan || '',
            hasil_perbaikan: hasil_perbaikan || 'Berhasil',
            catatan_tambahan: catatan_tambahan || '',
            tanggal_selesai_perbaikan: tanggal_selesai_perbaikan ? new Date(tanggal_selesai_perbaikan).toISOString().split('T')[0] : '',
          });
          setDisplayData({
            nama_perangkat: nama_perangkat || 'N/A',
            nama_lab: nama_lab || 'N/A',
            pengecekan_id_original: pengecekan_id, // Akan null
            nama_user_teknisi_awal: nama_user || 'N/A',
          });

          // Jika yang login Admin, ambil daftar user untuk pilihan teknisi
          if (currentUserRole === 'Admin') {
            const usersResponse = await get('/users?roles=Teknisi,Admin'); // Ambil user dengan role Teknisi atau Admin
            if (usersResponse.data && Array.isArray(usersResponse.data)) {
              setUsersList(usersResponse.data);
            } else {
              console.warn("Tidak bisa memuat daftar user untuk pilihan teknisi.");
            }
          }
        } else {
          setError("Data perbaikan tidak ditemukan.");
        }
      } catch (err) {
        console.error("Error fetching perbaikan details for edit:", err.response?.data || err.message || err);
        setError("Gagal mengambil detail data perbaikan. " + (err.response?.data?.message || ""));
      } finally {
        setLoading(false);
      }
    };
    fetchPerbaikanDetails();
  }, [id, currentUserRole]);

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
    
    if (!formData.user_id) {
      setError("Teknisi Pelaksana wajib dipilih/diisi.");
      return;
    }
    if (!formData.tanggal_perbaikan || !formData.tindakan.trim() || !formData.hasil_perbaikan) {
      setError("Tanggal perbaikan, tindakan, dan hasil perbaikan wajib diisi.");
      return;
    }

    setSaving(true);
    const payload = {
      user_id: formData.user_id,
      tanggal_perbaikan: formData.tanggal_perbaikan,
      tindakan: formData.tindakan,
      hasil_perbaikan: formData.hasil_perbaikan,
      catatan_tambahan: formData.catatan_tambahan,
      // Kirim null jika tanggal selesai tidak diisi atau kosong
      tanggal_selesai_perbaikan: formData.tanggal_selesai_perbaikan || null,
    };

    try {
      await put(`/perbaikan/update/${id}`, payload); // Endpoint update
      onUpdate(); // Panggil callback untuk refresh list
      onClose();  // Tutup modal
    } catch (err) {
      console.error("Error updating perbaikan:", err.response?.data || err.message || err);
      setError(err.response?.data?.message || "Gagal mengupdate data perbaikan.");
    } finally {
      setSaving(false);
    }
  };

  const hasilPerbaikanOptions = [
    { value: 'Berhasil', label: 'Berhasil' },
    { value: 'Gagal', label: 'Gagal' },
    { value: 'Perlu Penggantian Komponen', label: 'Perlu Penggantian Komponen' },
  ];

  const primaryButton = (
    <button
      type="button"
      onClick={handleSubmit}
      disabled={saving || loading}
      className="w-full px-5 py-2 text-sm font-semibold text-center rounded-md bg-red-600 hover:bg-red-700 text-white active:scale-95 focus:outline-none"
    >
      {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
    </button>
  );

  const secondaryButton = (
    <button
      type="button"
      onClick={onClose}
      disabled={saving || loading}
      className="w-full px-5 py-2 text-sm font-semibold text-center bg-white border-2 rounded-md text-gray-700 border-gray-300 hover:bg-gray-50 active:scale-95 focus:outline-none"
    >
      Batal
    </button>
  );

  if (loading) {
    return (
      <ModalContainer title="Edit Data Perbaikan" onClose={onClose}>
        <LoadingSpinner />
      </ModalContainer>
    );
  }

  return (
    <ModalContainer
      title="Edit Data Perbaikan"
      subtitle={`ID Perbaikan: ${id}`}
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

        <div className="p-3 bg-gray-50 rounded-md border border-gray-200 space-y-1">
          <p className="text-sm"><span className="font-medium">Perangkat:</span> {displayData.nama_perangkat}</p>
          <p className="text-sm"><span className="font-medium">Lokasi Lab:</span> {displayData.nama_lab}</p>
          <p className="text-sm"><span className="font-medium">Teknisi Awal:</span> {displayData.nama_user_teknisi_awal}</p>
          {displayData.pengecekan_id_original && <p className="text-sm"><span className="font-medium">ID Pengecekan Asal:</span> {displayData.pengecekan_id_original}</p> }
        </div>
        
        {/* Teknisi Pelaksana - hanya bisa diedit Admin */}
        <div>
          <label htmlFor="user_id" className="block mb-1.5 font-medium text-sm">Teknisi Pelaksana <span className="text-red-500">*</span></label>
          {currentUserRole === 'Admin' ? (
            <select
              id="user_id"
              name="user_id"
              value={formData.user_id}
              onChange={handleChange}
              className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              required
              disabled={usersList.length === 0}
            >
              <option value="">Pilih Teknisi</option>
              {usersList.map(user => (
                <option key={user.user_id} value={user.user_id}>
                  {user.nama_lengkap} ({user.role})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={`${displayData.nama_user_teknisi_awal} (ID: ${formData.user_id})`}
              className="shadow-sm bg-gray-100 border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              disabled
            />
          )}
           {currentUserRole === 'Admin' && usersList.length === 0 && !loading && <p className="text-xs text-red-500 mt-1">Data user (Teknisi/Admin) tidak tersedia untuk dipilih.</p>}
        </div>


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
            placeholder="Jelaskan tindakan perbaikan"
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
            placeholder="Informasi tambahan"
          ></textarea>
        </div>

        <div>
          <label htmlFor="tanggal_selesai_perbaikan" className="block mb-1.5 font-medium text-sm">Tanggal Selesai Perbaikan (Opsional)</label>
          <input
            type="date"
            id="tanggal_selesai_perbaikan"
            name="tanggal_selesai_perbaikan"
            value={formData.tanggal_selesai_perbaikan}
            onChange={handleChange}
            className="shadow-sm bg-white border border-gray-300 outline-none text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          />
        </div>
      </form>
    </ModalContainer>
  );
};

export default EditPerbaikan;
