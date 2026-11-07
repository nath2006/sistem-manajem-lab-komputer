import { createSettingsService } from '../services/settingsService.js';

export function createSettingsController(db, options) {
  const service = createSettingsService(db, options);
  return {
    async get(req, res, next) {
      try { res.set('Cache-Control', 'no-store'); return res.json({ data: await service.get() }); }
      catch (error) { return next(error); }
    },
    async update(req, res, next) {
      try { return res.json({ data: await service.update(req.is('multipart/form-data') ? { ...req.body, lesson_duration: /^\d+$/.test(req.body.lesson_duration) ? Number(req.body.lesson_duration) : req.body.lesson_duration } : req.body, req.file), message: 'Pengaturan berhasil disimpan.' }); }
      catch (error) { return next(error); }
    },
  };
}
