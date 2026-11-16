-- OPERATOR INSTRUCTIONS (not an automatic migration runner).
-- 1. Verify the serving backend process/cwd and its selected database first.
--    A fresh shell's DB configuration alone does not establish the running target.
--    Use the existing trusted authenticated SQL session; do not print passwords,
--    tokens, connection URLs or .env contents. No clone/create/switch/seed/reset.
-- 2. Read ONLY non-secret target/column metadata before approval/execution:
SELECT DATABASE() AS active_database;
SELECT TABLE_SCHEMA,TABLE_NAME,COLUMN_NAME,DATA_TYPE,IS_NULLABLE,COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='user' AND COLUMN_NAME='onboarding_seen_at';
-- 3. Only after matching the currently serving application's verified DB, set
--    @onboarding_expected_database to that exact approved name in THIS session.
--    Example syntax (replace the placeholder; do not execute it literally):
--    SET @onboarding_expected_database = '<verified_active_application_database>';
--    Execute 20261116_onboarding.sql in the same session exactly once.
--    It adds a nullable DATETIME with NULL default only when absent; no data reset,
--    no new table/FK, no role/version key. Existing incompatible metadata must be
--    investigated, not automatically altered. An unset/mismatched guard is a no-op.
-- 4. Repeat the metadata query above. Require DATA_TYPE=datetime,
--    IS_NULLABLE=YES, COLUMN_DEFAULT=NULL, with exactly one row in the verified DB.
-- 5. Parent/operator activates backend source with the approved single restart;
--    this migration itself does not restart any service. Do not restart frontend.
-- 6. Non-secret API envelope examples (illustrative, not live evidence):
--    GET /api/onboarding -> {"data":{"seen":false,"seen_at":null}}
--    POST /api/onboarding/claim -> {"data":{"should_show":true,"seen_at":"2026-11-16T01:02:03Z"}}
--    Repeat claim -> {"data":{"should_show":false,"seen_at":"2026-11-16T01:02:03Z"}}
--    Missing schema -> HTTP 503, code ONBOARDING_SCHEMA_REQUIRED, never fake unseen.
--    POST consumes the first display attempt, not completion. A live POST changes
--    that authenticated account's preference; use only an explicitly approved account.
--    Manual replay must not reset persisted state and needs no reset endpoint.
