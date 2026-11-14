# Security checkpoint before school IT asset development

## Completed actions

- Targeted in-process audit of the historical environment and two SQL dumps. No credential, account-row, email, password-hash or token values were printed or copied into this document.
- Replaced both project JWT signing secrets with independent cryptographically random 64-byte values. Other environment keys, including database configuration/password, were preserved. Local configuration remains ignored by Git.
- Verified the existing nodemon supervisor watches this project's entrypoint, then reloaded that supervisor without changing source-file bytes, supervisor identity or database settings. The frontend service was not stopped.
- Runtime authorization-only probes confirmed the previous access key is rejected and the new access key is accepted before an intentionally unprivileged role is denied. Probe claims omit a user ID, so the inspected audit middleware skips persistence and the route stops before data access. No authentication endpoints or application-database mutations were used for verification.
- Checked refresh-key replacement cryptographically offline. The live refresh endpoint was intentionally not exercised because it records audit activity. Existing users must log in again after the key change.

## Sanitized v1 source tag

- Original source: `92633b3f1780857afe79c9a341f2a2a979cc8536` (`feat(ui): improve UX`).
- Approved sanitized target: `6cbd6d170f2d9e2cc9af9425d680cf4c14e125c3` (`release: sanitized v1.0.0 source snapshot from 92633b3`).
- Annotated `v1.0.0` tag object: `f05e6920886079a933dbcb54e31542c67de4961f`; remote tag and peeled commit were independently read back.
- The new commit has no parent and does not rewrite, delete or move existing commits/branches. Its 123 retained original files have identical Git blob IDs. Historical `.env` and both data-bearing SQL dumps are omitted. Only ignore rules, a placeholder environment example and an explicit provenance note were added.
- The exact new tree was checked for the excluded paths, retained-file identity, known old secret literals, bcrypt literals and high-confidence private-key/provider-token markers. This targeted scan is not an exhaustive certification of every possible sensitive datum.
- `gh` was unavailable, so the user-authorized tag-only fallback was used. A GitHub Release page was not created by this work.

## Remaining historical exposure

The public repository's old history and `archive/v1-92633b3` branch still make the original snapshot reachable. Removing files from a release tree and rotating JWT keys do not remove historical email/password-hash records or copies in clones, forks or caches.

No historical account password was reset, database password changed, repository visibility changed, or history rewrite/force push performed. Account-password resets and any history cleanup require separate authorization and must not be presented as completed by this checkpoint. The source database and private dump files are preserved for the user's rollback requirements.

## Development preservation

The current application was never checked out to the old snapshot. Existing UI/sidebar/activity-log changes and the user's local announcement edit were checkpointed on `feat/aset-it-ticketing-dashboard` as `31f3b91c865abee6fdcca42733e075958d3e4c84`. The main branch was not advanced. Subsequent feature commits belong on this working branch; the published `v1.0.0` tag must remain immutable.

Safe machine-specific evidence is kept only under the designated scratch directory (`jwt-rotation-result.json` and `v1-sanitized-release/manifest.json`); it contains verification booleans and public Git identifiers, not secret values.
