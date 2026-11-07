import { Router } from 'express';
import { createTicketController } from '../controllers/ticketController.js';
export function createTicketRouter(db, verifyToken) {
  const router = Router(),
    c = createTicketController(db);
  router.use(verifyToken);
  router.get('/options', c.options);
  router.put('/policies', c.policies);
  router.post('/import-maintenance', c.importMaintenance);
  router.get('/', c.list);
  router.post('/', c.create);
  router.post('/:id/actions', c.action);
  router.put('/:id', c.reclassify);
  router.get('/:id', c.detail);
  return router;
}
