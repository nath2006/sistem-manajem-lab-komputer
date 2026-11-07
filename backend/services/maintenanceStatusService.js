// The caller owns the transaction and locks the source finding before syncing.
// Keep this legacy repair lifecycle independent from service-ticket transitions.
export async function syncMaintenanceStatus(connection, finding, perangkatId, success) {
  await connection.query(
    'UPDATE pengecekan SET status_pengecekan = ? WHERE pengecekan_id = ?',
    [success ? 'Sudah Ditangani' : 'Menunggu Perbaikan', finding.pengecekan_id]
  );
  if (finding.pemeriksaan_id) {
    await connection.query(
      'UPDATE pemeriksaan SET hasil_pemeriksaan = ? WHERE pemeriksaan_id = ?',
      [success ? 'Baik' : 'Bermasalah', finding.pemeriksaan_id]
    );
  }
  await connection.query(
    `UPDATE perangkat SET status = CASE WHEN EXISTS
      (SELECT 1 FROM pengecekan pc WHERE pc.perangkat_id = perangkat.perangkat_id
       AND pc.status_pengecekan IN ('Baru', 'Menunggu Perbaikan'))
      THEN 'Perlu Perbaikan' ELSE 'Baik' END WHERE perangkat_id = ?`,
    [perangkatId]
  );
}
