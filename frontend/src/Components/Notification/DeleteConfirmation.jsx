import React from 'react';
import Swal from 'sweetalert2';

/**
 * Komponen untuk menampilkan modal konfirmasi penghapusan data
 * @param {Object} props - Props komponen
 * @param {Function} props.onDelete - Fungsi yang akan dipanggil saat penghapusan dikonfirmasi
 * @param {string} props.itemName - Nama item yang akan dihapus (misal: 'orang tua', 'siswa', dll)
 * @param {Function} props.onSuccess - Fungsi yang akan dipanggil setelah penghapusan berhasil
 * @param {Function} props.onError - Fungsi yang akan dipanggil jika terjadi error saat penghapusan
 * @returns {Function} Fungsi untuk menampilkan modal konfirmasi
 */
const DeleteConfirmation = ({ 
  onDelete, 
  itemName = 'data', 
  onSuccess = () => {}, 
  onError = () => {} 
}) => {
  
  const showDeleteConfirmation = (id) => {
    Swal.fire({
      title: 'Konfirmasi Hapus',
      text: `Apakah Anda yakin ingin menghapus ${itemName} ini?`,
      icon: 'warning',
      showCancelButton: true,
      showConfirmButton: true,
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal',
      customClass: {
        confirmButton: 'px-5 py-2 text-sm font-semibold text-center border-2 border-red-500 rounded-md bg-red-500 text-white active:scale-95 focus:outline-none',
        cancelButton: 'px-5 py-2 text-sm font-semibold text-center bg-white border-2 rounded-md text-red-500 border-red-500 active:scale-95 focus:outline-none',
        actions: 'flex justify-center gap-4 mt-2'
      },
      buttonsStyling: false,
      reverseButtons: true
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await onDelete(id);
          
          Swal.fire({
            title: 'Terhapus!',
            text: `${itemName} berhasil dihapus.`,
            icon: 'success',
            confirmButtonText: 'OK',
            customClass: {
              confirmButton: 'px-5 py-2 text-sm font-semibold text-center rounded-md bg-red-500 text-white active:scale-95 focus:outline-none',
              actions: 'flex justify-center mt-2'
            },
            buttonsStyling: false
          });
          
          onSuccess(id);
        } catch (error) {
          console.error(`Error deleting ${itemName}:`, error);
          
          Swal.fire({
            title: 'Error!',
            text: `Gagal menghapus ${itemName}.`,
            icon: 'error',
            confirmButtonText: 'OK',
            customClass: {
              confirmButton: 'px-5 py-2 text-sm font-semibold text-center rounded-md bg-red-500 text-white active:scale-95 focus:outline-none',
              actions: 'flex justify-center mt-2'
            },
            buttonsStyling: false
          });
          
          onError(error);
        }
      }
    });
  };

  return showDeleteConfirmation;
};

export default DeleteConfirmation;
