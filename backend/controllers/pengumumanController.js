import db from "../config/db.js";
import path from "path";
import fs from "fs";

// Create Pengumuman
export const createAnnouncement = async (req, res) => {
  try {
    const {
      judul,
      content,
      created_by
    } = req.body;

    const file_pengumuman = req.file ? req.file.filename : null;

    const [result] = await db.query(
      `INSERT INTO pengumuman (judul, content, file_path, created_by, is_active) VALUES (?, ?, ?, ?, true)`,
      [judul, content, file_pengumuman, created_by]
    );

    res.status(201).json({
      data: {
        id: result.insertId,
        judul,
        content,
        file_pengumuman,
        created_by,
        is_active: true
      },
      message: "Pengumuman berhasil dibuat",
    });
  } catch (error) {
    res.status(500).json({ message: "Gagal membuat pengumuman", error: error.message });
  }
};

// Get All Pengumuman Aktif
export const getAllAnnouncements = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id,
        p.judul,
        p.content,
        p.file_path,  -- Menggunakan file_path standar, frontend Anda menggunakan ini
        p.created_at,
        p.is_active,
        p.created_by AS created_by_user_id, -- ID user yang membuat pengumuman
        u.nama_lengkap AS creator_nama_lengkap -- Nama lengkap user dari tabel user
      FROM 
        pengumuman p
      JOIN 
        user u ON p.created_by = u.user_id
      WHERE 
        p.is_active = true 
      ORDER BY 
        p.created_at DESC;
    `;
    const [rows] = await db.query(query);

    // Mengubah struktur data agar created_by menjadi objek yang berisi user_id dan nama_lengkap
    const formattedData = rows.map(item => {
      return {
        id: item.id,
        judul: item.judul,
        content: item.content,
        file_path: item.file_path,
        created_at: item.created_at,
        is_active: item.is_active,
        created_by: { // Membuat objek nested untuk created_by
          user_id: item.created_by_user_id,
          nama_lengkap: item.creator_nama_lengkap
        }
      };
    });

    res.status(200).json({
      data: formattedData, // Kirim data yang sudah diformat
      message: "Berhasil mengambil semua pengumuman aktif",
    });
  } catch (error) {
    console.error("Error fetching active announcements:", error); // Tambahkan console.error untuk debugging di backend
    res.status(500).json({ message: "Gagal mengambil data pengumuman", error: error.message });
  }
};

// Get Pengumuman by ID
export const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        p.id,
        p.judul,
        p.content,
        p.file_path,  -- Menggunakan file_path standar
        p.created_at,
        p.is_active,
        p.created_by AS created_by_user_id, -- ID user yang membuat pengumuman
        u.nama_lengkap AS creator_nama_lengkap -- Nama lengkap user dari tabel user
      FROM 
        pengumuman p
      JOIN 
        user u ON p.created_by = u.user_id
      WHERE 
        p.id = ?;
    `;
    const [rows] = await db.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Pengumuman tidak ditemukan" });
    }

    const announcement = rows[0];

    // Mengubah struktur data agar created_by menjadi objek
    const formattedData = {
      id: announcement.id,
      judul: announcement.judul,
      content: announcement.content,
      file_path: announcement.file_path,
      created_at: announcement.created_at,
      is_active: announcement.is_active,
      created_by: { // Membuat objek nested untuk created_by
        user_id: announcement.created_by_user_id,
        nama_lengkap: announcement.creator_nama_lengkap
      }
    };

    res.status(200).json({
      data: formattedData, // Kirim data pengumuman tunggal yang sudah diformat
      message: "Berhasil mengambil pengumuman",
    });
  } catch (error) {
    console.error("Error fetching announcement by ID:", error); // Tambahkan console.error
    res.status(500).json({ message: "Gagal mengambil pengumuman", error: error.message });
  }
};

// Update Pengumuman
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      judul,
      content,
      is_active
    } = req.body;

    const [oldRows] = await db.query("SELECT * FROM pengumuman WHERE id = ?", [id]);
    if (oldRows.length === 0) {
      return res.status(404).json({ message: "Pengumuman tidak ditemukan" });
    }

    const oldFile = oldRows[0].file_path;
    let newFile = oldFile;

    if (req.file) {
      newFile = req.file.filename;
      if (oldFile) {
        const oldPath = path.join("uploads/pengumuman", oldFile);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    await db.query(
      `UPDATE pengumuman SET judul = ?, content = ?, file_path = ?, is_active = ? WHERE id = ?`,
      [judul, content, newFile, is_active ?? true, id]
    );

    res.status(200).json({
      data: { id, judul, content, file_pengumuman: newFile, is_active },
      message: "Pengumuman berhasil diperbarui",
    });
  } catch (error) {
    res.status(500).json({ message: "Gagal memperbarui pengumuman", error: error.message });
  }
};

// Delete Pengumuman
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const [oldRows] = await db.query("SELECT file_path FROM pengumuman WHERE id = ?", [id]);
    if (oldRows.length === 0) {
      return res.status(404).json({ message: "Pengumuman tidak ditemukan" });
    }

    const file = oldRows[0].file_path;
    if (file) {
      const filePath = path.join("uploads/pengumuman", file);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await db.query("DELETE FROM pengumuman WHERE id = ?", [id]);

    res.status(200).json({ message: "Pengumuman berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ message: "Gagal menghapus pengumuman", error: error.message });
  }
};
