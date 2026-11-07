export function resolveLogoUrl(value, assetBase = '', apiBase = '') {
  if (!value?.startsWith('/uploads/branding/')) return value || '';
  if (assetBase) return assetBase.replace(/\/$/, '') + value;
  try {
    return new URL(apiBase).origin + value;
  } catch {
    return value;
  }
}
