import db from "../config/db.js"; // Pastikan path ke konfigurasi database Anda benar

// Fungsi untuk mendapatkan semua statistik dashboard admin
export const getDashboardStats = async (req, res) => {
  try {
    // 1. Jumlah Pengguna Online
    const [onlineUsersRows] = await db.query(
      "SELECT COUNT(user_id) AS total_online_users FROM user WHERE is_online = true"
    );
    const totalOnlineUsers = onlineUsersRows[0].total_online_users || 0;

    // 2. Jumlah Total Perangkat
    const [devicesRows] = await db.query(
      "SELECT COUNT(perangkat_id) AS total_perangkat FROM perangkat"
    );
    const totalPerangkat = devicesRows[0].total_perangkat || 0;

    // 3. Jumlah Total Laboratorium
    const [labsRows] = await db.query(
      "SELECT COUNT(lab_id) AS total_lab FROM laboratorium"
    );
    const totalLab = labsRows[0].total_lab || 0;

    // 4. Jumlah Total Pengguna
    const [usersRows] = await db.query(
      "SELECT COUNT(user_id) AS total_user FROM user"
    );
    const totalUser = usersRows[0].total_user || 0;

    // 5. Jumlah Total Pengumuman yang Aktif
    const [announcementsRows] = await db.query(
      "SELECT COUNT(id) AS total_pengumuman FROM pengumuman WHERE is_active = true"
    );
    const totalPengumuman = announcementsRows[0].total_pengumuman || 0;
    
    // 6. Mengambil beberapa pengumuman terbaru yang aktif (misalnya 5 terbaru)
    const [latestAnnouncements] = await db.query(
      "SELECT id, judul, content, DATE_FORMAT(created_at, '%d %M %Y %H:%i') AS tanggal_dibuat FROM pengumuman WHERE is_active = true ORDER BY created_at DESC LIMIT 5"
    );

    // 7. Jumlah perangkat berdasarkan status
    const [perangkatByStatusRows] = await db.query(
        "SELECT status, COUNT(perangkat_id) AS jumlah FROM perangkat GROUP BY status"
    );

    // 8. Jumlah laboratorium berdasarkan status
    const [labByStatusRows] = await db.query(
        "SELECT status, COUNT(lab_id) AS jumlah FROM laboratorium GROUP BY status"
    );


    res.status(200).json({
      message: "Data statistik dashboard berhasil diambil",
      data: {
        totalOnlineUsers,
        totalPerangkat,
        totalLab,
        totalUser,
        totalPengumuman,
        latestAnnouncements, // Mengirim juga beberapa pengumuman terbaru
        perangkatByStatus: perangkatByStatusRows, // Data perangkat berdasarkan status
        labByStatus: labByStatusRows, // Data lab berdasarkan status
      },
    });
  } catch (error) {
    console.error("Error in getDashboardStats function:", error);
    res.status(500).json({
      message: "Gagal mengambil data statistik dashboard",
      error: error.message,
    });
  }
};

// Backend - getLabsWithHeads (Modifikasi)
export const getLabsWithHeads = async (req, res) => {
  try {
    const query = `
      SELECT 
        l.lab_id, l.nama_lab, l.lokasi, 
        u.nama_lengkap AS nama_kepala_lab, 
        u.user_id AS kepala_lab_user_id
      FROM 
        laboratorium l
      LEFT JOIN 
        user u ON l.kepala_lab_id = u.user_id
      ORDER BY 
        l.nama_lab ASC;
    `;
    const [rows] = await db.query(query);

    // Selalu kembalikan status 200 OK.
    // Pesan disesuaikan jika data kosong.
    // `data` akan menjadi array kosong jika tidak ada lab.
    res.status(200).json({
      message: rows.length === 0 ? "Tidak ada data laboratorium yang ditemukan." : "Berhasil mengambil data laboratorium beserta kepala lab.",
      data: rows, // rows akan berupa [] jika tidak ada data
    });

  } catch (error) {
    console.error("Error in getLabsWithHeads function:", error);
    res.status(500).json({
      message: "Gagal mengambil data laboratorium.",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all users with their roles
 * @route   GET /api/users-with-roles (Contoh route, sesuaikan di file routing Anda)
 * @access  Private (misalnya, Admin)
 */
export const getUsersWithRoles = async (req, res) => {
  try {
    const query = `
      SELECT 
        user_id,
        username,
        nama_lengkap,
        email,
        role,
        is_online
      FROM 
        user
      ORDER BY 
        nama_lengkap ASC;
    `;
    const [rows] = await db.query(query);

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Tidak ada data pengguna yang ditemukan.",
        data: [],
      });
    }

    res.status(200).json({
      message: "Berhasil mengambil data pengguna beserta rolenya.",
      data: rows,
    });
  } catch (error) {
    console.error("Error in getUsersWithRoles function:", error);
    res.status(500).json({
      message: "Gagal mengambil data pengguna.",
      error: error.message,
    });
  }
};
