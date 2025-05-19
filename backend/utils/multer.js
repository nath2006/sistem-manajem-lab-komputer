import multer from "multer";
import path from "path";
import fs from "fs";

const basePath = "uploads";
const folders = ["labs", "perangkat", "pengumuman"];
folders.forEach(folder => {
  const fullPath = path.join(basePath, folder);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = "labs"; // default

    if (file.fieldname === "foto_perangkat") {
      folder = "perangkat";
    } else if (file.fieldname === "file_pengumuman") {
      folder = "pengumuman";
    }

    cb(null, path.join(basePath, folder));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    let baseName = "file";

    if (file.fieldname === "foto_lab") {
      baseName = req.body.nama_lab?.replace(/\s+/g, "-") || "lab";
    } else if (file.fieldname === "foto_perangkat") {
      baseName = req.body.nama_perangkat?.replace(/\s+/g, "-") || "perangkat";
    } else if (file.fieldname === "file_pengumuman") {
      baseName = req.body.judul?.replace(/\s+/g, "-") || "pengumuman";
    }

    const fileName = `${baseName}-${date}${ext}`;
    cb(null, fileName);
  }
});

export const multerUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // max 10MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const imageExts = [".jpg", ".jpeg", ".png"];
    const allowedPengumumanExts = [...imageExts, ".pdf", ".doc", ".docx", ".xls", ".xlsx"];

    if (file.fieldname === "foto_lab" || file.fieldname === "foto_perangkat") {
      if (!imageExts.includes(ext)) {
        return cb(new Error("Only JPG, JPEG, and PNG images are allowed"));
      }
    } else if (file.fieldname === "file_pengumuman") {
      if (!allowedPengumumanExts.includes(ext)) {
        return cb(new Error("Only PDF, Word, Excel, JPG, JPEG, PNG files are allowed for pengumuman"));
      }
    }

    cb(null, true);
  }
});
