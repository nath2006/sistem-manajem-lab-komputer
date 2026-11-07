import { isIP } from 'node:net';
import { isOwnedLogo, storeLogo, validateLogo } from './logoUpload.js';

export const DEFAULT_SETTINGS = Object.freeze({ school_name: 'Sekolah Anda', logo_url: '', primary_color: '#800000', schedule_start: '07:00', schedule_end: '17:00', lesson_duration: 60 });
const invalid = (message) => { const error = new Error(message); error.status = 400; throw error; };
export function validateSettings(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid('Konfigurasi tidak valid.');
  const data = Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map(key => [key, input[key]]));
  if (typeof data.school_name !== 'string' || !data.school_name.trim() || data.school_name.trim().length > 150 || /[<>\x00-\x1f]/.test(data.school_name)) invalid('Nama sekolah tidak valid.');
  data.school_name = data.school_name.trim();
  if (typeof data.primary_color !== 'string' || !/^#[a-f\d]{6}$/i.test(data.primary_color)) invalid('Warna harus berupa hex #RRGGBB.');
  for (const key of ['schedule_start', 'schedule_end']) if (typeof data[key] !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(data[key])) invalid('Jam harus HH:mm.');
  if (data.schedule_start >= data.schedule_end) invalid('Jam akhir harus setelah jam mulai.');
  const minutes = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  if (!Number.isInteger(data.lesson_duration) || data.lesson_duration < 1 || data.lesson_duration > minutes(data.schedule_end) - minutes(data.schedule_start)) invalid('Durasi pelajaran tidak valid.');
  if (typeof data.logo_url !== 'string' || data.logo_url.length > 2048) invalid('URL logo tidak valid.');
  if (data.logo_url && !isOwnedLogo(data.logo_url)) {
    let url; try { url = new URL(data.logo_url); } catch { invalid('URL logo tidak valid.'); }
    const hostname = url.hostname.toLowerCase();
    // Remote raster URLs only; never fetch server-side. No SVG, credentials, local/IP hosts, query or fragment.
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || isIP(hostname) || hostname.includes(':') || !hostname.includes('.') || /(^|\.)(localhost|local|internal|test|invalid)$/.test(hostname) || !/\.(png|jpe?g|webp|gif)$/i.test(url.pathname) || /[<>"'\s]/.test(data.logo_url)) invalid('URL logo harus gambar PNG/JPG/WebP/GIF HTTP(S) publik tanpa parameter.');
  }
  return data;
}
export function createSettingsService(db, { logoDirectory } = {}) {
  return {
    async get() {
      const [rows] = await db.query('SELECT school_name, logo_url, primary_color, schedule_start, schedule_end, lesson_duration FROM school_settings WHERE id = 1');
      if (!rows.length) return { ...DEFAULT_SETTINGS };
      const row = rows[0];
      return { ...row, schedule_start: String(row.schedule_start).slice(0, 5), schedule_end: String(row.schedule_end).slice(0, 5), lesson_duration: Number(row.lesson_duration) };
    },
    async update(input, file) {
      const omittedLogo = input && typeof input === 'object' && !Array.isArray(input) && !Object.hasOwn(input, 'logo_url');
      const data = validateSettings(omittedLogo ? { ...input, logo_url: '' } : input);
      if (file) validateLogo(file);
      let current;
      if (omittedLogo && !file) {
        current = await this.get();
        data.logo_url = validateSettings({ ...data, logo_url: current.logo_url }).logo_url;
      }
      // Local references must already belong to this settings record, not arbitrary paths.
      if (isOwnedLogo(data.logo_url)) {
        current ??= await this.get();
        if (current.logo_url !== data.logo_url) invalid('URL logo lokal tidak valid.');
      }
      const upload = file ? await storeLogo(file, logoDirectory) : null;
      if (upload) data.logo_url = upload.url;
      const fields = Object.keys(DEFAULT_SETTINGS);
      try { await db.query(`INSERT INTO school_settings (id, ${fields.join(', ')}) VALUES (1, ${fields.map(() => '?').join(', ')}) ON DUPLICATE KEY UPDATE ${fields.map(key => `${key} = VALUES(${key})`).join(', ')}`, fields.map(key => data[key])); }
      catch (error) { if (upload) await upload.cleanup().catch(() => {}); throw error; }
      return data;
    },
  };
}
