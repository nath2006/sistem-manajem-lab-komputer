import db from '../config/db.js';

const clean = (value, max) => typeof value === 'string' ? value.replace(/[\x00-\x1f\x7f]/g, '').slice(0, max) : null;

// Install before API routes. Never inspect body, cookies, headers or query strings.
// Writer receives only an allowlist. Inject persistence to keep this module DB-free/testable.
export function createActivityLog({ write, onError = () => console.warn('Activity log persistence failed.') }) {
  let pending = 0;
  return (req, res, next) => {
    const start = Date.now();
    const fallback = clean((req.originalUrl || req.url || '').split('?')[0], 255);
    let recorded = false;
    const record = () => {
      if (recorded) return; recorded = true;
      const identity = req.user || res.locals?.auditUser || {};
      const id = Number(identity.id ?? identity.userId ?? identity.user_id ?? req.user_id);
      const authPath = /^\/api\/auth\/(login|logout|refresh-token)$/.test(fallback || '');
      if ((!Number.isSafeInteger(id) || id < 1) && !authPath) return;
      const routePath = typeof req.route?.path === 'string' ? `${req.baseUrl || ''}${req.route.path}` : null;
      const entry = {
        user_id: Number.isSafeInteger(id) && id > 0 ? id : null,
        username: clean(identity.username, 100), role: clean(identity.role, 50),
        method: clean(req.method, 10),
        // Unmatched URL segments may contain sensitive data: omit them.
        path: clean(routePath || (authPath ? fallback : '/api/[unmatched]'), 255),
        action: authPath ? fallback.split('/').at(-1) : ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? 'read' : 'write',
        status_code: res.statusCode, duration_ms: Math.min(Date.now() - start, 2147483647),
      };
      // Bounded best-effort writes; never delay/fail the user's response.
      if (pending >= 100) { onError(); return; }
      pending++;
      Promise.resolve().then(() => write(entry)).catch(() => { try { onError(); } catch {} }).finally(() => { pending--; });
    };
    res.once('finish', record);
    res.once('close', record);
    next();
  };
}

export function databaseActivityWriter(db) {
  return entry => {
    const keys = ['user_id', 'username', 'role', 'method', 'path', 'action', 'status_code', 'duration_ms'];
    return db.query(`INSERT INTO activity_logs (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, keys.map(key => entry[key]));
  };
}

const activityLog = createActivityLog({ write: databaseActivityWriter(db) });
export default activityLog;
