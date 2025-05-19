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

router.get("/", verifyToken, getAllAnnouncements);
router.get("/:id", verifyToken, getAnnouncementById);

router.post("/create",
  verifyToken,
  authorizeRoles(["Admin", "Koordinator Lab"]),
  multerUpload.single("file_pengumuman"),
  createAnnouncement
);

router.put("/update/:id",
  verifyToken,
  authorizeRoles(["Admin", "Koordinator Lab"]),
  multerUpload.single("file_pengumuman"),
  updateAnnouncement
);

router.delete("/delete/:id",
  verifyToken,
  authorizeRoles(["Admin", "Koordinator Lab"]),
  deleteAnnouncement
);

export default router;
