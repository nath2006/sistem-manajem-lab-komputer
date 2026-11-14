# v1.0.0 — sanitized historical source snapshot

Original source commit: 92633b3f1780857afe79c9a341f2a2a979cc8536
Original message: feat(ui): improve UX
Original commit date: 2026-10-12 (Asia/Jakarta)
First recorded Hermes commit: 6f7699f7117db68014977d4ecc9843c1e8e56c6c

This release contains the pre-Hermes application source, with security exclusions explicitly approved by the repository owner. Its new commit hash is NOT the original historical hash. Application files retained from the source commit are byte-identical Git blobs.

Excluded: backend/.env and the two data-bearing database dumps. Added: this provenance note, root ignore rules, and a placeholder-only backend/.env.example. No account records, password hashes or live configuration are included in those added files.

This is a new parentless snapshot commit; existing branches/history are not rewritten, deleted or force-pushed. Historical sensitive files remain reachable through old repository history/refs. A clean release archive does not remove that historical exposure.

Rollback prerequisites: preserve your separate private database backup and configure fresh local secrets. This source snapshot is not a database backup or a fresh database bootstrap package. Never restore exposed JWT secrets. Configure the placeholder environment using your existing v1-compatible database; no schema or data migration is applied by this release.

Historical functionality: role-based authentication and dashboards; user/laboratory/device management; lab schedule requests and weekly schedule; device inspection/check/repair records and reporting; announcements with attachments; existing PDF export/print controls. These describe existing source modules, not a new runtime test of the historical version.
