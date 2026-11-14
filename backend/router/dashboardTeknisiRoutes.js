// Contoh di file rute backend (misal: routes/dashboardRoutes.js)
import express from "express";
import { getTeknisiDashboardStats } from "../controllers/dashboardTeknisiController.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/teknisi/stats", 
  verifyToken,
  authorizeRoles(["Teknisi", "Admin"]), // Teknisi dan Admin bisa akses
  getTeknisiDashboardStats
);

export default router;
