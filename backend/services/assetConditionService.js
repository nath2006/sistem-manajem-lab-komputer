import { assetError } from '../utils/assetPolicy.js';

// Both device editors call this only after locking perangkat on their transaction.
// Findings own the derived condition until the repair lifecycle completes them.
export async function guardManualAssetCondition(connection, previous, status) {
  if (!previous || status === undefined || status === previous.status) return;
  const [findings] = await connection.query(
    `SELECT pengecekan_id,status_pengecekan FROM pengecekan
     WHERE perangkat_id=? AND status_pengecekan IN ('Baru','Menunggu Perbaikan')
     ORDER BY pengecekan_id FOR UPDATE`,
    [previous.perangkat_id],
  );
  if (findings.length) {
    throw assetError(409,
      `Kondisi tidak dapat diubah manual karena temuan aktif #${findings.map(f => f.pengecekan_id).join(', #')} masih ditangani. Selesaikan temuan melalui Troubleshoot / Perbaikan; kondisi mengikuti hasil perbaikan teknisi. Metadata aset tetap dapat diedit.`,
      'ASSET_CONDITION_OWNED_BY_MAINTENANCE');
  }
}
