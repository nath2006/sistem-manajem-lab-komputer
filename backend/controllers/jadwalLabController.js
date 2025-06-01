// controllers/jadwalLabController.js
import db from "../config/db.js";

export const getJadwalLabMingguan = async (req, res) => {
    // const requesterUserId = req.user_id;
    // const requesterRole = req.user.role;

    // if (!requesterUserId || !requesterRole) {
    //     console.error("Error di getJadwalLabMingguan: userId atau userRole tidak ditemukan dari token.");
    //     return res.status(401).json({ success: false, message: "Unauthorized - Informasi pengguna tidak lengkap." });
    // }

    const { start_date, end_date } = req.query;
    let queryLabId = req.query.lab_id ? parseInt(req.query.lab_id) : null;

    // Validasi input tanggal
    if (!start_date || !end_date) {
        return res.status(400).json({
            success: false,
            message: "Parameter start_date dan end_date wajib diisi."
        });
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
        return res.status(400).json({
            success: false,
            message: "Format tanggal tidak valid. Gunakan format YYYY-MM-DD."
        });
    }
    if (new Date(end_date) < new Date(start_date)) {
        return res.status(400).json({
            success: false,
            message: "Tanggal akhir (end_date) tidak boleh lebih awal dari tanggal mulai (start_date)."
        });
    }

    // Validasi lab_id jika diberikan
    if (req.query.lab_id && (isNaN(queryLabId) || queryLabId <= 0)) {
        return res.status(400).json({
            success: false,
            message: "lab_id yang diberikan tidak valid."
        });
    }

    try {
        let targetLabId = queryLabId;

        if (!targetLabId) { // Jika lab_id tidak ada di query
            if (requesterRole === 'Kepala Lab') {
                const [labsDikelola] = await db.query(
                    "SELECT lab_id FROM laboratorium WHERE kepala_lab_id = ?",
                    [requesterUserId]
                );

                if (labsDikelola.length === 1) {
                    targetLabId = labsDikelola[0].lab_id;
                } else if (labsDikelola.length > 1) {
                    return res.status(400).json({
                        success: false,
                        message: "Anda mengelola lebih dari satu laboratorium. Harap pilih lab spesifik (sertakan parameter lab_id)."
                    });
                } else { // Tidak mengelola lab manapun
                    return res.status(404).json({
                        success: false,
                        message: "Tidak ditemukan laboratorium yang Anda kelola. Tidak dapat menampilkan jadwal."
                    });
                }
            } else if (requesterRole === 'Admin' || requesterRole === 'Guru') {
                // Untuk Admin dan Guru, lab_id wajib jika tidak ada di query
                return res.status(400).json({
                    success: false,
                    message: "Parameter lab_id wajib diisi untuk melihat jadwal laboratorium."
                });
            } else {
                 // Role lain yang mungkin ada dan tidak dihandle
                 return res.status(403).json({ success: false, message: "Anda tidak memiliki izin untuk mengakses data ini tanpa spesifikasi lab."});
            }
        }
        
        // Pada titik ini, targetLabId harus sudah terisi atau error sudah dikembalikan.
        // Double check untuk memastikan targetLabId ada sebelum query utama.
        if (!targetLabId) {
             // Ini seharusnya tidak terjadi jika logika di atas benar, sebagai fallback.
            console.error("targetLabId masih kosong setelah logika penentuan.");
            return res.status(500).json({ success: false, message: "Kesalahan internal: Lab ID tidak dapat ditentukan." });
        }


        const sqlQuery = `
            SELECT
                jl.jadwal_id,
                jl.lab_id,
                lab.nama_lab,
                jl.guru_id,
                usr.nama_lengkap AS nama_guru,
                jl.tanggal,
                TIME_FORMAT(jl.jam_mulai, '%H:%i') AS jam_mulai,
                TIME_FORMAT(jl.jam_selesai, '%H:%i') AS jam_selesai,
                jl.kelas,
                jl.mata_pelajaran,
                jl.kegiatan,
                jl.status,
                jl.pengajuan_id_asal
            FROM
                jadwal_lab jl
            JOIN
                laboratorium lab ON jl.lab_id = lab.lab_id
            JOIN
                user usr ON jl.guru_id = usr.user_id
            WHERE
                jl.tanggal BETWEEN ? AND ? AND jl.lab_id = ?
            ORDER BY jl.tanggal ASC, jl.jam_mulai ASC;
        `;

        const queryParams = [start_date, end_date, targetLabId];
        const [jadwalMingguan] = await db.query(sqlQuery, queryParams);

        if (jadwalMingguan.length === 0) {
            return res.status(200).json({
                success: true,
                message: "Tidak ada jadwal laboratorium yang ditemukan untuk lab dan rentang tanggal yang diberikan.",
                data: []
            });
        }

        res.status(200).json({
            success: true,
            message: `Jadwal laboratorium untuk ${jadwalMingguan[0].nama_lab} berhasil diambil.`, // Pesan lebih spesifik
            data: jadwalMingguan
        });

    } catch (error) {
        console.error("Error saat mengambil jadwal laboratorium mingguan:", error);
        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server saat mengambil jadwal.",
            details: error.message
        });
    }
};
