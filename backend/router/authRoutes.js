import express from 'express';
import {
  login,
  logout,
  refreshToken,
} from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post("/login", login);
router.post("/logout", verifyToken, logout);
router.post("/refresh-token", refreshToken);

export default router;
