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
export function conditionTone(label) { return /rusak|perbaikan/i.test(label) ? 'warning' : /\bbaik\b|layak/i.test(label) ? 'success' : 'info'; }
export function dashboardTokens(value) {
  const primary = /^#[0-9a-f]{6}$/i.test(value) ? value : PALETTE.primary;
  const accent = safeAccent(primary);
  const colors = { primary, accent, soft: mix(primary, PALETTE.white, 0.92), 'soft-strong': mix(primary, PALETTE.white, 0.85),
    'card-medium': mix(primary, PALETTE.white, 0.7), 'card-strong': mix(primary, PALETTE.white, 0.65), 'card-light': mix(primary, PALETTE.white, 0.8),
    'chart-fill': mix(primary, PALETTE.white, 0.3),
    surface: PALETTE.surface, canvas: PALETTE.canvas, text: PALETTE.text, muted: PALETTE.muted, border: PALETTE.border, track: PALETTE.track,
    // Coordinated action/status families include the live brand; never use Chart.js default colors.
    info: safeAccent(mix(PALETTE.info, primary, 0.3)), success: safeAccent(mix(PALETTE.success, primary, 0.3)), warning: safeAccent(mix(PALETTE.warning, primary, 0.3)), danger: safeAccent(mix(PALETTE.danger, primary, 0.3)),
    'card-info': mix(mix(PALETTE.info, primary, 0.3), PALETTE.white, 0.7),
    'card-success': mix(mix(PALETTE.success, primary, 0.3), PALETTE.white, 0.7),
    'card-warning': mix(mix(PALETTE.warning, primary, 0.3), PALETTE.white, 0.7),
    'series-0': accent, 'series-1': safeAccent(mix(PALETTE.info, primary, 0.3)), 'series-2': safeAccent(mix(PALETTE.success, primary, 0.3)), 'series-3': safeAccent(mix(PALETTE.warning, primary, 0.3)),
    'chart-0': primary,
  };
  // Solid chart fills share the contrast-safe semantic tokens, not white blends.
  for (const tone of ['info', 'success', 'warning', 'danger']) colors[`fill-${tone}`] = colors[tone];
  for (const [index, tone] of ['info', 'success', 'warning'].entries()) colors[`chart-${index + 1}`] = colors[tone];
  const tokens = Object.fromEntries(Object.entries(colors).map(([key, color]) => [`--dashboard-${key}`, color]));
  for (const key of ['card-info','card-success','card-warning','card-medium','card-strong','card-light','primary','info','success','warning','danger','series-0','series-1','series-2','series-3']) tokens[`--dashboard-on-${key}`] = foreground(colors[key]);
  return tokens;
}
