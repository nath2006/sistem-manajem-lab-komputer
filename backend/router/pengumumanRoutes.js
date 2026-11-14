// routes/pengumumanRoutes.js
import express from "express";
import {
  createAnnouncement,
  getAllAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
} from "../controllers/pengumumanController.js"; 
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js"; 
import { multerUpload } from "../utils/multer.js"; 

const router = express.Router();

//Get dan Detail tidak perlu login
router.get("/",  getAllAnnouncements);
router.get("/:id", getAnnouncementById);

router.delete("/delete/:id", verifyToken, authorizeRoles(["Admin", "Koordinator Lab"]), deleteAnnouncement);

// Rute untuk membuat pengumuman baru
router.post("/create",
  verifyToken, // Pertama, verifikasi token
  authorizeRoles(["Admin", "Koordinator Lab"]), // Kemudian, otorisasi role
  multerUpload.single("file_pengumuman"), // Kemudian, proses upload file jika ada
  createAnnouncement // Terakhir, jalankan controller createAnnouncement
);

// ... (route PUT Anda)
router.put("/update/:id",
  verifyToken,
  authorizeRoles(["Admin", "Koordinator Lab"]),
  multerUpload.single("file_pengumuman"),
  updateAnnouncement
);

export default router;
