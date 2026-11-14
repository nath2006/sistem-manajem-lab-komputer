import express from 'express';

import {
  getDashboardStats,
  getLabsWithHeads,
  getUsersWithRoles
} from '../controllers/dashboardController.js'

import { 
  verifyToken,
  authorizeRoles
} from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/admin/stats',
  verifyToken,
  authorizeRoles(['Admin']),
  getDashboardStats
);

router.get('/admin/labs-with-heads',
  verifyToken,
  authorizeRoles(['Admin']),
  getLabsWithHeads
);

router.get('/admin/users-with-roles',
  verifyToken,
  authorizeRoles(['Admin']),
  getUsersWithRoles
);

export default router;
