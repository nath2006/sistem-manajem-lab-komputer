import { alertTheme, deleteAlertTheme } from '../../utils/alertTheme';
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
      ...deleteAlertTheme,
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
            ...alertTheme
          });
          
          onSuccess(id);
        } catch (error) {
          console.error(`Error deleting ${itemName}:`, error);
          
          Swal.fire({
            title: 'Error!',
            text: `Gagal menghapus ${itemName}.`,
            icon: 'error',
            confirmButtonText: 'OK',
            ...alertTheme
          });
          
          onError(error);
        }
      }
    });
  };

  return showDeleteConfirmation;
};

export default DeleteConfirmation;
