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
    const [rows] = await db.query(
      "SELECT *, file_path AS file_pengumuman FROM pengumuman WHERE is_active = true ORDER BY created_at DESC"
    );
    res.status(200).json({
      data: rows,
      message: "Berhasil mengambil semua pengumuman aktif",
    });
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil data pengumuman", error: error.message });
  }
};

// Get Pengumuman By ID
export const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT *, file_path AS file_pengumuman FROM pengumuman WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Pengumuman tidak ditemukan" });
    }

    res.status(200).json({
      data: rows[0],
      message: "Berhasil mengambil pengumuman",
    });
  } catch (error) {
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
