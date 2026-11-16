import express from 'express';
import { createOnboardingController } from '../controllers/onboardingController.js';
export function createOnboardingRouter(db, authenticate) {
  const router = express.Router();
  const controller = createOnboardingController(db);
  const noCache = (req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); };
  router.get('/', noCache, authenticate, controller.get);
  router.post('/claim', noCache, authenticate, controller.claim);
  return router;
}
