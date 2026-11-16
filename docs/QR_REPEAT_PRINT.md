# Repeated QR-label printing

An issued asset UUID is reusable. Printing does not issue another UUID, consume a label, change an asset, or remove its QR. Each settled job may be followed by another job; only clicks during an unfinished job are suppressed. The existing per-job UI limit remains 1–24 copies.

## Fixed resource-lifetime defect

Previously the printable Blob URL was revoked after five minutes even if its PDF viewer was still open. The regression first fetches real generated PDFs successfully, advances controlled time past five minutes, and then fails on the old code because those same URLs are no longer readable. This is a confirmed PDF-resource expiry defect, **not proof that an immediate second-click disappearance reported on a particular installation has the same cause**. Immediate repeated jobs already worked in the inspected implementation.

Each PDF URL now belongs to its own viewer. It remains available while that viewer is open and is revoked after that viewer closes, independently of other print jobs. Closing/unmounting the asset detail does not close user PDF viewers. If reading `WindowProxy.closed` throws, cleanup waits rather than interpreting that exception as a closed viewer. Browser document teardown supplies its normal Blob-URL cleanup; keeping an already-open PDF reloadable after the opener document is destroyed is not guaranteed.

## Disabled local-development print control

`AssetDetail` mounts `AssetQrLabel`; `AsetIT` and `AssetTable` do not contain a separate data-print button. The QR control previously combined configuration, preview-image availability and busy/copy validation in one `disabled` expression. The default localhost origin therefore disabled it indefinitely unless the user found the preview checkbox. A missing preview PNG also blocked printing unnecessarily, although PDF generation encodes its own PNG.

The control is now clickable with an existing identity and valid copies. Unsafe/malformed configuration is validated **before opening a popup**, with explicit instructions to repair the school URL or opt into localhost preview. Localhost is never silently accepted for inventory labels; PDF-level URL validation and the preview watermark remain intact. Busy and invalid-copy guards remain, with a visible copy-count repair message. No LAN address is guessed and no backend/database configuration is changed.

The mounted regression now starts at localhost: it asserts the real button is enabled, an unapproved print opens no viewer and explains the preview choice, explicit preview generates three real PDFs, and malformed URL → valid school URL recovers to another PDF. It retains popup failure/retry, remount and resource-expiry checks.

Actual running application inspection reached `http://localhost:5174/login` without an authenticated session. No credentials were guessed, no issuance was attempted and no authenticated asset GET was made (read auditing can write). Therefore the exact button reported in the user's signed-in session remains unconfirmed; this patch fixes the reproducible QR-label disabled condition, not an asserted authenticated full-app UAT pass. Other print controls were source-traced: Perangkat/Perbaikan/Jadwal disable only while printing; Pemeriksaan also disables during loading. Parent integration must identify the user's page if it is one of those controls.

## Repeatable automated checks

From `frontend`:

```sh
node --test tests/asset-qr-repeat-print.test.mjs
npm test
npm run lint
npm run build
```

The focused suite checks real PDF/Blob readability across five minutes, independent cleanup, blocked popups and failed-build retries, duplicate in-flight suppression, unreadable window handles, and the actual mounted React controls across three jobs and a detail remount. It verifies unchanged QR PNG, no issuance writes, and valid/invalid copy-count controls. The mounted test uses a synthetic identity API boundary, not a production account or database.

## Browser evidence and limits

The review used an isolated scratch HTTP fixture containing the actual `AssetQrLabel` and real QRCode/jsPDF libraries, synthetic identity reads, and real popup PDF navigation. Three consecutive UI jobs produced independently decoded PNGs with the same UUID and inspected PDF bytes. Additional checks covered blocked-popup retry, failed PDF delivery then retry, closing one viewer without invalidating others, unmount/reopen, reload, and a synthetic session remount. Controlled time kept all three URLs readable past five minutes and closing viewers released their URLs. No asset/issuance writes were made.

This is component/browser evidence, not authenticated full-application or database persistence UAT. Cancelling a native operating-system print dialog and physical printer behavior were not automated or claimed. No physical print command was sent by the test harness; PDFs retain the application's existing automatic-print action, and the user can retry printing from the PDF viewer.

Ephemeral evidence is under the Hermes scratch directory `repeat-label-evidence`: initial RED, baseline RED confirmation, GREEN, full-suite/lint/build logs, browser lifecycle observations, real PNG/PDF artifacts and hashes. Full-tree verification occurred alongside other dashboard work; rerun after integration before treating those observations as a frozen release result.
