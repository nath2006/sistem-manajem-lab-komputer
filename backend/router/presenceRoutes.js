import express from 'express';
import { presenceRegistry } from '../services/presenceRegistry.js';

export function createPresenceRouter(db, verifyToken, { registry = presenceRegistry, now = Date.now } = {}) {
  const router = express.Router();
  router.use((req,res,next) => {
    if (!/^Bearer \S+$/.test(req.headers.authorization || '') || Object.keys(req.query).length)
      return res.status(401).json({ message: 'Use Bearer Authorization header only' });
    next();
  }, verifyToken);
  router.use(async (req,res,next) => {
    try {
      const { id, exp } = req.user || {};
      if (!Number.isSafeInteger(id) || id <= 0 || !Number.isFinite(exp) || exp * 1000 <= now())
        return res.status(401).json({ message: 'Invalid presence identity' });
      const [rows] = await db.query('SELECT user_id, role FROM user WHERE user_id = ? LIMIT 1', [id]);
      // A changed role invalidates a stale token; always consult current database identity.
      if (!rows.length || (req.user.role && rows[0].role !== req.user.role)) {
        registry.disconnectUser(id);
        return res.status(403).json({ message: 'User no longer authorized' });
      }
      if (exp * 1000 <= now()) return res.status(401).json({ message: 'Token expired' });
      req.presenceUser = rows[0];
      next();
    } catch (err) { next(err); }
  });
  router.get('/stream', (req,res,next) => {
    let connectionId;
    const cleanup = () => { if (connectionId) registry.disconnect(connectionId); };
    res.once('close', cleanup);
    try {
      connectionId = registry.connect({
        userId: req.user.id, expiresAt: req.user.exp * 1000,
        send(event, data) {
          if (res.destroyed || res.writableEnded) return false;
          if (!res.headersSent) {
            res.set({ 'Content-Type':'text/event-stream', 'Cache-Control':'private, no-store',
              'Connection':'keep-alive', 'X-Accel-Buffering':'no' });
            res.flushHeaders();
          }
          // Disconnect slow readers instead of accumulating an unbounded queue.
          return res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        },
        close() { res.off('close', cleanup); res.end(); },
      });
      if (res.destroyed || res.writableEnded) cleanup();
    } catch (err) { res.off('close',cleanup); next(err); }
  });
  router.post('/heartbeat', (req,res) => {
    const body = req.body;
    if (!body || Array.isArray(body) || Object.keys(body).length !== 1 ||
        typeof body.connection_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(body.connection_id))
      return res.status(400).json({ message:'Expected only connection_id' });
    if (!registry.heartbeat(body.connection_id, req.user.id))
      return res.status(409).json({ code:'PRESENCE_LEASE_UNAVAILABLE', message:'Presence connection unavailable; reconnect' });
    res.status(204).end();
  });
  // Do not fall through to the audited API middleware, even for unsupported routes.
  router.use((req,res) => res.status(404).json({ message:'Presence route not found' }));
  router.use((err,req,res,next) => {
    if (res.headersSent) { res.end(); return; }
    res.status(err.status || 500).json({ message: err.status ? err.message : 'Presence unavailable' });
  });
  return router;
}
