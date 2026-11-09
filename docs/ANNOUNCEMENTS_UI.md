# Announcement UI

## Management and integration

- View/edit/delete actions use the dynamic brand, same-tone hover, visible keyboard focus, accessible names and minimum 44px targets. Existing role restrictions and deletion preview behavior are preserved.
- Add/edit announcement input focus, file selectors, checkbox and save action follow the brand. Semantic error/inactive status colors are retained.
- Attachment links in the management table and detail/edit modals share the same resolver as the public page, eliminating localhost and inconsistent uploads-path concatenation.
- Public carousel navigation icons also follow the brand; the separately edited login heading was not restored or overwritten.
- Parent verification: four management/form/carousel/link regression tests passed; full frontend suite 133/134 passed. The remaining old login-title assertion expects a school name intentionally absent from the existing local heading edit. Lint: zero errors, six existing warnings. Production build passed.
- Parent independently verified the 48-case result count/uniqueness and inspected the final desktop fixture. Fixture listener 5197 was explicitly identified by its script path, stopped, and verified absent through netstat. User frontend/backend servers were not stopped.

## Public detail

The detail page follows the supplied reference image: white page, outlined circular back arrow, centered reading column with left-aligned neutral heading and Indonesian date, compact attachment card, existing megaphone asset, then plain-text body. The title/date/body are real API fields, not copied screenshot content. Back navigation remains a React Router link to `/login`.

All interactive accents use the existing `maroon` token (`--color-maroon`), including hover and focus. Long titles, filenames and uninterrupted body strings wrap without clipping. Loading retains the shared accessible detail skeleton. Error and missing-record states expose retry. Requests are guarded on cleanup; a record belonging to a previous route ID is hidden immediately.

## Shared file resolver

`frontend/src/utils/announcementFile.js` exports:

- `resolveAnnouncementFileUrl(file, { assetBase, apiBase, origin } = {})` → URL string or `null`.
- `getAnnouncementFileName(file)` → decoded final filename, excluding query/fragment for absolute HTTP(S) URLs.

Defaults use `VITE_ASSET_BASE_URL`, `VITE_BASE_URL`, and browser `window.location.origin` (only when a browser exists). Asset-base path prefixes are retained. An absolute API base contributes its origin, not `/api`; a relative `/api` uses the asset base/browser origin. No localhost or `#` fallback is emitted. Stored filenames resolve under `/uploads/pengumuman/`; existing uploads paths and backslash separators are supported. Local filename `?`/`#` characters are encoded as filename characters, while valid absolute HTTP(S) URL queries are retained. Unsafe schemes, credentials, malformed escapes and traversal segments are rejected. Existing GET and attachment-link authentication behavior is unchanged.

The backend controller stores `req.file.filename` in `file_path`; this work did not change the API, database or backend.

## Verification

- Focused Node tests: 25 passed, including existing page skeleton regressions and new article/resolver tests.
- Scoped ESLint: passed for the detail page and resolver.
- Production frontend build: passed.
- Actual detail component bundled by esbuild with explicit synthetic GET responses and compiled production CSS: 48 browser cases (two non-red themes × 320/390/768/1440 widths × populated/no attachment/error/empty/loading/long-content states). No horizontal document overflow. Attachment controls measured at least 44 × 44 CSS pixels. Mobile cases enabled touch emulation and verified coarse-pointer media matching.
- Computed accent colors matched blue `#245799` and green `#16734a`. CDP-forced hover/focus pseudo-states verified theme tint and focus-ring colors; a native pointer CDP command timed out, so this is not a claim of native pointer-hover coverage. Retry after a simulated error and React Router back navigation passed for both themes.
- Desktop and 320px screenshots were visually inspected against the provided reference. The existing `/assets/images/pengumuman.png` loaded successfully.

Detailed historical case results: `docs/announcement-detail-result.json` (synthetic data, no credentials). The earlier 48-case fixture did not exercise real downloads and is not counted as new coverage below.

