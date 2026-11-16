export function createActivityLogController(db) {
  return async (req, res, next) => {
    try {
      const pageText = req.query.page ?? '1';
      const limitText = req.query.limit ?? '20';
      if (typeof pageText !== 'string' || typeof limitText !== 'string' || !/^[1-9]\d{0,6}$/.test(pageText) || !/^[1-9]\d{0,2}$/.test(limitText) || Number(limitText) > 100) {
        return res.status(400).json({ message: 'page harus positif; limit 1–100.' });
      }
      const { actor, category, date, facets } = req.query;
      const categories = ['login', 'logout', 'refresh-token', 'create', 'update', 'delete', 'read', 'other'];
      const day = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00+07:00`) : null;
      const validDay = day && Number.isFinite(day.getTime()) && new Date(day.getTime() + 25200000).toISOString().slice(0, 10) === date;
      if ((actor !== undefined && (typeof actor !== 'string' || !/^[1-9]\d{0,14}$/.test(actor))) || (category !== undefined && !categories.includes(category)) || (date !== undefined && !validDay) || (facets !== undefined && facets !== '1')) return res.status(400).json({ message: 'Filter tidak valid. Tanggal harus YYYY-MM-DD (WIB).' });
      const page = Number(pageText), limit = Number(limitText), clauses = [], args = [];
      if (actor !== undefined) { clauses.push('user_id = ?'); args.push(Number(actor)); }
      if (category !== undefined) { clauses.push(`(CASE WHEN action IN ('login','logout','refresh-token') THEN action WHEN method = 'DELETE' THEN 'delete' WHEN method = 'POST' AND (path LIKE '%/approve' OR path LIKE '%/reject' OR path LIKE '%/actions') THEN 'update' WHEN method = 'POST' THEN 'create' WHEN method IN ('PUT','PATCH') THEN 'update' WHEN method IN ('GET','HEAD','OPTIONS') THEN 'read' ELSE 'other' END) = ?`); args.push(category); }
      // TIMESTAMP uses the session timezone; epoch boundaries remain correct in every session.
      if (date !== undefined) { clauses.push('created_at >= FROM_UNIXTIME(?) AND created_at < FROM_UNIXTIME(?)'); args.push(day.getTime() / 1000, day.getTime() / 1000 + 86400); }
      const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
      const [[count]] = await db.query(`SELECT COUNT(*) AS total FROM activity_logs${where}`, args);
      const [data] = await db.query(`SELECT id, user_id, username, role, method, path, action, status_code, duration_ms, created_at FROM activity_logs${where} ORDER BY id DESC LIMIT ? OFFSET ?`, [...args, limit, (page - 1) * limit]);
      const result = { data, pagination: { page, limit, total: Number(count.total), total_pages: Math.ceil(Number(count.total) / limit) } };
      if (facets === '1') {
        const [actors] = await db.query('SELECT user_id, MAX(username) AS username FROM activity_logs WHERE user_id IS NOT NULL GROUP BY user_id ORDER BY username, user_id');
        result.facets = { actors };
      }
      return res.json(result);
    } catch (error) { return next(error); }
  };
}
