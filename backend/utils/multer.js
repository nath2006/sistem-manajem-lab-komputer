import multer from "multer";
import path from "path";
import fs from "fs";

const storagePath = "uploads/labs";
if(!fs.existsSync(storagePath)) {
  fs.mkdirSync(storagePath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req,file,cb) => {
    cb(null, storagePath);
  },
  filename: (req, file, cb) => {
    //unique filename
    const namaLab = req.body.nama_lab?.replace(/\s+/g, "-")|| "lab";
    const ext = path.extname(file.originalname);
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const fileName = `${namaLab}-${date}${ext}`;
    cb(null, fileName);
  } 
});

export const uploadImage = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png") {
      return cb(new Error("Only images are allowed"));
    }
    cb(null, true);
  },
})
