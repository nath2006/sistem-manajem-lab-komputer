import {
  TYPES,
  CATEGORIES,
  LEVELS,
  manager,
  terminal,
  fail,
  id,
  text,
  choice,
  priorityFor,
  deadlines,
  sqlDate,
} from '../utils/ticketPolicy.js';
// Business workflows share the injected SQL/transaction boundary with ticket actions.
export function createTicketWorkflowService(base, db, clock = () => new Date()) {
  const { query, tx, get, format, event, update, lockParents } = base;
  const policies = (c) =>
    query(
      c,
      'SELECT priority,response_minutes,resolution_minutes FROM ticket_sla_policies ORDER BY priority'
    );
  const classify = (b) => ({
    type: choice(b.type, TYPES),
    category: choice(b.category, CATEGORIES),
    impact: choice(b.impact, LEVELS),
    urgency: choice(b.urgency, LEVELS),
  });
  const snapshot = async (c, b, created, loadPolicies = () => policies(c)) => {
    const priority = priorityFor(b.impact, b.urgency),
      p = (await loadPolicies()).find((p) => p.priority === priority);
    if (!p) fail(503, 'Ticket SLA policies unavailable.');
    return {
      priority,
      response_minutes: p.response_minutes,
      resolution_minutes: p.resolution_minutes,
      ...deadlines(created, p),
    };
  };
  const insert = async (
    c,
    u,
    b,
    created = sqlDate(clock()),
    source = null,
    actor = u,
    loadPolicies
  ) => {
    const fields = {
      title: text(b.title, 200),
      description: text(b.description),
      ...classify(b),
      reporter_id: id(u.id),
      perangkat_id: b.perangkat_id == null ? null : id(b.perangkat_id),
      pengecekan_id: source,
      status: 'new',
      version: 1,
      created_at: created,
      updated_at: sqlDate(clock()),
      ...(await snapshot(c, b, created, loadPolicies)),
    };
    await lockParents(c, [id(u.id), id(actor.id)], fields.perangkat_id);
    const keys = Object.keys(fields);
    const r = await query(
      c,
      `INSERT INTO service_tickets (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`,
      Object.values(fields)
    );
    const t = { ...fields, ticket_id: r.insertId };
    await event(
      c,
      { ...t, status: null },
      actor,
      source ? 'imported' : 'created',
      source ? 'Imported active maintenance finding.' : 'Ticket reported.',
      'new'
    );
    return t;
  };
  return {
    policies,
    async create(u, b) {
      text(b.title, 200);
      text(b.description);
      classify(b);
      if (b.perangkat_id != null) id(b.perangkat_id);
      return tx(async (c) => {
        const t = await insert(c, u, b);
        return format(await get(u, t.ticket_id, c));
      });
    },
    async reclassify(u, value, b) {
      if (!manager(u)) fail(403, 'Action not permitted.');
      const note = text(b.note),
        fields = classify(b);
      return tx(async (c) => {
        const t = await get(u, value, c, true);
        if (id(b.version) !== Number(t.version))
          fail(409, 'Ticket version conflict.');
        if (terminal(t)) fail(409, 'Ticket completed.');
        await lockParents(c, [id(u.id), t.reporter_id, t.assignee_id], t.perangkat_id);
        const before = format(t);
        Object.assign(fields, await snapshot(c, b, t.created_at));
        const after = format({ ...t, ...fields });
        fields.response_breached =
          before.response_breached || after.response_breached;
        fields.resolution_breached =
          before.resolution_breached || after.resolution_breached;
        await update(c, t, fields);
        await event(c, t, u, 'classified', note);
        return get(u, t.ticket_id, c);
      });
    },
    async updatePolicies(u, b) {
      if (u.role !== 'Admin') fail(403, 'Action not permitted.');
      const note = text(b.note);
      if (!Array.isArray(b.policies) || b.policies.length !== 4)
        fail(400, 'Four policies required.');
      const seen = new Set();
      for (const p of b.policies) {
        if (!p || typeof p !== 'object') fail(400, 'Invalid SLA policy.');
        choice(p.priority, ['P1', 'P2', 'P3', 'P4']);
        if (
          seen.has(p.priority) ||
          !Number.isSafeInteger(p.response_minutes) ||
          !Number.isSafeInteger(p.resolution_minutes) ||
          p.response_minutes <= 0 ||
          p.response_minutes > p.resolution_minutes
        )
          fail(400, 'Invalid SLA policy.');
        deadlines(clock(), p);
        seen.add(p.priority);
      }
      await tx(async (c) => {
        await lockParents(c, [id(u.id)]);
        await query(
          c,
          'SELECT priority FROM ticket_sla_policies ORDER BY priority FOR UPDATE'
        );
        for (const p of b.policies) {
          await query(
            c,
            'UPDATE ticket_sla_policies SET response_minutes=?,resolution_minutes=? WHERE priority=?',
            [p.response_minutes, p.resolution_minutes, p.priority]
          );
        }
        await query(
          c,
          'INSERT INTO ticket_policy_events (actor_id,note,policies_json,created_at) VALUES (?,?,?,?)',
          [id(u.id), note, JSON.stringify(b.policies), sqlDate(clock())]
        );
      });
      return policies(db);
    },
    async importMaintenance(u) {
      if (!manager(u) && u.role !== 'Teknisi')
        fail(403, 'Action not permitted.');
      return tx(async (c) => {
        // Serialize on source rows, not on a legacy status mutation.
        await query(c, 'SELECT ticket_id FROM service_tickets LIMIT 0');
        const sources = await query(
          c,
          "SELECT pc.pengecekan_id,pc.user_id,pc.perangkat_id,CAST(pc.tanggal_pengecekan AS CHAR) tanggal_pengecekan,pc.ditemukan_kerusakan FROM pengecekan pc WHERE pc.status_pengecekan IN ('Baru','Menunggu Perbaikan') ORDER BY pc.pengecekan_id FOR UPDATE"
        );
        // Lock the complete user set once in numeric order for the batch.
        await lockParents(c, [id(u.id), ...sources.map((pc) => pc.user_id)]);
        let n = 0;
        let importPolicies;
        const loadImportPolicies = () => (importPolicies ??= policies(c));
        for (const pc of sources) {
          const old = await query(
            c,
            'SELECT ticket_id FROM service_tickets WHERE pengecekan_id=? FOR UPDATE',
            [pc.pengecekan_id]
          );
          if (old.length) continue;
          await insert(
            c,
            { id: pc.user_id },
            {
              title: ('Maintenance finding #' + pc.pengecekan_id).slice(0, 200),
              description: pc.ditemukan_kerusakan || 'Maintenance finding',
              type: 'incident',
              category: 'hardware',
              impact: 'medium',
              urgency: 'medium',
              perangkat_id: pc.perangkat_id,
            },
            sqlDate(pc.tanggal_pengecekan),
            pc.pengecekan_id,
            u,
            loadImportPolicies
          );
          n++;
        }
        return n;
      });
    },
  };
}
