import { randomUUID } from 'node:crypto';

export const HEARTBEAT_INTERVAL_MS = 15000;
export const LEASE_TIMEOUT_MS = 45000;

// Process-local only: a restart starts offline; multiple workers require a shared broker.
export function createPresenceRegistry({ now = Date.now, schedule = setInterval, cancel = clearInterval,
  maxConnections = 2000, maxPerUser = 10 } = {}) {
  const connections = new Map();
  let revision = 0;
  let broadcasting = false;
  let pending = false;
  const live = c => now() < c.expiresAt && now() - c.lastAck < LEASE_TIMEOUT_MS;
  const ids = () => [...new Set([...connections.values()].filter(live).map(c => c.userId))].sort((a,b) => a-b);
  const snapshot = () => ({ online_user_ids: ids(), revision });
  function broadcast() {
    if (broadcasting) { pending = true; return; }
    broadcasting = true;
    do {
      pending = false;
      const data = snapshot();
      for (const [id,c] of [...connections]) {
        if (!connections.has(id)) continue;
        try { if (c.send('presence', data) === false) disconnect(id); }
        catch { disconnect(id); }
      }
    } while (pending);
    broadcasting = false;
  }
  function disconnect(id) {
    const c = connections.get(id);
    if (!c) return;
    connections.delete(id);
    try { c.close(); } catch { /* socket already closed */ }
    revision++;
    broadcast();
  }
  function sweep() {
    for (const [id,c] of [...connections]) {
      if (!live(c)) disconnect(id);
      else {
        try { if (c.send('ping', {}) === false) disconnect(id); }
        catch { disconnect(id); }
      }
    }
  }
  const timer = schedule(sweep, HEARTBEAT_INTERVAL_MS);
  timer?.unref?.();
  return {
    snapshot,
    isOnline(userId) { return ids().includes(Number(userId)); },
    connect({ userId, expiresAt, send, close }) {
      if (!Number.isSafeInteger(userId) || userId <= 0 || !Number.isFinite(expiresAt) || expiresAt <= now())
        throw Object.assign(new Error('Invalid presence identity'), { status: 401 });
      if (connections.size >= maxConnections || [...connections.values()].filter(c => c.userId === userId).length >= maxPerUser)
        throw Object.assign(new Error('Presence connection limit reached'), { status: 429 });
      const id = randomUUID();
      connections.set(id, { userId, expiresAt, lastAck: now(), send, close });
      try {
        if (send('connected', { connection_id: id, heartbeat_interval_ms: HEARTBEAT_INTERVAL_MS,
          lease_timeout_ms: LEASE_TIMEOUT_MS }) === false) { disconnect(id); return id; }
      } catch { disconnect(id); return id; }
      revision++;
      broadcast();
      return id;
    },
    heartbeat(id, userId) {
      const c = connections.get(id);
      if (!c || c.userId !== userId) return false;
      if (!live(c)) { disconnect(id); return false; }
      c.lastAck = now();
      return true;
    },
    disconnect,
    disconnectUser(userId) {
      for (const [id,c] of [...connections]) if (c.userId === userId) disconnect(id);
    },
    sweep,
    dispose() { cancel(timer); for (const id of [...connections.keys()]) disconnect(id); },
  };
}
export const presenceRegistry = createPresenceRegistry();
