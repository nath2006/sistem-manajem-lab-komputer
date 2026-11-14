import db from "../config/db.js";

// Ambil Semua Laporan Perangkat
export const getAllLaporanPerangkat = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT l.*, u.nama_lengkap AS pembuat
      FROM laporan l
      JOIN user u ON l.dibuat_oleh = u.user_id
      WHERE l.jenis_laporan = 'Bermasalah'
      ORDER BY l.tanggal_dibuat DESC
    `);

    res.status(200).json({
      message: "Berhasil mengambil semua laporan perangkat",
      data: rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Gagal mengambil laporan perangkat",
      error: error.message
    });
  }
};

// Buat Laporan Perangkat Baru
export const createLaporanPerangkat = async (req, res) => {
  try {
    const { periode, file_path } = req.body;

    const dibuat_oleh = req.user.user_id;

    const [result] = await db.query(`
      INSERT INTO laporan (jenis_laporan, periode, file_path, dibuat_oleh)
      VALUES ('Perbaikan', ?, ?, ?)
    `, [periode, file_path, dibuat_oleh]);

    res.status(201).json({
      message: "Laporan perangkat berhasil dibuat",
      data: {
        laporan_id: result.insertId,
        periode,
        file_path,
        dibuat_oleh
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Gagal membuat laporan perangkat",
      error: error.message
    });
  }
};

// Ambil Detail Laporan Perangkat
export const getDetailLaporanPerangkat = async (req, res) => {
  try {
    const { id } = req.params;

    const [laporanRows] = await db.query(`
      SELECT l.*, u.nama_lengkap AS pembuat
      FROM laporan l
      JOIN user u ON l.dibuat_oleh = u.user_id
      WHERE l.laporan_id = ? AND l.jenis_laporan = 'Perbaikan'
    `, [id]);

    if (laporanRows.length === 0) {
      return res.status(404).json({ message: "Laporan tidak ditemukan" });
    }

    const laporan = laporanRows[0];

    const [detailRows] = await db.query(`
      SELECT 
        d.nama_perangkat,
        l.nama_lab,
        p.tanggal_pemeriksaan,
        p.hasil_pemeriksaan,
        p.catatan AS catatan_pemeriksaan,
        u_p.nama_lengkap AS teknisi_pemeriksa,

        c.tanggal_pengecekan,
        c.ditemukan_kerusakan,
        u_c.nama_lengkap AS teknisi_pengecek,

        r.tanggal_perbaikan,
        r.tindakan,
        r.hasil_perbaikan,
        r.catatan_tambahan,
        u_r.nama_lengkap AS teknisi_perbaikan

      FROM pemeriksaan p
      JOIN perangkat d ON p.perangkat_id = d.perangkat_id
      JOIN laboratorium l ON d.lab_id = l.lab_id
      JOIN user u_p ON p.user_id = u_p.user_id

      LEFT JOIN pengecekan c ON c.perangkat_id = d.perangkat_id
      LEFT JOIN user u_c ON c.user_id = u_c.user_id

      LEFT JOIN perbaikan r ON r.pengecekan_id = c.pengecekan_id
      LEFT JOIN user u_r ON r.user_id = u_r.user_id

      WHERE p.hasil_pemeriksaan = 'Bermasalah'
      AND DATE_FORMAT(p.tanggal_pemeriksaan, '%Y-%m') = ?
      ORDER BY p.tanggal_pemeriksaan DESC
    `, [laporan.periode]);

    res.status(200).json({
      message: "Berhasil mengambil detail laporan perangkat",
      data: {
        laporan,
        detail: detailRows
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Gagal mengambil detail laporan perangkat",
      error: error.message
    });
  }
};

// Hapus Laporan Perangkat
export const deleteLaporanPerangkat = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `DELETE FROM laporan WHERE laporan_id = ? AND jenis_laporan = 'Perbaikan'`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Laporan tidak ditemukan" });
    }

    res.status(200).json({
      message: "Laporan perangkat berhasil dihapus"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Gagal menghapus laporan perangkat",
      error: error.message
    });
  }
};
