import db from "../config/db.js";
import path from "path";
import fs from "fs";
import { uploadImage } from "../utils/multer.js";

//Buat Data Lab Baru
export const createLab = async (req, res) => {
  try {
    const {
      nama_lab, 
      lokasi, 
      kapasitas,
      kepala_lab_id, 
      deskripsi,
      status, 
      jam_buka, 
      jam_tutup, 
    } = req.body;

    const foto_lab = req.file? req.file.filename : null;

    const [result] = await db.query(
      "INSERT INTO laboratorium (nama_lab, lokasi, kapasitas, kepala_lab_id, deskripsi, status, jam_buka, jam_tutup, foto_lab) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        nama_lab, 
        lokasi, 
        kapasitas,
        kepala_lab_id, 
        deskripsi,
        status, 
        jam_buka, 
        jam_tutup, 
        foto_lab
      ]
    );

    const newLab = {
      id: result.insertId,
      nama_lab, 
      lokasi, 
      kapasitas,
      kepala_lab_id, 
      deskripsi,
      status, 
      jam_buka, 
      jam_tutup, 
      foto_lab
    }

    res.status(201).json({ 
      data: newLab,
      message: 'Data Lab Berhasil Ditambahkan '
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Membuat Data Lab Baru Gagal' ,
      error: error.message,
    });
  }
}

//Get All Lab
export const getAllLab = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM laboratorium");
    res.status(200).json({
      data: rows,
      message: 'Berhasil Mengambil Data Lab'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Mengambil Data Lab Gagal' ,
      error: error.message,
    });
  }
}

//Get Lab By ID
export const getLabById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT * FROM laboratorium WHERE lab_id = ?", [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        message: 'Data Lab Tidak Ditemukan' 
      });
    }

    res.status(200).json({
      data: rows[0],
      message: 'Berhasil Mengambil Data Lab'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Mengambil Data Lab Gagal' ,
      error: error.message,
    });
  }
}

//Update data lab
export const updateLab = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nama_lab,
      lokasi,
      kapasitas,
      kepala_lab_id,
      deskripsi,
      status,
      jam_buka,
      jam_tutup,
    } = req.body;

    // Ambil data lab lama untuk mengetahui nama file lama
    const [oldRows] = await db.query(
      "SELECT foto_lab FROM laboratorium WHERE lab_id = ?",
      [id]
    );

    if (oldRows.length === 0) {
      return res.status(404).json({ message: "Data Lab Tidak Ditemukan" });
    }

    const oldFotoLab = oldRows[0].foto_lab;

    let newFotoLab = oldFotoLab;

    // Jika user upload gambar baru
    if (req.file) {
      newFotoLab = req.file.filename;

      // Hapus file lama
      if (oldFotoLab) {
        const oldPath = path.join("uploads/labs", oldFotoLab);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    const [result] = await db.query(
      `UPDATE laboratorium SET 
        nama_lab = ?, 
        lokasi = ?, 
        kapasitas = ?, 
        kepala_lab_id = ?, 
        deskripsi = ?, 
        status = ?, 
        jam_buka = ?, 
        jam_tutup = ?, 
        foto_lab = ? 
      WHERE lab_id = ?`,
      [
        nama_lab,
        lokasi,
        kapasitas,
        kepala_lab_id,
        deskripsi,
        status,
        jam_buka,
        jam_tutup,
        newFotoLab,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Data Lab Tidak Ditemukan",
      });
    }

    res.status(200).json({
      message: "Data Lab Berhasil Diupdate",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Mengupdate Data Lab Gagal",
      error: error.message,
    });
  }
};

//Delete Lab
export const deleteLab = async (req, res) => {
  try {
    const { id } = req.params;

    // Ambil data lab untuk mengetahui nama file gambar
    const [oldRows] = await db.query(
      "SELECT foto_lab FROM laboratorium WHERE lab_id = ?",
      [id]
    );

    if (oldRows.length === 0) {
      return res.status(404).json({ message: "Data Lab Tidak Ditemukan" });
    }

    const oldFotoLab = oldRows[0].foto_lab;

    const [result] = await db.query(
      "DELETE FROM laboratorium WHERE lab_id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Data Lab Tidak Ditemukan",
      });
    }

    // Hapus file gambar jika ada
    if (oldFotoLab) {
      const oldPath = path.join("uploads/labs", oldFotoLab);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    res.status(200).json({
      message: "Data Lab Berhasil Dihapus",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Menghapus Data Lab Gagal",
      error: error.message,
    });
  }
}
