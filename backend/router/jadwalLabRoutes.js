// routes/jadwalLabRoutes.js
import express from "express";
import { getJadwalLabMingguan } from "../controllers/jadwalLabController.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
    "/",
    verifyToken,
    authorizeRoles(["Admin", "Kepala Lab", "Guru"]),
    getJadwalLabMingguan
);

export default router;
