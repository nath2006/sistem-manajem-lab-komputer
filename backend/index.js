// index.js (atau nama file utama server Anda)

import express from 'express';
import cors from 'cors';
// bodyParser sudah menjadi bagian dari Express modern, kita bisa gunakan express.json() dan express.urlencoded()
// import bodyParser from 'body-parser'; 
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Impor semua rute Anda
import userRoutes from './router/userRoutes.js';
import authRoutes from './router/authRoutes.js';
import indexRoutes from './router/indexRoutes.js'; // Pastikan rute ini didefinisikan dengan benar
import labRoutes from './router/labRoutes.js';
import deviceRoutes from './router/deviceRoutes.js';
// Perhatikan potensi typo: 'pemerikasaanRouter' mungkin seharusnya 'pemeriksaanRouter'
import pemeriksaanRouter from './router/pemerikasaanRouter.js'; 
import pengumumanRouter from './router/pengumumanRoutes.js';
import pengecekanRouter from './router/pengecekanRoutes.js';
import laporanPerangkat from './router/laporanPerangkat.js';
import perbaikanRoutes from './router/perbaikanRoutes.js';
// Perhatikan potensi typo: 'pengajunLab' mungkin seharusnya 'pengajuanLabRoutes'
import pengajunLab from './router/pengajuanLabRoutes.js'; 
import dashboardAdminRoutes from './router/dashboardAdminRoutes.js';

dotenv.config();

const app = express();

// Untuk mendapatkan __dirname di lingkungan ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware standar
app.use(cors({
  // Konfigurasi CORS yang lebih spesifik jika diperlukan, misalnya:
  // origin: ['http://localhost:5173', 'http://localhost:3000'], // Ganti dengan URL frontend Anda
  // credentials: true,
}));

// Menggantikan bodyParser.json() dan bodyParser.urlencoded()
app.use(express.json()); // Untuk mem-parsing body request JSON
app.use(express.urlencoded({ extended: true })); // Untuk mem-parsing body request URL-encoded

// Middleware untuk menyajikan file statis dari folder 'uploads'
// Ini akan membuat file di dalam folder 'PROJECT_ROOT/uploads/' (dimana PROJECT_ROOT adalah tempat index.js berada)
// dapat diakses melalui URL yang dimulai dengan '/uploads'.
// Misalnya, file 'PROJECT_ROOT/uploads/pengumuman/file-anda.pdf'
// akan dapat diakses di 'http://localhost:5000/uploads/pengumuman/file-anda.pdf'
// Pastikan folder 'uploads' ada di root direktori proyek Anda (sejajar dengan index.js).
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Definisi Rute API Anda
app.use("/api/user", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/lab", labRoutes);
app.use("/api/perangkat", deviceRoutes);
app.use("/api/pemeriksaan", pemeriksaanRouter); // Pastikan nama impor dan file konsisten
app.use("/api/pengumuman", pengumumanRouter);
app.use("/api/pengecekan", pengecekanRouter);
app.use("/api/laporan/perangkat", laporanPerangkat);
app.use("/api/perbaikan", perbaikanRoutes);
app.use("/api/pengajuan", pengajunLab); // Pastikan nama impor dan file konsisten
app.use("/api/dashboard", dashboardAdminRoutes); // Menghilangkan slash di akhir untuk konsistensi

// Rute index (misalnya untuk '/' atau rute fallback lainnya)
// Pastikan indexRoutes.js diekspor dengan benar dan menangani rute yang sesuai.
// Jika ini hanya untuk rute API dasar, mungkin lebih baik digabungkan atau di-mount pada '/api'
app.use(indexRoutes); 

// Middleware error handling sederhana (opsional, tapi sangat disarankan)
app.use((err, req, res, next) => {
  console.error("TERJADI ERROR PADA SERVER:", err.stack || err.message || err);
  // Jangan kirim detail error ke client di production
  const statusCode = err.status || 500;
  const message = err.message || 'Terjadi kesalahan pada server.';
  res.status(statusCode).json({ message, error: process.env.NODE_ENV === 'development' ? err.stack : {} });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, 'localhost', () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
  console.log(`Folder statis 'uploads' disajikan pada path URL '/uploads'`);
  console.log(`Contoh URL file: http://localhost:${PORT}/uploads/pengumuman/NAMA_FILE_ANDA.ekstensi`);
});
