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
