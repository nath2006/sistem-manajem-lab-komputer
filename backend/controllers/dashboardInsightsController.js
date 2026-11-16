import { createDashboardInsightsService } from '../services/dashboardInsightsService.js';
export function createDashboardInsightsController(db) {
  const service = createDashboardInsightsService(db);
  return async (req, res) => {
    try {
      const data = await service.get(req.user);
      res.json({ message: 'Ringkasan dashboard berhasil diambil.', data });
    } catch (error) {
      res.status(error.status || 500).json({ message: error.status ? error.message : 'Gagal mengambil ringkasan dashboard.' });
    }
  };
}
