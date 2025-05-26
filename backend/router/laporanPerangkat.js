import express from "express";
import {
  createLaporanPerangkat,
  deleteLaporanPerangkat,
  getAllLaporanPerangkat,
  getDetailLaporanPerangkat
}from "../controllers/laporanPerangkatController.js";
import { 
  verifyToken,
  authorizeRoles
} from '../middleware/authMiddleware.js';
import router from "./deviceRoutes.js";

router.get('/', 
  verifyToken, 
  authorizeRoles(["Admin", "Teknisi"]), 
  getAllLaporanPerangkat
);
router.get('/:id/detail', 
  verifyToken, 
  authorizeRoles(["Admin", "Teknisi"]), 
  getDetailLaporanPerangkat
);

router.post('/create',
  verifyToken,
  authorizeRoles(["Admin", "Teknisi"]),
  createLaporanPerangkat
);

router.delete('/delete/:id',
  verifyToken,
  authorizeRoles(["Admin", "Teknisi"]),
  deleteLaporanPerangkat
);

export default router;
