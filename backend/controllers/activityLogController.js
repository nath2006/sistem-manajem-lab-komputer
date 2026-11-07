export function createActivityLogController(db) {
  return async (req, res, next) => {
    try {
      const pageText = req.query.page ?? '1';
      const limitText = req.query.limit ?? '20';
      if (typeof pageText !== 'string' || typeof limitText !== 'string' || !/^[1-9]\d{0,6}$/.test(pageText) || !/^[1-9]\d{0,2}$/.test(limitText) || Number(limitText) > 100) {
        return res.status(400).json({ message: 'page harus positif; limit 1–100.' });
      }
      const page = Number(pageText), limit = Number(limitText);
      const [[count]] = await db.query('SELECT COUNT(*) AS total FROM activity_logs');
      const [data] = await db.query('SELECT id, user_id, username, role, method, path, action, status_code, duration_ms, created_at FROM activity_logs ORDER BY id DESC LIMIT ? OFFSET ?', [limit, (page - 1) * limit]);
      return res.json({ data, pagination: { page, limit, total: Number(count.total), total_pages: Math.ceil(Number(count.total) / limit) } });
    } catch (error) { return next(error); }
  };
}
