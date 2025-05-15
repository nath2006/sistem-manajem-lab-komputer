import multer from "multer";
import path from "path";
import fs from "fs";

const basePath = "uploads";
const folders = ["labs", "perangkat"];
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
    }
    cb(null, path.join(basePath, folder));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const baseName = file.fieldname === "foto_lab"
      ? req.body.nama_lab?.replace(/\s+/g, "-") || "lab"
      : req.body.nama_perangkat?.replace(/\s+/g, "-") || "perangkat";
    const fileName = `${baseName}-${date}${ext}`;
    cb(null, fileName);
  }
});

export const multerUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".jpg", ".jpeg", ".png"].includes(ext)) {
      return cb(new Error("Only JPG, JPEG, and PNG images are allowed"));
    }
    cb(null, true);
  }
});
