// Local storage paths are filenames, not URL query strings. Absolute URLs retain queries.
function httpUrl(value) {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url : null;
  } catch { return null; }
}
function safeParts(path) {
  try {
    const parts = path.replace(/\\/g, '/').split('/').filter(Boolean).map(decodeURIComponent);
    return parts.length && parts.every(part => part !== '.' && part !== '..' && !/[\\/]/.test(part) && ![...part].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) && !/%(?:2e|2f|5c)/i.test(part)) ? parts : null;
  } catch { return null; }
}
export function resolveAnnouncementFileUrl(file, options = {}) {
  if (typeof file !== 'string' || !file.trim()) return null;
  const value = file.trim();
  if (/^[a-z][a-z\d+.-]*:/i.test(value)) {
    const url = httpUrl(value);
    if (!url || !safeParts(value.replace(/^https?:\/\/[^/]+/i, '').split(/[?#]/)[0])) return null;
    return url.href;
  }
  if (/^[\\/]{2}/.test(value)) return null;
  let parts = safeParts(value);
  if (!parts) return null;
  if (parts[0] !== 'uploads') parts = ['uploads', 'pengumuman', ...parts];
  const env = import.meta.env || {};
  const origin = options.origin ?? (typeof window !== 'undefined' ? window.location.origin : undefined);
  const assetBase = options.assetBase ?? env.VITE_ASSET_BASE_URL;
  const apiBase = options.apiBase ?? env.VITE_BASE_URL;
  const base = httpUrl(assetBase) || httpUrl(apiBase) || httpUrl(origin);
  if (!base) return null;
  const prefix = httpUrl(assetBase) ? base.pathname.replace(/\/$/, '') : '';
  return `${base.origin}${prefix}/${parts.map(encodeURIComponent).join('/')}`;
}
export function getAnnouncementFileName(file) {
  if (typeof file !== 'string') return '';
  const path = /^https?:\/\//i.test(file) ? file.split(/[?#]/)[0] : file;
  const name = path.replace(/\\/g, '/').split('/').pop() || '';
  try { return decodeURIComponent(name); } catch { return name; }
}
