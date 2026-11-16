-- Manual additive migration ONLY on the verified active application database.
-- Operator must set @onboarding_expected_database to the verified active DB name
-- in this same session; unset/mismatched target fails closed with no ALTER.
-- Do not create/switch/clone databases, seed accounts, or reset existing state.
SET @onboarding_target_ok = (@onboarding_expected_database IS NOT NULL AND BINARY DATABASE() = BINARY @onboarding_expected_database);
SET @onboarding_sql = IF(@onboarding_target_ok = 1 AND (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='user' AND COLUMN_NAME='onboarding_seen_at')=0, 'ALTER TABLE user ADD COLUMN onboarding_seen_at DATETIME NULL DEFAULT NULL', 'SELECT 1 AS onboarding_no_change');
PREPARE onboarding_stmt FROM @onboarding_sql;
EXECUTE onboarding_stmt;
DEALLOCATE PREPARE onboarding_stmt;
-- Verify metadata after execution (also detects an incompatible existing column).
SELECT TABLE_SCHEMA,TABLE_NAME,COLUMN_NAME,DATA_TYPE,IS_NULLABLE,COLUMN_DEFAULT
FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='user' AND COLUMN_NAME='onboarding_seen_at';
