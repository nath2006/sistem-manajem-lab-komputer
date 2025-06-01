import express from "express";
import {
  createPemeriksaan,
  deletePemeriksaan,
  getAllPemeriksaan,
  getPemeriksaanById,
  updatePemeriksaan
} from "../controllers/pemeriksaanController.js"
import { 
  verifyToken,
  authorizeRoles
} from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verifyToken, getAllPemeriksaan);

router.get('/:id',verifyToken, getPemeriksaanById);

router.post('/create', 
  verifyToken, 
  authorizeRoles(["Admin", "Kepala Lab"]),
  createPemeriksaan
);

router.put('/update/:id',
  verifyToken,
  authorizeRoles(["Admin", "Kepala Lab"]),
  updatePemeriksaan
);

router.delete('/delete/:id', 
  verifyToken,
  authorizeRoles(["Admin", "Kepala Lab"]),
  deletePemeriksaan
);


export default router;
