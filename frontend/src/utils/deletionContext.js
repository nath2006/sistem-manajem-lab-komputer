const resources = new Set([
  'perangkat',
  'laboratorium',
  'user',
  'pemeriksaan',
  'pengecekan',
  'perbaikan',
  'pengumuman',
]);
const relations = {
  '/kelola-perangkat': { laboratorium: ['lab_id'] },
  '/kelola/data-lab': { user: ['kepala_lab_id'] },
  '/kelola-pemeriksaan-perangkat': {
    perangkat: ['perangkat_id'],
    user: ['user_id'],
  },
  '/kelola-pengecekan': {
    perangkat: ['perangkat_id'],
    pemeriksaan: ['pemeriksaan_id'],
    user: ['user_id'],
  },
  '/kelola-perbaikan': {
    perangkat: ['perangkat_id_snapshot', 'perangkat_id'],
    pengecekan: ['pengecekan_id'],
    user: ['user_id'],
  },
  '/kelola-pengumuman': {
    user: ['created_by.user_id', 'created_by_user_id', 'created_by'],
  },
  '/kelola-jadwal-lab': {
    laboratorium: ['lab_id'],
    user: ['guru_id', 'disetujui_oleh'],
  },
};
const relatedPaths = new Set([
  ...Object.keys(relations),
  '/ticketing',
  '/user',
  '/jadwal-lab',
]);

export function deletionContext(value) {
  if (
    !value ||
    !resources.has(value.resource) ||
    !Number.isSafeInteger(Number(value.id)) ||
    Number(value.id) < 1
  )
    return null;
  return {
    resource: value.resource,
    id: Number(value.id),
    label:
      typeof value.label === 'string'
        ? value.label.slice(0, 200)
        : `Data #${value.id}`,
  };
}
export function deletionRelation(pathname, value) {
  const context = deletionContext(value);
  const fields = context && relations[pathname]?.[context.resource];
  return fields ? { ...context, fields } : null;
}
export function safeRelatedPath(path) {
  return typeof path === 'string' && relatedPaths.has(path) ? path : null;
}
export function validDeletionPreview(value, resource, id) {
  return (
    !!value &&
    value.resource === resource &&
    Number(value.id) === Number(id) &&
    typeof value.can_delete === 'boolean' &&
    Array.isArray(value.blockers)
  );
}
