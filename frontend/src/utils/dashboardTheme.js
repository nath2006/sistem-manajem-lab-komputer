// Central palette: color literals belong here, never in dashboard/chart components.
const PALETTE = Object.freeze({ surface: '#ffffff', canvas: '#f8fafc', text: '#172033', muted: '#475569', border: '#cbd5e1', track: '#e2e8f0', black: '#000000', white: '#ffffff', primary: '#800000', info: '#2563eb', success: '#16a34a', warning: '#f59e0b', danger: '#dc2626' });
const rgb = hex => hex.slice(1).match(/../g).map(value => parseInt(value, 16));
const hex = channels => '#' + channels.map(value => Math.round(value).toString(16).padStart(2, '0')).join('');
const mix = (color, target, amount) => hex(rgb(color).map((value, index) => value * (1 - amount) + rgb(target)[index] * amount));
const luminance = color => rgb(color).map(value => { const x = value / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
export function contrastRatio(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
export function foreground(background) { return contrastRatio(PALETTE.black, background) >= contrastRatio(PALETTE.white, background) ? PALETTE.black : PALETTE.white; }
function safeAccent(color) {
  for (let step = 0; step <= 100; step++) { const candidate = mix(color, PALETTE.black, step / 100); if (contrastRatio(candidate, PALETTE.surface) >= 6) return candidate; }
  return PALETTE.black;
}
// Exact Chart.js 4.4.9 src/plugins/plugin.colors.ts BORDER_COLORS (installed source map).
// Explicit assignment preserves semantic labels when server rows reorder/filter.
export const DEFAULT_CHART_COLORS = Object.freeze(['rgb(54, 162, 235)', 'rgb(255, 99, 132)', 'rgb(255, 159, 64)', 'rgb(255, 205, 86)', 'rgb(75, 192, 192)', 'rgb(153, 102, 255)', 'rgb(201, 203, 207)']);
export function conditionTone(label) {
  const value = String(label || '').trim().replace(/\s+/g, ' ');
  if (/rusak/i.test(value)) return 'danger';
  if (/dalam perbaikan/i.test(value)) return 'info';
  if (/perlu perbaikan|perbaikan/i.test(value)) return 'warning';
  return /\bbaik\b|layak/i.test(value) ? 'success' : 'info';
}
export function dashboardTokens(value) {
  const primary = /^#[0-9a-f]{6}$/i.test(value) ? value : PALETTE.primary;
  const accent = safeAccent(primary);
  const colors = { primary, accent, soft: mix(primary, PALETTE.white, 0.92), 'soft-strong': mix(primary, PALETTE.white, 0.85),
    'card-medium': mix(primary, PALETTE.white, 0.7), 'card-strong': mix(primary, PALETTE.white, 0.65), 'card-light': mix(primary, PALETTE.white, 0.8),
    'chart-fill': mix(primary, PALETTE.white, 0.3),
    surface: PALETTE.surface, canvas: PALETTE.canvas, text: PALETTE.text, muted: PALETTE.muted, border: PALETTE.border, track: PALETTE.track,
    // Readable semantic text/card tokens retain the live brand (not chart pigments).
    info: safeAccent(mix(PALETTE.info, primary, 0.3)), success: safeAccent(mix(PALETTE.success, primary, 0.3)), warning: safeAccent(mix(PALETTE.warning, primary, 0.3)), danger: safeAccent(mix(PALETTE.danger, primary, 0.3)),
    'card-info': mix(mix(PALETTE.info, primary, 0.3), PALETTE.white, 0.7),
    'card-success': mix(mix(PALETTE.success, primary, 0.3), PALETTE.white, 0.7),
    'card-warning': mix(mix(PALETTE.warning, primary, 0.3), PALETTE.white, 0.7),
    'series-0': accent, 'series-1': safeAccent(mix(PALETTE.info, primary, 0.3)), 'series-2': safeAccent(mix(PALETTE.success, primary, 0.3)), 'series-3': safeAccent(mix(PALETTE.warning, primary, 0.3)),
    'chart-0': primary,
  };
  // Only chart pigments are fixed; metric cards/text retain live branding.
  DEFAULT_CHART_COLORS.forEach((color, index) => { colors[`chart-${index}`] = color; });
  for (const [tone, index] of Object.entries({ info: 0, success: 4, warning: 3, danger: 1 })) colors[`fill-${tone}`] = DEFAULT_CHART_COLORS[index];
  const tokens = Object.fromEntries(Object.entries(colors).map(([key, color]) => [`--dashboard-${key}`, color]));
  for (const key of ['card-info','card-success','card-warning','card-medium','card-strong','card-light','primary','info','success','warning','danger','series-0','series-1','series-2','series-3']) tokens[`--dashboard-on-${key}`] = foreground(colors[key]);
  return tokens;
}
