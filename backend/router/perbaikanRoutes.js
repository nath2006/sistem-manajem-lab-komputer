// routes/perbaikanRoutes.js
import express from "express";
import {
  createPerbaikan,
  deletePerbaikan,
  getAllPerbaikan,
  getPerbaikanById,
  updatePerbaikan
} from "../controllers/perbaikanController.js";

import { 
  verifyToken,
  authorizeRoles
} from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', 
  verifyToken, 
  authorizeRoles(["Admin", "Teknisi"]),
  getAllPerbaikan
);

router.get('/:id',
  verifyToken,
  authorizeRoles(["Admin", "Teknisi"]),
  getPerbaikanById
);

router.post('/create',
  verifyToken,
  authorizeRoles(["Admin", "Teknisi"]),
  createPerbaikan
);

router.put('/update/:id',
  verifyToken,
  authorizeRoles(["Admin", "Teknisi"]),
  updatePerbaikan
);

router.delete('/delete/:id',
  verifyToken,
  authorizeRoles(["Admin", "Teknisi"]),
  deletePerbaikan
);

export default router;
