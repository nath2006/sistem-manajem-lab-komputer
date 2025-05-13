import express from 'express';
import {
  createLab,
  getAllLab,
  getLabById,
  updateLab,
  deleteLab
} from '../controllers/labController.js';
import { uploadImage } from '../utils/multer.js';

const router = express.Router();

// GET semua lab
router.get('/', getAllLab);

// GET lab berdasarkan ID
router.get('/:id', getLabById);

// POST buat lab baru (dengan upload gambar)
router.post('/create', uploadImage.single('foto_lab'), createLab);

// PUT update data lab (dengan upload gambar jika ada)
router.put('/update/:id', uploadImage.single('foto_lab'), updateLab);

// DELETE lab berdasarkan ID
router.delete('/delete/:id', deleteLab);

export default router;
