export const TYPES = ['incident', 'service_request'];
export const CATEGORIES = [
  'hardware',
  'software',
  'network',
  'account',
  'other',
];
export const LEVELS = ['high', 'medium', 'low'];
export const STATUSES = [
  'new',
  'assigned',
  'in_progress',
  'pending',
  'resolved',
  'closed',
  'cancelled',
];
export const DEFAULT_POLICIES = [
  ['P1', 15, 240],
  ['P2', 60, 480],
  ['P3', 240, 1440],
  ['P4', 480, 4320],
].map(([priority, response_minutes, resolution_minutes]) => ({
  priority,
  response_minutes,
  resolution_minutes,
}));
export const manager = (u) => ['Admin', 'Koordinator Lab'].includes(u?.role);
export const terminal = (t) =>
  ['resolved', 'closed', 'cancelled'].includes(t.status);
export function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}
export function id(value) {
  if (
    !/^\d+$/.test(String(value)) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < 1
  )
    fail(400, 'Invalid identifier.');
  return Number(value);
}
export function text(value, max = 5000) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
    fail(400, 'Invalid text.');
  return value.trim();
}
export function choice(value, values) {
  if (!values.includes(value)) fail(400, 'Invalid classification.');
  return value;
}
export function priorityFor(impact, urgency) {
  choice(impact, LEVELS);
  choice(urgency, LEVELS);
  const sum = LEVELS.indexOf(impact) + LEVELS.indexOf(urgency);
  return sum === 0 ? 'P1' : sum === 1 ? 'P2' : sum === 2 ? 'P3' : 'P4';
}
export const utc = (value) => {
  const d =
    value instanceof Date
      ? value
      : new Date(
          typeof value === 'string' && !/[zZ]|[+-]\d\d:\d\d$/.test(value)
            ? value.replace(' ', 'T') + 'Z'
            : value
        );
  if (Number.isNaN(+d)) fail(400, 'Invalid timestamp.');
  return d;
};
export const sqlDate = (d) =>
  utc(d).toISOString().replace('T', ' ').replace('Z', '');
export function deadlines(created, policy) {
  const minutes = [policy.response_minutes, policy.resolution_minutes];
  if (
    minutes.some((value) => !Number.isSafeInteger(value) || value <= 0) ||
    minutes[0] > minutes[1]
  )
    fail(400, 'Invalid SLA policy.');
  return Object.fromEntries(
    [
      ['response_due_at', minutes[0]],
      ['resolution_due_at', minutes[1]],
    ].map(([key, value]) => {
      const due = utc(new Date(+utc(created) + value * 60000));
      if (due.getUTCFullYear() < 1000 || due.getUTCFullYear() > 9999)
        fail(400, 'SLA target exceeds supported date range.');
      return [key, sqlDate(due)];
    })
  );
}
