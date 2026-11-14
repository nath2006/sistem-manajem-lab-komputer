// utils/multer.js
import multer from "multer";
import path from "path";
import fs from "fs";

const basePath = "uploads"; // Folder root untuk semua upload
const subFolders = { // Mendefinisikan subfolder berdasarkan fieldname
  foto_lab: "labs",
  foto_perangkat: "perangkat",
  file_pengumuman: "pengumuman", // KONSISTEN DENGAN HURUF KECIL
  default: "others" // Default jika fieldname tidak dikenal
};

// Membuat semua direktori yang dibutuhkan jika belum ada
Object.values(subFolders).forEach(folder => {
  const fullPath = path.join(process.cwd(), basePath, folder); // Menggunakan process.cwd() untuk path absolut
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created directory: ${fullPath}`);
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = subFolders[file.fieldname] || subFolders.default;
    cb(null, path.join(process.cwd(), basePath, folder)); // Path absolut untuk destinasi
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
    
    let namePart = "file"; // Default name part

    // Menentukan namePart berdasarkan fieldname dan data dari req.body
    // Pastikan req.body.judul, req.body.nama_lab, dll. ada saat filename function dieksekusi
    // Multer memproses field teks sebelum file, jadi ini seharusnya aman.
    if (file.fieldname === "file_pengumuman" && req.body.judul) {
      namePart = req.body.judul;
    } else if (file.fieldname === "foto_lab" && req.body.nama_lab) {
      namePart = req.body.nama_lab;
    } else if (file.fieldname === "foto_perangkat" && req.body.nama_perangkat) {
      namePart = req.body.nama_perangkat;
    }

    // Sanitasi nama file: ambil 30 karakter, ganti spasi dengan strip, hapus karakter non-alphanumeric kecuali strip
    const sanitizedNamePart = namePart
      .substring(0, 30)
      .replace(/[^\w\s-]/g, "") // Hapus karakter non-alphanumeric kecuali spasi dan strip
      .replace(/\s+/g, "-");   // Ganti spasi dengan strip

    const finalFileName = `${sanitizedNamePart}-${date}${ext}`;
    cb(null, finalFileName);
  }
});

export const multerUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // max 10MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".webp"]; // Tambah ekstensi gambar umum
    const docExts = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt"];
    
    let allowedExtensions = [];

    if (file.fieldname === "foto_lab" || file.fieldname === "foto_perangkat") {
      allowedExtensions = imageExts;
    } else if (file.fieldname === "file_pengumuman") {
      allowedExtensions = [...imageExts, ...docExts];
    } else {
      // Jika fieldname tidak dikenal, tolak saja untuk keamanan
      return cb(new Error("Fieldname file tidak valid."), false);
    }

    if (!allowedExtensions.includes(ext)) {
      return cb(new Error(`Ekstensi file tidak diizinkan untuk ${file.fieldname}. Hanya: ${allowedExtensions.join(", ")}`), false);
    }
    
    cb(null, true);
  }
});
