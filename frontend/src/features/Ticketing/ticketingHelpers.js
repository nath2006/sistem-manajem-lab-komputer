export function slaReadinessMessage(policies) {
  const complete = Array.isArray(policies) && ['P1', 'P2', 'P3', 'P4'].every(priority => {
    const matches = policies.filter(row => row.priority === priority);
    if (matches.length !== 1) return false;
    const { response_minutes: response, resolution_minutes: resolution } = matches[0];
    const due = new Date(Date.now() + resolution * 60000);
    return Number.isSafeInteger(response) && response > 0 && Number.isSafeInteger(resolution) &&
      resolution >= response && Number.isFinite(+due) && due.getUTCFullYear() <= 9999;
  });
  return complete ? '' : 'SLA belum siap: kebijakan P1–P4 belum lengkap atau target tidak valid. Hubungi Admin untuk memeriksa Kebijakan SLA. Untuk database review baru, jalankan inisialisasi SLA review sesuai panduan sebelum membuat tiket.';
}

export const isManager = (role) => ['Admin', 'Koordinator Lab'].includes(role);
export const isTerminal = (status) =>
  ['resolved', 'closed', 'cancelled'].includes(status);
export function availableActions(ticket, user) {
  const manager = isManager(user.role);
  const reporter =
    user.userId != null && String(user.userId) === String(ticket.reporter_id);
  const assigned =
    user.role === 'Teknisi' &&
    user.userId != null &&
    String(user.userId) === String(ticket.assignee_id);
  const operator = manager || assigned;
  if (ticket.status === 'cancelled') return [];
  if (ticket.status === 'closed') return manager || reporter ? ['reopen'] : [];
  if (ticket.status === 'resolved') {
    if (manager) return ['close', 'reopen'];
    if (reporter) return assigned ? ['reopen'] : ['close', 'reopen'];
    return [];
  }
  const actions = [];
  if (manager || (user.role === 'Teknisi' && !ticket.assignee_id))
    actions.push('assign');
  if (operator && ticket.status === 'assigned') actions.push('start');
  if (operator && ticket.status === 'in_progress')
    actions.push('pending', 'resolve');
  if (operator && ticket.status === 'pending') actions.push('resume');
  if (manager || reporter) actions.push('cancel');
  actions.push('comment');
  if (!ticket.escalated_at) actions.push('escalate');
  return actions;
}
export function actionPayload(form, ticket, user) {
  const note = form.note?.trim();
  if (!note) throw new Error('Catatan / alasan wajib diisi.');
  const payload = { action: form.action, note, version: ticket.version };
  if (form.action === 'assign') {
    payload.assignee_id = isManager(user.role)
      ? Number(form.assignee_id)
      : user.userId;
    if (!payload.assignee_id) throw new Error('Pilih teknisi.');
  }
  if (form.action === 'resolve') {
    if (!form.resolution?.trim()) throw new Error('Resolusi wajib diisi.');
    payload.resolution = form.resolution.trim();
    payload.root_cause = form.root_cause?.trim() || '';
  }
  return payload;
}
