import express from 'express';
import db from '../config/db.js';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { createActivityLogController } from '../controllers/activityLogController.js';

export function createActivityLogRouter({ db: database = db, authenticate = verifyToken } = {}) {
  const router = express.Router();
  router.use(authenticate, authorizeRoles(['Admin']));
  router.get('/', createActivityLogController(database));
  router.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    return res.status(500).json({ message: 'Gagal mengambil log aktivitas.' });
  });
  return router;
}
export default createActivityLogRouter();
