const UNKNOWN = { connected: false, ready: false, onlineUserIds: [] };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Fetch rather than EventSource: credentials belong only in the Authorization header.
export function startPresence({ token, baseURL, onState, fetchImpl = globalThis.fetch, eventTarget = globalThis.window, online = () => globalThis.navigator?.onLine !== false }) {
  const base = (baseURL || 'api').replace(/\/+$/, '');
  let stopped = false, suspended = false, terminal = false, attempt = 0, timer, current;
  const publishUnknown = () => onState({ ...UNKNOWN });
  function cancel() {
    clearTimeout(timer);
    if (current) {
      clearTimeout(current.watchdog);
      current.controller.abort();
      current.reader?.cancel().catch(() => {});
      current = null;
    }
  }
  function retry() {
    if (stopped || suspended || terminal || !online()) return;
    timer = setTimeout(connect, Math.min(30000, 1000 * 2 ** Math.min(attempt++, 5)));
  }
  async function connect() {
    cancel();
    if (stopped) return;
    publishUnknown();
    if (suspended || terminal || !online()) return;
    const session = { controller: new AbortController(), reader: null };
    current = session;
    const active = () => current === session && !stopped && !suspended;
    const touch = () => {
      clearTimeout(session.watchdog);
      session.watchdog = setTimeout(() => {
        if (active()) { cancel(); publishUnknown(); retry(); }
      }, 45000);
    };
    touch();
    const headers = { Authorization: `Bearer ${token}` };
    let connectionId, revision = -1, ready = false, ids = [], ackPending = false;
    const ack = async () => {
      if (!active() || !connectionId || ackPending) return;
      ackPending = true;
      try {
        const response = await fetchImpl(`${base}/presence/heartbeat`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ connection_id: connectionId }), signal: session.controller.signal, cache: 'no-store', credentials: 'omit' });
        if (!active()) return;
        if (response.status === 401 || response.status === 403) terminal = true;
        if (!response.ok) { cancel(); publishUnknown(); retry(); }
      } catch {
        if (active()) { cancel(); publishUnknown(); retry(); }
      } finally { ackPending = false; }
    };
    try {
      const response = await fetchImpl(`${base}/presence/stream`, { headers: { ...headers, Accept: 'text/event-stream' }, signal: session.controller.signal, cache: 'no-store', credentials: 'omit' });
      if (!active()) { response.body?.cancel().catch(() => {}); return; }
      if (response.status === 401 || response.status === 403) terminal = true;
      if (!response.ok || !response.body || !response.headers.get('content-type')?.includes('text/event-stream')) throw new Error('Presence unavailable');
      session.reader = response.body.getReader();
      let buffer = '', event = '', data = [], frameSize = 0;
      const dispatch = () => {
        if (!active() || !data.length) return;
        let payload;
        try { payload = JSON.parse(data.join('\n')); } catch { return; }
        if (event === 'connected' && UUID.test(payload?.connection_id) && payload.heartbeat_interval_ms === 15000 && payload.lease_timeout_ms === 45000) {
          touch();
          connectionId = payload.connection_id;
          onState({ connected: true, ready: false, onlineUserIds: [] });
          void ack();
        } else if (event === 'presence' && connectionId && Number.isSafeInteger(payload?.revision) && payload.revision >= 0 && payload.revision >= revision && Array.isArray(payload.online_user_ids) && payload.online_user_ids.every(id => Number.isSafeInteger(id) && id > 0)) {
          touch();
          revision = payload.revision; ids = [...new Set(payload.online_user_ids)]; ready = true; attempt = 0;
          onState({ connected: true, ready, onlineUserIds: ids });
        } else if (event === 'ping' && connectionId) { touch(); void ack(); }
      };
      const decoder = new TextDecoder();
      while (active()) {
        const { value, done } = await session.reader.read();
        if (!active() || done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline;
        while ((newline = buffer.indexOf('\n')) >= 0) {
          let line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          frameSize += line.length;
          if (frameSize > 262144) throw new Error('Presence frame too large');
          if (!line) { dispatch(); event = ''; data = []; frameSize = 0; }
          else if (!line.startsWith(':')) {
            const colon = line.indexOf(':');
            const field = colon < 0 ? line : line.slice(0, colon);
            let value = colon < 0 ? '' : line.slice(colon + 1);
            if (value.startsWith(' ')) value = value.slice(1);
            if (field === 'event') event = value;
            if (field === 'data') data.push(value);
          }
        }
        if (buffer.length + frameSize > 262144) throw new Error('Presence buffer too large');
      }
    } catch { /* Network/protocol failures are unknown, never an offline snapshot. */ }
    finally {
      if (active()) { cancel(); publishUnknown(); retry(); }
    }
  }
  const pause = () => { suspended = true; cancel(); publishUnknown(); };
  const resume = () => { if (stopped || terminal || suspended) return; attempt = 0; connect(); };
  const offline = () => { cancel(); publishUnknown(); };
  const pageshow = event => { if (event.persisted) { suspended = false; resume(); } };
  eventTarget?.addEventListener('pagehide', pause);
  eventTarget?.addEventListener('pageshow', pageshow);
  eventTarget?.addEventListener('offline', offline);
  eventTarget?.addEventListener('online', resume);
  publishUnknown(); connect();
  return () => {
    stopped = true; cancel();
    eventTarget?.removeEventListener('pagehide', pause);
    eventTarget?.removeEventListener('pageshow', pageshow);
    eventTarget?.removeEventListener('offline', offline);
    eventTarget?.removeEventListener('online', resume);
  };
}
