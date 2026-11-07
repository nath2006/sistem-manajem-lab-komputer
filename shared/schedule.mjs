export function validateScheduleTime(from, to, settings = {}) {
  const start = minutes(settings.schedule_start || '07:00');
  const end = minutes(settings.schedule_end || '17:00');
  const a = minutes(from), b = minutes(to);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 'Jam selesai harus setelah jam mulai dengan format HH:MM.';
  if (a < start || b > end) return 'Jam pengajuan harus berada dalam jam operasional sekolah.';
  const duration = Number(settings.lesson_duration ?? 60);
  if (duration > 0 && ((a-start) % duration !== 0 || (b !== end && (b-start) % duration !== 0))) return `Jam harus sesuai kelipatan ${duration} menit dari jam mulai sekolah.`;
  return '';
}
export const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
export const minutes = value => {
  const match = /^(\d{2}):([0-5]\d)(?::00)?$/.exec(String(value));
  return match && +match[1] < 24 ? +match[1] * 60 + +match[2] : NaN;
};
export const timeLabel = value => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
export function buildScheduleGrid(items, monday, settings = {}) {
  const start = minutes(settings.schedule_start || '07:00');
  const end = minutes(settings.schedule_end || '17:00');
  const duration = Number(settings.lesson_duration) || 60;
  const boundaries = new Set([start, end]);
  for (let t = start; t < end; t += duration) boundaries.add(t);
  const weekEnd = new Date(`${monday}T12:00:00`);
  weekEnd.setDate(weekEnd.getDate() + 4);
  const relevant = items.filter(item => {
    const date = String(item.tanggal).slice(0, 10);
    return date >= monday && new Date(`${date}T12:00:00`) <= weekEnd;
  });
  for (const item of relevant) {
    for (const t of [minutes(item.jam_mulai), minutes(item.jam_selesai)]) {
      if (t > start && t < end) boundaries.add(t);
    }
  }
  const points = [...boundaries].sort((a,b) => a-b);
  const slots = points.slice(0,-1).map(timeLabel);
  const grid = Object.fromEntries(DAYS.map(day => [day, Object.fromEntries(slots.map(slot => [slot,null]))]));
  for (const item of relevant) {
    const day = DAYS[new Date(`${String(item.tanggal).slice(0,10)}T12:00:00`).getDay()-1];
    if (!day) continue;
    const indices = points.slice(0,-1).map((t,i) => t >= minutes(item.jam_mulai) && t < minutes(item.jam_selesai) ? i : -1).filter(i => i >= 0);
    indices.forEach((index,i) => { grid[day][slots[index]] = i === 0 ? {...item, isStartCell:true, rowspan:indices.length} : {isOccupiedByOther:true}; });
  }
  return { grid, slots };
}
