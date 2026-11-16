const failure = (status, message, code) => Object.assign(new Error(message), { status, code });
export function onboardingActor(actor) {
  if (!Number.isSafeInteger(actor?.id) || actor.id <= 0)
    throw failure(401, 'Identitas akun tidak valid. Silakan masuk kembali.');
  return actor.id;
}
export async function requireOnboardingSchema(db) {
  const [columns] = await db.query("SELECT DATA_TYPE,IS_NULLABLE,COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='user' AND COLUMN_NAME='onboarding_seen_at'");
  if (columns.length !== 1 || columns[0].DATA_TYPE !== 'datetime' || columns[0].IS_NULLABLE !== 'YES' || columns[0].COLUMN_DEFAULT !== null)
    throw failure(503, 'Penyimpanan panduan belum siap. Hubungi administrator.', 'ONBOARDING_SCHEMA_REQUIRED');
}
async function readSeen(db, id) {
  // DATETIME stores UTC explicitly; format in SQL to avoid mysql2/local TZ conversion.
  const [rows] = await db.query(`SELECT DATE_FORMAT(onboarding_seen_at, '%Y-%m-%dT%H:%i:%sZ') AS seen_at FROM user WHERE user_id=?`, [id]);
  if (!rows.length) throw failure(404, 'Akun tidak ditemukan.');
  return rows[0].seen_at;
}
export async function claimOnboarding(db, actor) {
  const id = onboardingActor(actor);
  await requireOnboardingSchema(db);
  // Single conditional UPDATE is the cross-device arbiter; never read-then-write.
  const [result] = await db.query('UPDATE user SET onboarding_seen_at=UTC_TIMESTAMP() WHERE user_id=? AND onboarding_seen_at IS NULL', [id]);
  const seen_at = await readSeen(db, id);
  if (seen_at === null) throw failure(503, 'Penyimpanan panduan belum siap. Hubungi administrator.', 'ONBOARDING_SCHEMA_REQUIRED');
  return { should_show: result.affectedRows === 1, seen_at };
}
export async function getOnboarding(db, actor) {
  const id = onboardingActor(actor);
  await requireOnboardingSchema(db);
  const seen_at = await readSeen(db, id);
  return { seen: seen_at !== null, seen_at };
}
