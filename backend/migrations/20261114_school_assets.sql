-- REVIEW ONLY. Do not run on the original rollback database.
-- SHOW CREATE TABLE perangkat confirmed signed INT lab_id, fk_perangkat_lab index/FK.
-- MySQL 8 compatible: information_schema guards and prepared DDL.
-- DDL auto-commits. Repeatable on an explicitly isolated review database only.
SET @asset_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='perangkat' AND COLUMN_NAME='lab_id' AND COLUMN_TYPE='int' AND IS_NULLABLE='NO')=1, 'ALTER TABLE perangkat MODIFY COLUMN lab_id INT NULL', 'SELECT 1');
PREPARE asset_stmt FROM @asset_sql;
EXECUTE asset_stmt;
DEALLOCATE PREPARE asset_stmt;
SET @asset_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='perangkat' AND COLUMN_NAME='penggunaan')=0, 'ALTER TABLE perangkat ADD COLUMN penggunaan ENUM(''Pembelajaran'',''Operasional'') NOT NULL DEFAULT ''Pembelajaran''', 'SELECT 1');
PREPARE asset_stmt FROM @asset_sql;
EXECUTE asset_stmt;
DEALLOCATE PREPARE asset_stmt;
SET @asset_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='perangkat' AND COLUMN_NAME='kategori')=0, 'ALTER TABLE perangkat ADD COLUMN kategori ENUM(''Komputer'',''Laptop'',''Monitor'',''Printer'',''Perangkat Jaringan'',''Proyektor'',''Lainnya'') NOT NULL DEFAULT ''Lainnya''', 'SELECT 1');
PREPARE asset_stmt FROM @asset_sql;
EXECUTE asset_stmt;
DEALLOCATE PREPARE asset_stmt;
SET @asset_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='perangkat' AND COLUMN_NAME='lokasi')=0, 'ALTER TABLE perangkat ADD COLUMN lokasi VARCHAR(150) NULL', 'SELECT 1');
PREPARE asset_stmt FROM @asset_sql;
EXECUTE asset_stmt;
DEALLOCATE PREPARE asset_stmt;
SET @asset_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='perangkat' AND COLUMN_NAME='tahun_pengadaan')=0, 'ALTER TABLE perangkat ADD COLUMN tahun_pengadaan SMALLINT NULL', 'SELECT 1');
PREPARE asset_stmt FROM @asset_sql;
EXECUTE asset_stmt;
DEALLOCATE PREPARE asset_stmt;
SET @asset_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='perangkat' AND COLUMN_NAME='sumber_dana')=0, 'ALTER TABLE perangkat ADD COLUMN sumber_dana VARCHAR(150) NULL', 'SELECT 1');
PREPARE asset_stmt FROM @asset_sql;
EXECUTE asset_stmt;
DEALLOCATE PREPARE asset_stmt;
SET @asset_sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='perangkat' AND COLUMN_NAME='harga_beli')=0, 'ALTER TABLE perangkat ADD COLUMN harga_beli DECIMAL(15,2) NULL', 'SELECT 1');
PREPARE asset_stmt FROM @asset_sql;
EXECUTE asset_stmt;
DEALLOCATE PREPARE asset_stmt;
