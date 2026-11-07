import db from "../config/db.js"; // Sesuaikan path ke konfigurasi database Anda

export const getTeknisiDashboardStats = async (req, res) => {
  try {
    const [
      [pengecekanAktifRows],
      [perbaikanRows],
      [antrian],
      [riwayat],
    ] = await Promise.all([
      db.query("SELECT COUNT(pengecekan_id) AS total_pengecekan_aktif FROM pengecekan WHERE status_pengecekan IN (?, ?)",
      ['Baru', 'Menunggu Perbaikan']),
      db.query("SELECT COUNT(perbaikan_id) AS total_riwayat_perbaikan FROM perbaikan"),
      db.query(`SELECT pc.*, pr.nama_perangkat, pr.nomor_inventaris,
      l.nama_lab, u.nama_lengkap AS nama_pelapor FROM pengecekan pc
      JOIN perangkat pr ON pc.perangkat_id = pr.perangkat_id
      JOIN laboratorium l ON pr.lab_id = l.lab_id
      LEFT JOIN user u ON pc.user_id = u.user_id
      WHERE pc.status_pengecekan IN ('Baru', 'Menunggu Perbaikan')
      ORDER BY pc.tanggal_pengecekan ASC, pc.pengecekan_id ASC LIMIT 20`),
      db.query(`SELECT pb.*, pr.nama_perangkat, l.nama_lab,
      u.nama_lengkap AS nama_user, pc.pemeriksaan_id FROM perbaikan pb
      LEFT JOIN perangkat pr ON pb.perangkat_id_snapshot = pr.perangkat_id
      LEFT JOIN laboratorium l ON pr.lab_id = l.lab_id
      LEFT JOIN user u ON pb.user_id = u.user_id
      LEFT JOIN pengecekan pc ON pb.pengecekan_id = pc.pengecekan_id
      ORDER BY pb.perbaikan_id DESC LIMIT 10`),
    ]);
    const totalPengecekanAktif = pengecekanAktifRows[0].total_pengecekan_aktif || 0;
    const totalRiwayatPerbaikan = perbaikanRows[0].total_riwayat_perbaikan || 0;

    res.status(200).json({
      message: "Data statistik dashboard Teknisi berhasil diambil",
      data: {
        totalPengecekanAktif,
        totalRiwayatPerbaikan,
        antrian,
        riwayat,
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
