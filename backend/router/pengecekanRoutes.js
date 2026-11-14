import express from "express";
import {
  createPengecekan,
  deletePengecekan,
  getAllPengecekan,
  getPengecekanById,
  updatePengecekan
} from "../controllers/pengecekanController.js"
import { 
  verifyToken,
  authorizeRoles
} from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', 
  verifyToken, 
  authorizeRoles(["Admin", "Teknisi"]),
  getAllPengecekan
);

router.get('/:id',
  verifyToken,
  authorizeRoles(["Admin", "Teknisi"]),
getPengecekanById
);

router.post('/create',
  verifyToken,
  authorizeRoles(["Admin", "Teknisi"]),
  createPengecekan
);

router.put('/update/:id',
  verifyToken,
  authorizeRoles(["Admin", "Teknisi"]),
  updatePengecekan
);

router.delete('/delete/:id',
  verifyToken,
  authorizeRoles(["Admin", "Teknisi"]),
  deletePengecekan
);

export default router;
