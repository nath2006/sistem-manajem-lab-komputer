import express from 'express';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { DASHBOARD_ROLES } from '../services/dashboardInsightsService.js';
import { createDashboardInsightsController } from '../controllers/dashboardInsightsController.js';
export function createDashboardInsightsRouter(db) {
  const router = express.Router();
  router.get('/insights', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); }, verifyToken, authorizeRoles(DASHBOARD_ROLES), createDashboardInsightsController(db));
  return router;
}
