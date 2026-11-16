# Log Aktivitas UI and read filters

## Presentation

The supplied reference is used for its hierarchy: separate rounded filter bar, Aktivitas panel/legend/count, and native five-column Waktu / Siapa / Aksi / Data / Rincian table. Surfaces remain light; interactive branding uses the existing dynamic `maroon` alias. No payment/member examples are inserted into application data.

Rows preserve every existing audit field: two-line Asia/Jakarta time/date, username (or historical user ID/anonymous fallback) and role, method-derived action and real route resource, HTTP status/method/path/duration, and original audit action. Long endpoints use a native expandable details element. React text interpolation escapes audit values. HTTP errors remain semantically red, not brand-colored. The existing TableScrollRegion owns keyboard-accessible horizontal scrolling; a feature-local 900px minimum keeps the five columns readable without document overflow.

Filter changes/reset return to page 1 and request the server again. Empty filters are omitted. An effect cleanup guard ignores both success and failure from obsolete requests. Existing results remain visible while refreshing or on failure; errors explicitly identify them as previous results, suppress the outdated count, disable pagination, and offer retry. First load uses LoadingSkeleton. Filtered empty state offers reset.

## GET `/api/activity-logs`

Authentication and Admin restriction remain on the existing router. No new write endpoint, migration, schema change, or logger modification.

Existing `page` (default 1) and `limit` (default 20, max 100) contracts and unfiltered `{data,pagination}` envelope are retained.

Optional validated query parameters:

| Parameter | Meaning |
| --- | --- |
| `actor` | Positive decimal historical `user_id` (up to 15 digits). Omit for everyone, including anonymous events. |
| `category` | `create`, `update`, `delete`, `read`, `login`, `logout`, `refresh-token`, or `other`. |
| `date` | Real calendar day `YYYY-MM-DD`, interpreted in Asia/Jakarta/WIB. |
| `facets=1` | Adds `{facets:{actors:[{user_id,username}]}}` from activity snapshots only. No users-table join, credentials, or query-string values. |

Invalid provided values (including repeated/array values) return 400 before querying. Category semantics mirror presentation: auth action first; DELETE -> delete; POST approval/rejection/ticket actions -> update; other POST -> create; PUT/PATCH -> update; GET/HEAD/OPTIONS -> read; otherwise other. Labels describe requested operations, not guaranteed successful mutations; HTTP status remains visible.

Count and rows use the same parameterized WHERE conditions **before** LIMIT/OFFSET. Date ranges are `[Jakarta midnight, next Jakarta midnight)` using UTC epoch parameters and MySQL FROM_UNIXTIME, preserving session-timezone-correct TIMESTAMP comparisons. This includes every instant on the selected day, including fractional seconds, without applying a function to the indexed timestamp column.

Facets are global rather than current-page values, grouped by historical user ID with a representative username snapshot. They intentionally do not expose a live directory or anonymous identity. Without `facets=1`, no new envelope fields are added.

## Verification and boundaries

Focused tests: `node --test backend/tests/activity-filters.test.js backend/tests/settings-activity.test.js backend/tests/auth-activity.test.js`; from frontend: `node --test tests/activity-presenter.test.mjs tests/activity-view.test.mjs`.

Browser fixture uses the actual LogAktivitas component/hook, actual TableScrollRegion/CSS and actual backend read controller, with only the shell/auth/HTTP adapter replaced and an injected in-memory MySQL query function. Synthetic 47-row lab-domain fixtures are scratch-only, never application DB records. Actor filtering finds 23 records across pages, actor+delete finds 11, and adding 11 November 2026 finds 7. It covers page reset, clear/reset, latest-success/latest-failure guards, preserved rows on failure, retry, empty/reset, and native table/overflow/light surfaces at 320/390/1440 with blue/green brand variables.

Artifacts live in `C:/Users/LOQ/AppData/Local/hermes/cache/scratch/activity-browser-checks.json`, `activity-browser-matrix.json`, and `activity-*.png`. This is component/controller fixture evidence, not authenticated production-database UAT or execution of SQL against MySQL. No source DB writes, environment changes, credentials read/printed, or commits/pushes.
