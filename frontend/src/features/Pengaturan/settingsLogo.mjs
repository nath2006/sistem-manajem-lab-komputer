export function buildSettingsRequest(form, file) {
  if (!file) return { data: form, config: undefined };
  const data = new FormData();
  for (const [key, value] of Object.entries(form))
    data.append(key, String(value));
  data.append('logo', file);
  return { data, config: { headers: { 'Content-Type': undefined } } };
}
export { resolveLogoUrl } from '../../utils/resolveLogoUrl.js';
export function validateLogoSelection(file) {
  if (!file) return '';
  const extensions = {
    'image/png': /\.png$/i,
    'image/jpeg': /\.jpe?g$/i,
    'image/webp': /\.webp$/i,
    'image/gif': /\.gif$/i,
  };
  return file.size > 2 * 1024 * 1024 || !extensions[file.type]?.test(file.name)
    ? 'Pilih gambar PNG/JPG/WebP/GIF maksimal 2 MB. SVG tidak diizinkan.'
    : '';
}
