import express from "express";
import {
  createPengajuan,
  getPengajuanMenunggu,
  approvePengajuan,
  rejectPengajuan,
  getPengajuanByGuru,
  getStatistikPengajuan // Pastikan nama fungsi ini diimpor dengan benar
} from "../controllers/pengajuanController.js"; // Perhatikan nama file controller Anda

import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Rute untuk membuat pengajuan baru
// Bisa diakses oleh Guru, Kepala Lab (jika mereka juga bisa mengajukan), dan Admin
router.post("/create",
  verifyToken,
  authorizeRoles(["Guru", "Kepala Lab", "Admin"]),
  createPengajuan
);

// Rute untuk mendapatkan daftar pengajuan yang statusnya 'Menunggu'
// Kepala Lab hanya melihat lab yang dikelolanya. Admin melihat semua atau bisa filter by lab_id.
router.get("/menunggu",
  verifyToken,
  authorizeRoles(["Kepala Lab", "Admin"]),
  getPengajuanMenunggu
);

// Rute untuk Guru (atau pengguna lain) melihat status pengajuan yang mereka buat
router.get("/status",
  verifyToken,
  // Semua role yang bisa membuat pengajuan seharusnya bisa melihat statusnya
  authorizeRoles(["Guru", "Kepala Lab", "Admin"]),
  getPengajuanByGuru
);

// Rute untuk menyetujui pengajuan
// Hanya Kepala Lab dan Admin
router.post("/:id/approve",
  verifyToken,
  authorizeRoles(["Kepala Lab", "Admin"]),
  approvePengajuan
);

// Rute untuk menolak pengajuan
// Hanya Kepala Lab dan Admin
router.post("/:id/reject",
  verifyToken,
  authorizeRoles(["Kepala Lab", "Admin"]),
  rejectPengajuan
);

// Rute baru untuk mendapatkan statistik pengajuan
// Hanya Kepala Lab dan Admin
router.get("/statistik",
  verifyToken,
  authorizeRoles(["Kepala Lab", "Admin"]),
  getStatistikPengajuan
);

export default router;
