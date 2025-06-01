import db from "../config/db.js"; // Sesuaikan path ke konfigurasi database Anda

export const getTeknisiDashboardStats = async (req, res) => {
  try {
    // 1. Jumlah total data pengecekan yang masih aktif (status 'Baru' atau 'Menunggu Perbaikan')
    const [pengecekanAktifRows] = await db.query(
      "SELECT COUNT(pengecekan_id) AS total_pengecekan_aktif FROM pengecekan WHERE status_pengecekan IN (?, ?)",
      ['Baru', 'Menunggu Perbaikan']
    );
    const totalPengecekanAktif = pengecekanAktifRows[0].total_pengecekan_aktif || 0;

    // 2. Jumlah total riwayat perbaikan (semua data di tabel perbaikan)
    const [perbaikanRows] = await db.query(
      "SELECT COUNT(perbaikan_id) AS total_riwayat_perbaikan FROM perbaikan"
    );
    const totalRiwayatPerbaikan = perbaikanRows[0].total_riwayat_perbaikan || 0;

    // (Opsional) Anda bisa menambahkan data lain yang relevan untuk dashboard Teknisi di sini
    // Misalnya, 5 pengecekan terbaru yang perlu ditindaklanjuti, dll.

    res.status(200).json({
      message: "Data statistik dashboard Teknisi berhasil diambil",
      data: {
        totalPengecekanAktif,
        totalRiwayatPerbaikan,
      },
    });
  } catch (error) {
    console.error("Error in getTeknisiDashboardStats function:", error);
    res.status(500).json({
      message: "Gagal mengambil data statistik dashboard Teknisi",
      error: error.message,
    });
  }
};
