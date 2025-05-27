// controllers/pengajuanLabController.js
import db from "../config/db.js";

export const createPengajuan = async (req, res) => {
  try {
    const {
      lab_id,
      guru_id,
      tanggal_pakai,
      jam_mulai,
      jam_selesai,
      kelas,
      mata_pelajaran,
      kegiatan,
    } = req.body;
    const [overlapPengajuan] = await db.query(
      `SELECT * FROM pengajuan_lab 
   WHERE lab_id = ? AND tanggal_pakai = ? AND 
   NOT (jam_selesai <= ? OR jam_mulai >= ?) 
   AND status IN ('Menunggu', 'Disetujui')`,
      [lab_id, tanggal_pakai, jam_mulai, jam_selesai]
    );

    if (overlapPengajuan.length > 0) {
      return res
        .status(400)
        .json({ error: "Jadwal bentrok dengan pengajuan lain" });
    }

    const [overlapJadwal] = await db.query(
      `SELECT * FROM jadwal_lab 
   WHERE lab_id = ? AND tanggal = ? AND 
   NOT (jam_selesai <= ? OR jam_mulai >= ?)
   AND status = 'Terisi'`,
      [lab_id, tanggal_pakai, jam_mulai, jam_selesai]
    );

    if (overlapJadwal.length > 0) {
      return res
        .status(400)
        .json({ error: "Jadwal bentrok dengan jadwal lab yang sudah terisi" });
    }

    await db.query(
      `INSERT INTO pengajuan_lab (lab_id, guru_id, tanggal_pakai, jam_mulai, jam_selesai, kelas, mata_pelajaran, kegiatan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lab_id,
        guru_id,
        tanggal_pakai,
        jam_mulai,
        jam_selesai,
        kelas,
        mata_pelajaran,
        kegiatan,
      ]
    );

    res.json({
      message: "Pengajuan jadwal berhasil dibuat, menunggu persetujuan",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getPengajuanMenunggu = async (req, res) => {
  try {
    const userId = req.user_id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let pengajuan;

    if (userRole === "Admin") {
      // Admin bisa lihat semua pengajuan menunggu
      [pengajuan] = await db.query(
        `SELECT p.*, u.nama_lengkap AS guru_nama, l.nama_lab 
         FROM pengajuan_lab p
         JOIN user u ON p.guru_id = u.user_id
         JOIN laboratorium l ON p.lab_id = l.lab_id
         WHERE p.status = 'Menunggu'`
      );
    } else if (userRole === "Kepala Lab") {
      // Kepala lab hanya bisa lihat pengajuan lab yang dia kelola
      [pengajuan] = await db.query(
        `SELECT p.*, u.nama_lengkap AS guru_nama, l.nama_lab 
         FROM pengajuan_lab p
         JOIN user u ON p.guru_id = u.user_id
         JOIN laboratorium l ON p.lab_id = l.lab_id
         WHERE p.status = 'Menunggu' AND l.kepala_lab_id = ?`,
        [userId]
      );
    } else {
      return res.status(403).json({ error: "Akses ditolak" });
    }

    res.json(pengajuan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getPengajuanByGuru = async (req, res) => {
  try {
    const userId = req.user_id;
    const userRole = req.user?.role;

    if (!userId || userRole !== "Guru") {
      return res.status(403).json({ error: "Akses hanya untuk Guru" });
    }

    const [pengajuan] = await db.query(
      `SELECT p.*, l.nama_lab, u.nama_lengkap AS guru_nama 
       FROM pengajuan_lab p
       JOIN laboratorium l ON p.lab_id = l.lab_id
       JOIN user u ON p.guru_id = u.user_id
       WHERE p.guru_id = ?
       ORDER BY p.tanggal_pakai DESC, p.jam_mulai DESC`,
      [userId]
    );

    res.json(pengajuan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};


export const approvePengajuan = async (req, res) => {
  try {
    const pengajuanId = req.params.id;
    const disetujui_oleh = req.user_id;
    const now = new Date();

    const [[pengajuan]] = await db.query(
      `SELECT * FROM pengajuan_lab WHERE pengajuan_id = ?`,
      [pengajuanId]
    );
    if (!pengajuan)
      return res.status(404).json({ error: "Pengajuan tidak ditemukan" });
    if (pengajuan.status !== "Menunggu")
      return res.status(400).json({ error: "Pengajuan sudah diproses" });

    const [overlapJadwal] = await db.query(
      `SELECT * FROM jadwal_lab WHERE lab_id = ? AND tanggal = ? AND
       ((jam_mulai < ? AND jam_selesai > ?) OR (jam_mulai < ? AND jam_selesai > ?)) AND status = 'Terisi'`,
      [
        pengajuan.lab_id,
        pengajuan.tanggal_pakai,
        pengajuan.jam_selesai,
        pengajuan.jam_selesai,
        pengajuan.jam_mulai,
        pengajuan.jam_mulai,
      ]
    );
    if (overlapJadwal.length > 0) {
      return res
        .status(400)
        .json({ error: "Jadwal lab bentrok, tidak dapat disetujui" });
    }

    await db.query(
      `INSERT INTO jadwal_lab (lab_id, guru_id, tanggal, jam_mulai, jam_selesai, kelas, mata_pelajaran, kegiatan, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Terisi')`,
      [
        pengajuan.lab_id,
        pengajuan.guru_id,
        pengajuan.tanggal_pakai,
        pengajuan.jam_mulai,
        pengajuan.jam_selesai,
        pengajuan.kelas,
        pengajuan.mata_pelajaran,
        pengajuan.kegiatan,
      ]
    );

    await db.query(
      `UPDATE pengajuan_lab SET status = 'Disetujui', disetujui_oleh = ?, waktu_persetujuan = ? WHERE pengajuan_id = ?`,
      [disetujui_oleh, now, pengajuanId]
    );

    res.json({
      message: "Pengajuan berhasil disetujui dan dimasukkan ke jadwal lab",
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const rejectPengajuan = async (req, res) => {
  try {
    const pengajuanId = req.params.id;
    const { alasan_penolakan } = req.body;
    const disetujui_oleh = req.user_id; 
    const now = new Date();

    const [[pengajuan]] = await db.query(
      `SELECT * FROM pengajuan_lab WHERE pengajuan_id = ?`,
      [pengajuanId]
    );

    if (!pengajuan)
      return res.status(404).json({ error: "Pengajuan tidak ditemukan" });

    if (pengajuan.status !== "Menunggu")
      return res.status(400).json({ error: "Pengajuan sudah diproses" });

    await db.query(
      `UPDATE pengajuan_lab 
       SET status = 'Ditolak', 
           alasan_penolakan = ?, 
           disetujui_oleh = ?, 
           waktu_persetujuan = ? 
       WHERE pengajuan_id = ?`,
      [alasan_penolakan, disetujui_oleh, now, pengajuanId]
    );

    res.json({ message: "Pengajuan berhasil ditolak" });
  } catch (error) {
    console.error("Reject Error:", error); // Debug log
    res.status(500).json({ error: "Server error" });
  }
};
