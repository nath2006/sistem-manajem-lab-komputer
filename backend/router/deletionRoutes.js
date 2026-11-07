import express from 'express';
import db from '../config/db.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
  createDeletionService,
  sendDeletionError,
} from '../services/deletionService.js';
export function createDeletionRouter({
  service = createDeletionService({ db }),
  authenticate = verifyToken,
} = {}) {
  const router = express.Router();
  router.get('/:resource/:id', authenticate, async (req, res) => {
    try {
      res.json({
        data: await service.preview(
          req.params.resource,
          req.params.id,
          req.user
        ),
      });
    } catch (error) {
      sendDeletionError(res, error);
    }
  });
  return router;
}
export default createDeletionRouter();
