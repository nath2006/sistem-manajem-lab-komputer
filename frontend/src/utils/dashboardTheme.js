// Central palette: color literals belong here, never in dashboard/chart components.
const PALETTE = Object.freeze({ surface: '#ffffff', canvas: '#f8fafc', text: '#172033', muted: '#475569', border: '#cbd5e1', track: '#e2e8f0', black: '#000000', white: '#ffffff', primary: '#800000', info: '#1754a6', success: '#157044', warning: '#855000', danger: '#b42335' });
const rgb = hex => hex.slice(1).match(/../g).map(value => parseInt(value, 16));
const hex = channels => '#' + channels.map(value => Math.round(value).toString(16).padStart(2, '0')).join('');
const mix = (color, target, amount) => hex(rgb(color).map((value, index) => value * (1 - amount) + rgb(target)[index] * amount));
const luminance = color => rgb(color).map(value => { const x = value / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
export function contrastRatio(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
export function foreground(background) { return contrastRatio(PALETTE.black, background) >= contrastRatio(PALETTE.white, background) ? PALETTE.black : PALETTE.white; }
function safeAccent(color) {
  for (let step = 0; step <= 100; step++) { const candidate = mix(color, PALETTE.black, step / 100); if (contrastRatio(candidate, PALETTE.surface) >= 4.5) return candidate; }
  return PALETTE.black;
}
export function dashboardTokens(value) {
  const primary = /^#[0-9a-f]{6}$/i.test(value) ? value : PALETTE.primary;
  const accent = safeAccent(primary);
  const colors = { primary, accent, surface: PALETTE.surface, canvas: PALETTE.canvas, text: PALETTE.text, muted: PALETTE.muted, border: PALETTE.border, track: PALETTE.track,
    info: PALETTE.info, success: PALETTE.success, warning: PALETTE.warning, danger: PALETTE.danger,
    'series-0': accent, 'series-1': safeAccent(mix(primary, PALETTE.info, 0.75)), 'series-2': safeAccent(mix(primary, PALETTE.success, 0.75)), 'series-3': safeAccent(mix(primary, PALETTE.warning, 0.75)),
  };
  const tokens = Object.fromEntries(Object.entries(colors).map(([key, color]) => [`--dashboard-${key}`, color]));
  for (const key of ['primary','info','success','warning','danger','series-0','series-1','series-2','series-3']) tokens[`--dashboard-on-${key}`] = foreground(colors[key]);
  return tokens;
}
