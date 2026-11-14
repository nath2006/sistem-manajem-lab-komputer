-- REVIEW ONLY: explicitly isolated allowlisted clone, never automatic startup.
-- Additive; old/new assets remain usable before issuing QR. No backfill or key rotation.
-- Outside the review allowlist, every DDL branch is a no-op.
SET @qr_review = DATABASE() REGEXP '^simlab_review_[0-9]{14}$';
SET @qr_sql = IF(@qr_review=1 AND (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='perangkat' AND COLUMN_NAME='qr_public_id')=0, 'ALTER TABLE perangkat ADD COLUMN qr_public_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL', 'SELECT 1');
PREPARE qr_stmt FROM @qr_sql;
EXECUTE qr_stmt;
DEALLOCATE PREPARE qr_stmt;
SET @qr_sql = IF(@qr_review=1 AND (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='perangkat' AND INDEX_NAME='uq_perangkat_qr_public_id')=0, 'ALTER TABLE perangkat ADD UNIQUE INDEX uq_perangkat_qr_public_id (qr_public_id)', 'SELECT 1');
PREPARE qr_stmt FROM @qr_sql;
EXECUTE qr_stmt;
DEALLOCATE PREPARE qr_stmt;
