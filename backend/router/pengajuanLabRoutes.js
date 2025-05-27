// routes/pengajuanLabRoutes.js
import express from "express";
import {
  createPengajuan,
  getPengajuanMenunggu,
  approvePengajuan,
  rejectPengajuan,
  getPengajuanByGuru
} from "../controllers/pengajuanController.js";

import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";


const router = express.Router();

router.post("/create", 
  verifyToken,
  authorizeRoles(["Guru", "Kepala Lab", "Admin"]),
  createPengajuan
);

router.get("/menunggu", 
  verifyToken,
  authorizeRoles(["Kepala Lab", "Admin"]),
  getPengajuanMenunggu
);

router.get("/status", 
  verifyToken,
  authorizeRoles(["Guru", "Admin"]),
  getPengajuanByGuru
);


router.post("/:id/approve", 
  verifyToken,
  authorizeRoles(["Kepala Lab", "Admin"]),
  approvePengajuan
);

router.post("/:id/reject", 
  verifyToken,
  authorizeRoles(["Kepala Lab", "Admin"]),
  rejectPengajuan
);

export default router;