## Download card revision

Public detail now explicitly renders **title → Indonesian date → attachment card → megaphone illustration → plain-text body**. The reading column is `max-w-6xl`; the heading grows to 42px on desktop. The attachment is at most 34rem wide, with a wrapping 14px filename and a recognizable right-aligned **56 × 56px soft-gray icon tile**, labelled/title/aria-label “Unduh file”. Interactive accents retain the dynamic school theme. At 320px the filename wraps rather than displacing the control.

The section remains below the date when no file exists and says **Belum ada lampiran** without an active/fake download button. An unsafe or invalid file address shows an explicit unavailable status. This does not create attachments or change existing records.

The download button fetches the validated file URL, rejects non-success HTTP responses, creates a blob URL, and triggers an actual browser download using the decoded stored filename. A ref lock and disabled busy state prevent duplicate requests. Failure—including cross-origin CORS denial—appears inline with an accessible retry action; unsupported remote CORS is not hidden by opening a preview tab. The owning request is aborted on unmount/file replacement; object URLs are revoked after the browser consumes the download click. The management detail modal reuses the same component below its creation date, replacing the old preview-only link. The table/edit attachment links and shared resolver remain unchanged.

### Download fixture verification (synthetic fixture, not authenticated UAT)

- Two new markup assertions were observed failing on the previous card, then passing after implementation. Focused public article/card/handler/resolver suite: **6/6 passed**. The handler test exercises the actual callback with controlled browser boundaries, including duplicate click, HTTP failure, retry, original filename, blob revocation and unmount abort.
- Real Chrome, real local HTTP GET and generated valid PDF: **6 geometry cases and 6 disk-verified downloads** (1440/390/320px × blue/green). Each saved PDF is **3,221 bytes**, byte-equal to the generated fixture, and the browser suggested `synthetic-notice.pdf`. No binary was placed in the repository.
- Geometry asserts title/date/card/illustration/body ordering, right control containment, 56px tile, dynamic computed colors and no horizontal document overflow. Mobile enables touch emulation and verifies coarse-pointer media. A separate 320px long-unbroken-filename case also fits.
- Additional browser interactions passed: two immediate clicks produce one GET; HTTP 503 displays an error; retry produces a browser download; a second real origin without CORS permission displays the inline failure; missing/unsafe attachments expose no active download; unmount aborts an in-flight request. Blob creation/revocation is balanced in every main download case. No uncaught page errors occurred (the intentional HTTP/CORS network failures are expected).
- Latest full frontend suite: **136/137 passed**, with only the pre-existing login-title assertion (`Laboratorium Komputer — Sekolah Anda`) failing. The user's existing login heading was preserved. Lint: **0 errors / 6 existing warnings**. Production build passed.
- Local machine-readable results: `docs/announcement-download-result.json`. Reproduction harness, generated PDF, downloaded bytes, full test log and previews are under `C:/Users/LOQ/AppData/Local/hermes/cache/scratch/announcement-download-probe/`. Previews: `preview-1440.png`, `preview-390.png`, `preview-320.png` (explicit demo content; simplified fixture back text, not a full-page navigation screenshot).
- Both owned fixture listeners were closed and their ports checked absent with netstat. Existing Vite 5174/backend 5500 were not stopped. No backend, DB, environment, credentials, commit or push changes.

### Publication integration

- Independently verified all six saved PDF files against recorded byte lengths and SHA-256 values, six unique geometry cases, interaction checks and the closed fixture port.
- Added a regression proving the management modal also places its download card below the date. Updated its branding regression to inspect the actual download button instead of the removed preview anchor.
- The login accessibility regression now asserts the user's existing school-name-free heading exactly; the login UI was not restored to the old title.
- Combined LAN, announcement and login regressions: **15/15 passed** before the independent mobile-table work. Historical full-suite counts above describe their respective earlier revisions, not the final publication gate.
