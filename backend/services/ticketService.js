import {
  fail,
  id,
  text,
  manager,
  terminal,
  sqlDate,
  utc,
} from '../utils/ticketPolicy.js';
export function createTicketService(db, clock = () => new Date()) {
  const query = async (c, s, a = []) => (await c.query(s, a))[0];
  const tx = async (fn) => {
    const c = await db.getConnection();
    try {
      await c.beginTransaction();
      const result = await fn(c);
      await c.commit();
      return result;
    } catch (e) {
      await c.rollback();
      throw e;
    } finally {
      c.release();
    }
  };
  const scope = (u) =>
    manager(u) || u.role === 'Teknisi'
      ? ['1=1', []]
      : u.role === 'Kepala Lab'
        ? ['(t.reporter_id=? OR l.kepala_lab_id=?)', [u.id, u.id]]
        : ['t.reporter_id=?', [u.id]];
  const joins =
    ' FROM service_tickets t LEFT JOIN user r ON r.user_id=t.reporter_id LEFT JOIN user a ON a.user_id=t.assignee_id LEFT JOIN perangkat d ON d.perangkat_id=t.perangkat_id LEFT JOIN laboratorium l ON l.lab_id=d.lab_id';
  const dates = [
    'created_at',
    'updated_at',
    'first_response_at',
    'response_due_at',
    'resolution_due_at',
    'resolved_at',
    'closed_at',
    'cancelled_at',
    'escalated_at',
  ];
  const select =
    'SELECT t.*,r.nama_lengkap reporter_name,a.nama_lengkap assignee_name,d.nama_perangkat,l.nama_lab,' +
    dates.map((k) => `CAST(t.${k} AS CHAR) AS ${k}`).join(',');
  const format = (t) => ({
    ...t,
    ...Object.fromEntries(
      dates.filter((k) => t[k] != null).map((k) => [k, utc(t[k]).toISOString()])
    ),
    ticket_number: `TKT-${String(t.ticket_id).padStart(6, '0')}`,
    response_breached:
      !!t.response_breached ||
      +utc(
        t.first_response_at ||
          (t.status === 'cancelled' ? t.cancelled_at || t.updated_at : clock())
      ) > +utc(t.response_due_at),
    resolution_breached:
      !!t.resolution_breached ||
      +utc(
        t.resolved_at ||
          t.closed_at ||
          (t.status === 'cancelled' ? t.cancelled_at || t.updated_at : clock())
      ) > +utc(t.resolution_due_at),
  });
  const get = async (u, value, c = db, lock = false) => {
    const [s, p] = scope(u);
    const rows = await query(
      c,
      select +
        joins +
        ` WHERE t.ticket_id=? AND ${s}` +
        (lock ? ' FOR UPDATE' : ''),
      [id(value), ...p]
    );
    if (!rows.length) fail(404, 'Ticket not found.');
    return rows[0];
  };
  // Current locking reads, never snapshot/pool reads: deletion and writers must
  // hold the same parent row locks through commit. Sort users to limit deadlocks.
  const lockParents = async (c, users, device = null) => {
    for (const userId of [...new Set(users.filter((v) => v != null).map(id))].sort((a, b) => a - b)) {
      const rows = await query(c, 'SELECT user_id FROM user WHERE user_id=? FOR UPDATE', [userId]);
      if (!rows.length) fail(400, 'User not found.');
    }
    if (device != null) {
      const rows = await query(c, 'SELECT perangkat_id FROM perangkat WHERE perangkat_id=? FOR UPDATE', [id(device)]);
      if (!rows.length) fail(400, 'Device not found.');
    }
  };
  const event = (c, t, u, action, note, to = t.status) =>
    query(
      c,
      'INSERT INTO ticket_events (ticket_id,action,from_status,to_status,note,actor_id,created_at) VALUES (?,?,?,?,?,?,?)',
      [t.ticket_id, action, t.status, to, note, u.id, sqlDate(clock())]
    );
  const update = async (c, t, fields) => {
    const keys = Object.keys(fields);
    await query(
      c,
      `UPDATE service_tickets SET ${keys.map((k) => `${k}=?`).join(',')},version=version+1,updated_at=? WHERE ticket_id=?`,
      [...keys.map((k) => fields[k]), sqlDate(clock()), t.ticket_id]
    );
  };
  return {
    lockParents,
    query,
    tx,
    scope,
    joins,
    select,
    format,
    get,
    event,
    update,
    async action(u, value, b) {
      const note = text(b.note);
      return tx(async (c) => {
        const t = await get(u, value, c, true);
        if (id(b.version) !== Number(t.version))
          fail(409, 'Ticket version conflict.');
        await lockParents(c, [id(u.id), t.reporter_id, t.assignee_id, ...(b.action === 'assign' ? [b.assignee_id ?? u.id] : [])], t.perangkat_id);
        const fields = {};
        const privileged = manager(u),
          worker =
            privileged ||
            (u.role === 'Teknisi' && Number(t.assignee_id) === Number(u.id));
        const requireWorker = () => {
          if (!worker) fail(403, 'Action not permitted.');
        };
        const from = (...states) => {
          if (!states.includes(t.status)) fail(409, 'Invalid transition.');
        };
        switch (b.action) {
          case 'assign': {
            if (terminal(t)) fail(409, 'Ticket completed.');
            const target = id(b.assignee_id ?? u.id);
            if (Number(t.assignee_id) === target)
              fail(409, 'Ticket already assigned to this technician.');
            if (
              !privileged &&
              !(
                u.role === 'Teknisi' &&
                !t.assignee_id &&
                target === Number(u.id)
              )
            )
              fail(403, 'Action not permitted.');
            const users = await query(
              c,
              "SELECT user_id FROM user WHERE user_id=? AND role='Teknisi' FOR UPDATE",
              [target]
            );
            if (!users.length) fail(400, 'Assignee must be a technician.');
            fields.assignee_id = target;
            fields.status = t.status === 'new' ? 'assigned' : t.status;
            fields.first_response_at = t.first_response_at || sqlDate(clock());
            break;
          }
          case 'start':
            requireWorker();
            from('assigned');
            fields.status = 'in_progress';
            break;
          case 'pending':
            requireWorker();
            from('assigned', 'in_progress');
            fields.status = 'pending';
            break;
          case 'resume':
            requireWorker();
            from('pending');
            fields.status = 'in_progress';
            break;
          case 'resolve':
            requireWorker();
            from('in_progress');
            if (t.pengecekan_id) {
              const linked = await query(
                c,
                'SELECT status_pengecekan FROM pengecekan WHERE pengecekan_id=? FOR UPDATE',
                [t.pengecekan_id]
              );
              if (linked[0]?.status_pengecekan !== 'Sudah Ditangani')
                fail(
                  409,
                  'Record a successful repair in the existing repair menu first; linked finding is missing or not yet handled.'
                );
            }
            fields.status = 'resolved';
            fields.resolution = text(b.resolution);
            fields.root_cause = b.root_cause ? text(b.root_cause) : null;
            fields.resolved_at = sqlDate(clock());
            break;
          case 'close':
            from('resolved');
            if (
              !privileged &&
              (Number(t.reporter_id) !== Number(u.id) ||
                Number(t.assignee_id) === Number(u.id))
            )
              fail(403, 'Independent reporter verification required.');
            fields.status = 'closed';
            fields.closed_at = sqlDate(clock());
            break;
          case 'reopen':
            from('resolved', 'closed');
            if (!privileged && Number(t.reporter_id) !== Number(u.id))
              fail(403, 'Action not permitted.');
            fields.status = t.assignee_id ? 'assigned' : 'new';
            fields.resolved_at = null;
            fields.closed_at = null;
            break;
          case 'cancel':
            if (t.status === 'closed' || t.status === 'cancelled')
              fail(409, 'Invalid transition.');
            if (!privileged && Number(t.reporter_id) !== Number(u.id))
              fail(403, 'Action not permitted.');
            fields.status = 'cancelled';
            fields.cancelled_at = sqlDate(clock());
            break;
          case 'escalate':
            if (t.escalated_at) fail(409, 'Ticket already escalated.');
            if (terminal(t)) fail(409, 'Ticket completed.');
            fields.escalated_at = t.escalated_at || sqlDate(clock());
            break;
          case 'comment':
            break;
          default:
            fail(400, 'Invalid action.');
        }
        const current = format(t);
        fields.response_breached = current.response_breached;
        fields.resolution_breached = current.resolution_breached;
        await update(c, t, fields);
        await event(c, t, u, b.action, note, fields.status || t.status);
        return format({ ...t, ...fields, version: Number(t.version) + 1 });
      });
    },
  };
}
