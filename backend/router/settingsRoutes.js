import express from 'express';
import { parseLogoUpload } from '../services/logoUpload.js';
import db from '../config/db.js';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { createSettingsController } from '../controllers/settingsController.js';

export function createSettingsRouter({ db: database = db, authenticate = verifyToken, logoDirectory } = {}) {
  const router = express.Router();
  const controller = createSettingsController(database, { logoDirectory });
  router.get('/public', controller.get);
  router.use(authenticate, authorizeRoles(['Admin']));
  router.get('/', controller.get);
  router.put('/', parseLogoUpload, controller.update);
  router.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const badRequest = error.status === 400 || error.name === 'MulterError';
    return res.status(badRequest ? 400 : 500).json({ message: badRequest ? (error.name === 'MulterError' ? 'Unggah satu logo gambar, maksimal 2 MB.' : error.message) : 'Gagal memproses pengaturan.' });
  });
  return router;
}
export default createSettingsRouter();
