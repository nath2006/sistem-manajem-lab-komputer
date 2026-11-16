import db from "../config/db.js";
import {createDeletionService,sendDeletionError} from "../services/deletionService.js";
import path from "path";
import fs from "fs";
import {createLegacyDeviceWriter} from "../services/legacyDeviceService.js";

const writeLegacyDevice = createLegacyDeviceWriter(db);
const removeDeviceImage = filename => {
  if (!filename) return;
  const target = path.join('uploads/perangkat', path.basename(filename));
  try { if (fs.existsSync(target)) fs.unlinkSync(target); } catch { /* committed DB result preserved */ }
};
const saveDevice = update => async (req,res) => {
  try {
    const {row,oldPhoto} = await writeLegacyDevice(req.user,req.body,update?req.params.id:undefined,req.file?.filename);
    if (oldPhoto) removeDeviceImage(oldPhoto);
    res.status(update?200:201).json({data:row,message:update?'Data Perangkat Berhasil Diupdate':'Data Perangkat Baru Berhasil Ditambahkan'});
  } catch(error) {
    if(req.file?.filename) removeDeviceImage(req.file.filename);
    const duplicate=error.code==='ER_DUP_ENTRY';
    res.status(duplicate?409:error.status||500).json({message:duplicate?'Nomor inventaris sudah digunakan.':error.status?error.message:'Gagal menyimpan perangkat.'});
  }
};
export const createDevice = saveDevice(false);

//Get All Perangkat (dengan nama_lab)
export const getAllDevice = async (req,res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
         p.perangkat_id,
         p.nama_perangkat,
         p.spesifikasi,
         p.status,
         p.lab_id,
         p.foto_perangkat,
         p.nomor_inventaris,
         l.nama_lab -- Tambahkan kolom nama_lab dari tabel laboratorium
       FROM perangkat p
       LEFT JOIN laboratorium l ON p.lab_id = l.lab_id -- LEFT JOIN untuk tetap menampilkan perangkat meski lab_id tidak valid (jarang terjadi dengan FK)
       ORDER BY p.nama_perangkat ASC` // Tambahkan ORDER BY jika diinginkan
    );
    res.status(200).json({
      data: rows,
      message: 'Berhasil Mengambil Data Perangkat'
    });
  } catch (error) {
    console.error("Error fetching all devices:", error); // Log error lebih spesifik
    res.status(500).json({ 
      message: 'Mengambil Data Perangkat Gagal' , // Pesan disesuaikan sedikit
      error: error.message,
    });
  }
};

//Get Perangkat By ID (dengan nama_lab)
export const getDeviceById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT 
         p.perangkat_id,
         p.nama_perangkat,
         p.spesifikasi,
         p.status,
         p.lab_id,
         p.foto_perangkat,
         p.nomor_inventaris,
         l.nama_lab -- Tambahkan kolom nama_lab dari tabel laboratorium
       FROM perangkat p
       LEFT JOIN laboratorium l ON p.lab_id = l.lab_id
       WHERE p.perangkat_id = ?`, 
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        message: 'Data Perangkat Tidak Ditemukan' // Pesan disesuaikan
      });
    }

    res.status(200).json({
      data: rows[0],
      message: 'Berhasil Mengambil Data Perangkat'
    });
  } catch (error) {
    console.error(`Error fetching device by ID ${id}:`, error); // Log error lebih spesifik
    res.status(500).json({ 
      message: 'Mengambil Data Perangkat Gagal' ,
      error: error.message,
    });
  }
};

export const updateDevice = saveDevice(true);

//Delete Perangkat
export const createDeleteDevice = ({service = createDeletionService({db}), removeImage = filename => { const target = path.join("uploads/perangkat", path.basename(filename)); if (fs.existsSync(target)) fs.unlinkSync(target); }} = {}) => async (req,res) => {
 try {
  const row = await service.remove('perangkat',req.params.id,req.user);
  if(row.foto_perangkat) {try {removeImage(row.foto_perangkat);} catch { /* DB committed; image cleanup is best effort. */ }}
  res.status(200).json({message:'Data Perangkat Berhasil Dihapus'});
 } catch(error) {sendDeletionError(res,error);}
};
export const deleteDevice = createDeleteDevice();
