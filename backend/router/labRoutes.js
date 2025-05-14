import express from 'express';
import {
  createLab,
  getAllLab,
  getLabById,
  updateLab,
  deleteLab
} from '../controllers/labController.js';
import { 
  verifyToken,
  authorizeRoles
} from '../middleware/authMiddleware.js';
import { uploadImage } from '../utils/multer.js';

const router = express.Router();

// GET semua lab
router.get('/', verifyToken, getAllLab);

// GET lab berdasarkan ID
router.get('/:id',verifyToken,  getLabById);

// POST buat lab baru (dengan upload gambar)
router.post('/create', 
  verifyToken, 
  authorizeRoles(["Admin","Kepala Lab"]),
  uploadImage.single('foto_lab'), 
  createLab
);

// PUT update data lab (dengan upload gambar jika ada)
router.put('/update/:id', 
  verifyToken, 
  authorizeRoles(["Admin","Kepala Lab"]),
  uploadImage.single('foto_lab'), updateLab
);

// DELETE lab berdasarkan ID
router.delete('/delete/:id', 
  verifyToken,
  authorizeRoles(["Admin","Kepala Lab"]),
  deleteLab
);

export default router;
