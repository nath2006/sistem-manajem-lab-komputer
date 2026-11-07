// No default pool import: previews and deletion are independently testable.
const resources = {
  perangkat: ['perangkat_id', 'nama_perangkat', ['Admin', 'Kepala Lab']],
  laboratorium: ['lab_id', 'nama_lab', ['Admin', 'Koordinator Lab']],
  user: ['user_id', 'nama_lengkap', ['Admin']],
  pemeriksaan: ['pemeriksaan_id', 'catatan', ['Admin', 'Kepala Lab']],
  pengecekan: ['pengecekan_id', 'ditemukan_kerusakan', ['Admin', 'Teknisi']],
  perbaikan: ['perbaikan_id', 'tindakan', ['Admin', 'Teknisi']],
  pengumuman: ['id', 'judul', ['Admin', 'Koordinator Lab']],
};
// Include logical references which deliberately have no FK in the additive migrations.
const references = {
  perangkat: [
    ['pemeriksaan', 'perangkat_id'],
    ['pengecekan', 'perangkat_id'],
    ['perbaikan', 'perangkat_id_snapshot'],
    ['service_tickets', 'perangkat_id'],
  ],
  laboratorium: [
    ['perangkat', 'lab_id'],
    ['jadwal_lab', 'lab_id'],
    ['pengajuan_lab', 'lab_id'],
  ],
  user: [
    ['laboratorium', 'kepala_lab_id'],
    ['jadwal_lab', 'guru_id'],
    ['pengajuan_lab', 'guru_id'],
    ['pengajuan_lab', 'disetujui_oleh'],
    ['laporan', 'dibuat_oleh'],
    ['pemeriksaan', 'user_id'],
    ['pengecekan', 'user_id'],
    ['perbaikan', 'user_id'],
    ['pengumuman', 'created_by'],
    ['service_tickets', 'reporter_id'],
    ['service_tickets', 'assignee_id'],
    ['ticket_events', 'actor_id'],
    ['ticket_policy_events', 'actor_id'],
  ],
  pemeriksaan: [['pengecekan', 'pemeriksaan_id']],
  pengecekan: [
    ['perbaikan', 'pengecekan_id'],
    ['service_tickets', 'pengecekan_id'],
  ],
  perbaikan: [],
  pengumuman: [],
};
const optional = new Set([
  'service_tickets',
  'ticket_events',
  'ticket_policy_events',
]);
const destinations = {
  perangkat: ['/kelola-perangkat', ['Admin', 'Kepala Lab']],
  laboratorium: ['/kelola/data-lab', ['Admin', 'Koordinator Lab']],
  jadwal_lab: ['/jadwal-lab', ['Admin', 'Kepala Lab']],
  pengajuan_lab: ['/kelola-jadwal-lab', ['Admin', 'Kepala Lab']],
  pemeriksaan: ['/kelola-pemeriksaan-perangkat', ['Admin', 'Kepala Lab']],
  pengecekan: ['/kelola-pengecekan', ['Admin', 'Teknisi']],
  perbaikan: ['/kelola-perbaikan', ['Admin', 'Teknisi']],
  pengumuman: ['/kelola-pengumuman', ['Admin', 'Koordinator Lab']],
  service_tickets: [
    '/ticketing',
    ['Admin', 'Kepala Lab', 'Teknisi', 'Koordinator Lab'],
  ],
  ticket_events: ['/ticketing', ['Admin']],
  ticket_policy_events: ['/ticketing', ['Admin']],
};
const identifier = (value) => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value))
    throw new Error('Invalid schema identifier');
  return `\`${value}\``;
};
export class DeletionError extends Error {
  constructor(status, message, data) {
    super(message);
    this.status = status;
    this.statusCode = status;
    this.data = data;
  }
}
function validate(resource, id, actor) {
  if (!actor) throw new DeletionError(401, 'Silakan login terlebih dahulu.');
  if (!Object.hasOwn(resources, resource))
    throw new DeletionError(404, 'Jenis data tidak ditemukan.');
  if (!resources[resource][2].includes(actor.role))
    throw new DeletionError(
      403,
      'Anda tidak memiliki izin menghapus data ini.'
    );
  if (
    !/^[1-9]\d*$/.test(String(id)) ||
    !Number.isSafeInteger(Number(id)) ||
    Number(id) > 2147483647
  )
    throw new DeletionError(
      400,
      'ID harus berupa bilangan bulat positif yang valid.'
    );
  return Number(id);
}
function blocker(table, column, count, actor, resource) {
  const route = destinations[table];
  const reassign = table === 'laboratorium' && resource === 'user';
  const author = table === 'pengumuman' && resource === 'user';
  const move = table === 'perangkat' && resource === 'laboratorium';
  return {
    key: `${table}.${column}`,
    label: table.replaceAll('_', ' '),
    count,
    message: author
      ? 'Akun ini tercatat sebagai penulis pengumuman. Pengalihan penulis belum tersedia di formulir edit; pertahankan akun dan minta administrator meninjau pengalihan tanpa menghapus pengumuman.'
      : move
        ? 'Pindahkan perangkat ke laboratorium lain melalui Edit Perangkat terlebih dahulu.'
        : reassign
          ? 'Alihkan penanggung jawab melalui edit data terlebih dahulu; data terkait tidak dihapus otomatis.'
          : 'Data terkait dipertahankan untuk menjaga riwayat. Jangan hapus riwayat untuk melanjutkan penghapusan ini.',
    path: route?.[1].includes(actor.role) ? route[0] : null,
    action: move
      ? 'Pindahkan perangkat'
      : reassign
        ? 'Alihkan penanggung jawab'
        : route?.[1].includes(actor.role)
          ? 'Lihat data terkait'
          : 'Hubungi administrator',
  };
}
export function createDeletionService({ db }) {
  async function inspect(executor, resource, id, actor, lock = false) {
    const [pk, labelColumn] = resources[resource];
    const fields =
      resource === 'perangkat'
        ? 'lab_id, foto_perangkat, '
        : resource === 'laboratorium'
          ? 'foto_lab, '
          : resource === 'pemeriksaan'
            ? 'perangkat_id, '
            : '';
    const [rows] = await executor.query(
      `SELECT ${identifier(pk)}, ${fields}${identifier(labelColumn)} AS label FROM ${identifier(resource)} WHERE ${identifier(pk)} = ?${lock ? ' FOR UPDATE' : ''}`,
      [id]
    );
    if (!rows.length) throw new DeletionError(404, 'Data tidak ditemukan.');
    const row = rows[0];
    if (actor.role === 'Kepala Lab') {
      let labId = row.lab_id;
      if (resource === 'pemeriksaan') {
        const [devices] = await executor.query(
          `SELECT lab_id FROM perangkat WHERE perangkat_id = ?${lock ? ' FOR UPDATE' : ''}`,
          [row.perangkat_id]
        );
        labId = devices[0]?.lab_id;
      }
      const [labs] = await executor.query(
        `SELECT kepala_lab_id FROM laboratorium WHERE lab_id = ?${lock ? ' FOR UPDATE' : ''}`,
        [labId]
      );
      if (!labs.length || Number(labs[0].kepala_lab_id) !== Number(actor.id))
        throw new DeletionError(403, 'Data berada di luar laboratorium Anda.');
    }
    const [tables] = await executor.query(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?,?,?)',
      [...optional]
    );
    const present = new Set(tables.map((t) => t.TABLE_NAME));
    const [fks] = await executor.query(
      `SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME = ? AND REFERENCED_COLUMN_NAME = ?`,
      [resource, pk]
    );
    const edges = new Map();
    for (const [table, column] of [
      ...references[resource],
      ...fks.map((f) => [f.TABLE_NAME, f.COLUMN_NAME]),
    ]) {
      if (!optional.has(table) || present.has(table))
        edges.set(`${table}.${column}`, [table, column]);
    }
    const blockers = [];
    if (resource === 'user' && Number(actor.id) === id)
      blockers.push({
        key: 'self',
        label: 'Akun aktif',
        count: 1,
        message: 'Akun yang sedang digunakan tidak dapat dihapus.',
        path: null,
        action: 'Gunakan akun administrator lain',
      });
    if (['pengecekan', 'perbaikan'].includes(resource))
      blockers.push({
        key: 'retention',
        label: 'Riwayat pemeliharaan',
        count: 1,
        message:
          'Riwayat pemeliharaan wajib dipertahankan dan tidak dapat dihapus.',
        path: destinations[resource][0],
        action: 'Lihat riwayat',
      });
    for (const [table, column] of edges.values()) {
      // Locking reads are current reads. SERIALIZABLE + parent exclusive lock prevent
      // new FK children; next-key locks also serialize non-FK ticket reference ranges.
      // This does not add FK semantics to ticket writers: a writer that validated a
      // parent earlier can still insert an orphan after this transaction commits.
      // Such writers must lock/revalidate parents in their own transaction.
      const [linked] = await executor.query(
        `SELECT 1 FROM ${identifier(table)} WHERE ${identifier(column)} = ?${lock ? ' FOR UPDATE' : ''}`,
        [id]
      );
      if (linked.length)
        blockers.push(blocker(table, column, linked.length, actor, resource));
    }
    const data = {
      resource,
      id,
      label:
        resource === 'pemeriksaan'
          ? `Pemeriksaan #${id}`
          : resource === 'pengecekan'
            ? `Temuan #${id}`
            : resource === 'perbaikan'
              ? `Perbaikan #${id}`
              : row.label,
      can_delete: !blockers.length,
      retained: !!blockers.length,
      blockers,
      message: blockers.length
        ? 'Data tidak dapat dihapus karena masih terhubung. Data dan riwayat terkait tetap dipertahankan.'
        : 'Data dapat dihapus. Tindakan ini tidak dapat dibatalkan.',
    };
    return { data, row };
  }
  return {
    async preview(resource, rawId, actor) {
      const id = validate(resource, rawId, actor);
      return (await inspect(db, resource, id, actor)).data;
    },
    async remove(resource, rawId, actor) {
      const id = validate(resource, rawId, actor);
      const conn = await db.getConnection();
      let started = false;
      let checked;
      let discard = false;
      try {
        await conn.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
        await conn.beginTransaction();
        started = true;
        const { data, row } = await inspect(conn, resource, id, actor, true);
        checked = data;
        if (!data.can_delete) throw new DeletionError(409, data.message, data);
        const [result] = await conn.query(
          `DELETE FROM ${identifier(resource)} WHERE ${identifier(resources[resource][0])} = ?`,
          [id]
        );
        if (result.affectedRows !== 1)
          throw new DeletionError(404, 'Data tidak ditemukan.');
        await conn.commit();
        started = false;
        return row;
      } catch (error) {
        if (started) {
          try {
            await conn.rollback();
          } catch {
            discard = true;
          }
        }
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451)
          throw new DeletionError(
            409,
            'Data masih terhubung dan tidak dihapus. Muat ulang rincian keterkaitan.',
            {
              ...checked,
              resource,
              id,
              label: checked?.label || `Data #${id}`,
              message:
                'Data masih terhubung dan tidak dihapus. Muat ulang rincian keterkaitan.',
              can_delete: false,
              retained: true,
              blockers: [
                {
                  key: 'dependency',
                  label: 'Data terkait',
                  count: 1,
                  message: 'Data terkait harus dipertahankan.',
                  path: null,
                  action: 'Muat ulang rincian',
                },
              ],
            }
          );
        throw error;
      } finally {
        try {
          if (discard) conn.destroy();
          else conn.release();
        } catch {
          // Cleanup cannot replace the transaction result (especially after commit).
          try {
            conn.destroy?.();
          } catch {
            /* Preserve original transaction outcome. */
          }
        }
      }
    },
  };
}
export function sendDeletionError(res, error) {
  return res
    .status(error.status || 500)
    .json({
      message: error.status
        ? error.message
        : 'Gagal memproses penghapusan. Silakan coba kembali.',
      ...(error.data ? { data: error.data } : {}),
    });
}
