import { createTicketService } from './ticketService.js';

export const DASHBOARD_ROLES = ['Admin', 'Koordinator Lab', 'Kepala Lab', 'Teknisi', 'Guru'];
const normalize = rows => rows.map(row => ({ label: row.label || 'Lainnya', count: Number(row.count) }));

/** Read-only aggregation. Reuse the exact ticket-list visibility policy and joins. */
export function createDashboardInsightsService(db) {
  const tickets = createTicketService(db);
  return {
    async get(actor) {
      if (!DASHBOARD_ROLES.includes(actor?.role) || !Number.isSafeInteger(Number(actor?.id)) || Number(actor.id) <= 0) {
        throw Object.assign(new Error('Akses dashboard ditolak.'), { status: 403 });
      }
      const [columns] = await db.query("SELECT TABLE_NAME,COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('perangkat','service_tickets')");
      const has = (table, column) => columns.some(c => c.TABLE_NAME === table && c.COLUMN_NAME === column);
      const [scope, params] = tickets.scope(actor);
      const ticketAvailable = ['ticket_id','status','reporter_id','assignee_id','perangkat_id'].every(key => has('service_tickets', key));
      let ticketRows = [];
      if (ticketAvailable) [ticketRows] = await db.query('SELECT COALESCE(NULLIF(TRIM(t.status),\'\'),\'Lainnya\') AS label, COUNT(*) AS count' + tickets.joins + ` WHERE ${scope} GROUP BY label ORDER BY label`, params);
      let assets = null;
      if (actor.role !== 'Guru') {
        const category = has('perangkat', 'kategori') ? "COALESCE(NULLIF(TRIM(kategori),''),'Lainnya')" : "'Lainnya'";
        const condition = has('perangkat', 'status') ? "COALESCE(NULLIF(TRIM(status),''),'Lainnya')" : "'Lainnya'";
        const [[categories], [conditions]] = await Promise.all([
          db.query(`SELECT ${category} AS label,COUNT(*) AS count FROM perangkat GROUP BY label ORDER BY label`),
          db.query(`SELECT ${condition} AS label,COUNT(*) AS count FROM perangkat GROUP BY label ORDER BY label`),
        ]);
        assets = { categories: normalize(categories), conditions: normalize(conditions) };
      }
      return { tickets: { available: ticketAvailable, rows: normalize(ticketRows), ...(!ticketAvailable ? { reason: 'Skema ticketing belum tersedia.' } : {}) }, assets };
    },
  };
}
