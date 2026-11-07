import { createTicketService } from '../services/ticketService.js';
import { createTicketWorkflowService } from '../services/ticketWorkflowService.js';
import {
  TYPES,
  CATEGORIES,
  STATUSES,
  manager,
  fail,
  choice,
  utc,
} from '../utils/ticketPolicy.js';
// Dependency injection deliberately avoids importing the configured DB in unit tests.
export function createTicketController(db, clock = () => new Date()) {
  const s = createTicketService(db, clock),
    { query, get, format } = s;
  const guard = (fn) => async (req, res) => {
    try {
      if (!req.user?.id) fail(401, 'Authentication required.');
      await fn(req, res);
    } catch (e) {
      const missing = e.code === 'ER_NO_SUCH_TABLE';
      res
        .status(missing ? 503 : e.status || 500)
        .json({
          message: missing
            ? 'Ticket migration required.'
            : e.status
              ? e.message
              : 'Ticket operation failed.',
        });
    }
  };
  const workflows = createTicketWorkflowService(s, db, clock);
  return {
    options: guard(async (req, res) => {
      const ps = await workflows.policies(db);
      const technicians =
        manager(req.user) || req.user.role === 'Teknisi'
          ? await query(
              db,
              "SELECT user_id,nama_lengkap FROM user WHERE role='Teknisi' ORDER BY nama_lengkap"
            )
          : [];
      const devices = await query(
        db,
        'SELECT d.perangkat_id,d.nama_perangkat,l.nama_lab FROM perangkat d LEFT JOIN laboratorium l ON l.lab_id=d.lab_id ORDER BY d.nama_perangkat'
      );
      res.json({
        data: {
          technicians,
          devices,
          policies: ps,
          types: TYPES,
          categories: CATEGORIES,
        },
      });
    }),
    create: guard(async (req, res) => {
      const t = await workflows.create(req.user, req.body || {});
      res.status(201).json({ data: t, message: 'Ticket created.' });
    }),
    detail: guard(async (req, res) => {
      const t = await get(req.user, req.params.id);
      const events = await query(
        db,
        'SELECT e.event_id,e.action,e.from_status,e.to_status,e.note,u.nama_lengkap actor_name,CAST(e.created_at AS CHAR) created_at FROM ticket_events e LEFT JOIN user u ON u.user_id=e.actor_id WHERE e.ticket_id=? ORDER BY e.event_id',
        [t.ticket_id]
      );
      res.json({
        data: {
          ...format(t),
          events: events.map((e) => ({
            ...e,
            created_at: utc(e.created_at).toISOString(),
          })),
        },
      });
    }),
    list: guard(async (req, res) => {
      const q = req.query || {};
      if (q.status) choice(q.status, STATUSES);
      if (q.priority) choice(q.priority, ['P1', 'P2', 'P3', 'P4']);
      const integer = (v, d, max) =>
        v == null
          ? d
          : Math.min(
              max,
              Math.max(
                1,
                Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : d
              )
            );
      const page = integer(q.page, 1, 1000000),
        limit = integer(q.limit, 20, 100);
      const [scope, args] = s.scope(req.user);
      let where = scope;
      const values = [...args];
      if (q.status) {
        where += ' AND t.status=?';
        values.push(q.status);
      }
      if (q.priority) {
        where += ' AND t.priority=?';
        values.push(q.priority);
      }
      if (q.q) {
        where +=
          " AND (t.title LIKE ? OR t.description LIKE ? OR CONCAT('TKT-',LPAD(t.ticket_id,6,'0')) LIKE ?)";
        const search = '%' + String(q.q).slice(0, 200) + '%';
        values.push(search, search, search);
      }
      const count = (
        await query(
          db,
          'SELECT COUNT(*) total' + s.joins + ' WHERE ' + where,
          values
        )
      )[0];
      const rows = await query(
        db,
        s.select +
          s.joins +
          ' WHERE ' +
          where +
          ' ORDER BY t.ticket_id DESC LIMIT ? OFFSET ?',
        [...values, limit, (page - 1) * limit]
      );
      const summary = (
        await query(
          db,
          `SELECT COUNT(*) total,COALESCE(SUM(t.status NOT IN ('resolved','closed','cancelled')),0) open,COALESCE(SUM(t.status='resolved'),0) awaiting_verification,COALESCE(SUM(t.escalated_at IS NOT NULL),0) escalated,COALESCE(SUM(t.response_breached=1 OR t.resolution_breached=1 OR COALESCE(t.first_response_at,IF(t.status='cancelled',COALESCE(t.cancelled_at,t.updated_at),UTC_TIMESTAMP(3)))>t.response_due_at OR COALESCE(t.resolved_at,t.closed_at,IF(t.status='cancelled',COALESCE(t.cancelled_at,t.updated_at),UTC_TIMESTAMP(3)))>t.resolution_due_at),0) overdue` +
            s.joins +
            ' WHERE ' +
            scope,
          args
        )
      )[0];
      res.json({
        data: rows.map(format),
        pagination: {
          page,
          limit,
          total: Number(count.total),
          pages: Math.ceil(Number(count.total) / limit),
        },
        summary: Object.fromEntries(
          Object.entries(summary).map(([k, v]) => [k, Number(v)])
        ),
      });
    }),
    action: guard(async (req, res) => {
      const t = await s.action(req.user, req.params.id, req.body || {});
      res.json({
        data: format(await get(req.user, t.ticket_id)),
        message: 'Ticket action recorded.',
      });
    }),
    reclassify: guard(async (req, res) => {
      const t = await workflows.reclassify(req.user, req.params.id, req.body || {});
      res.json({
        data: format(t),
        message:
          'Classification updated; current policy snapshot anchored to original creation.',
      });
    }),
    policies: guard(async (req, res) => {
      const ps = await workflows.updatePolicies(req.user, req.body || {});
      res.json({
        data: ps,
        message: 'SLA policy updated for future tickets only.',
      });
    }),
    importMaintenance: guard(async (req, res) => {
      const imported = await workflows.importMaintenance(req.user);
      res.json({
        data: { imported },
        message:
          'Active findings imported; legacy equipment and inspection states unchanged.',
      });
    }),
  };
}
