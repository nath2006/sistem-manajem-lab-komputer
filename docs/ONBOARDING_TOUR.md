# Guided onboarding verification

Verified November 7, 2026 on the current working tree. Driver.js **1.10.2**, MIT; actual installed library, not a mocked tooltip. No new production change was justified in this resumed verification.

## Results

- `cd frontend && npm test`: **124 passed, 0 failed, 0 skipped**. The script discovers all 40 current `.test.js`/`.test.mjs` files across frontend/tests, root tests and colocated Onboarding tests.
- `npm run lint`: exit 0, **0 errors / 6 existing warnings** (Footer unused disable; effect dependencies in PengecekanStatus, AddPerangkat, TeknisiDashboard, authLoginCover; AuthContext refresh export).
- `npm run build`: exit 0.
- Checked-in `frontend/tests/fixtures/onboarding-browser.py`: **40 unique matrix cases passed**, independently rerun in four batches, plus **19 lifecycle checks passed**. Counts and uniqueness were calculated from persisted JSON, not old partial artifacts.
- Matrix: Admin, Guru, Kepala Lab, Koordinator Lab, Teknisi × 320×640, 390×844, 768×1024, 1440×900 × blue `#2563eb`, green `#16a34a`. Narrow viewports have touch/coarse-pointer emulation.
- Each case traverses actual visible role targets, Back, Done, profile Replay, Skip and Escape; checks viewport containment, no hidden/inert highlight, no horizontal overflow, 44px controls, stable shell/boot, storage and portal/scroll cleanup.
- Lifecycle covers previously open mobile drawer ownership and both scroll positions, Escape without completion, loading/identity/role changes, StrictMode fixture startup, unmount without completion, exact bidirectional Tab wrap, focus restoration, native keyboard Enter on Done, completed-account gating, reduced motion and real mouse hover in both colors.
- Hover assertion was strengthened to compare the actual RGB channels against 90% brand + 10% white (rather than accepting any RGB string).

## Interrupted-run investigation

The available old task log ends after five successful checked-in cases and a **truncated traceback**; it does not retain the exact final exception. Its PASS numbers were accumulated artifact counts, not matrix case indices. Therefore the precise old failure cannot honestly be identified from that log. The current checked-in runner completed all cases and lifecycle checks without a production assertion failure; no speculative production patch was made.

This resumed run initially hit `SecurityError: Failed to read localStorage ... Access is denied` on `chrome-error://chromewebdata/` because its first navigation preceded fixture-server readiness. Re-navigation after HTTP readiness resolved it. This is browser/server harness startup, not an onboarding or storage-permission defect. Earlier old-log issues (body focus fallback, double Tab trap and native Enter dispatch) already have fixes on disk and passed the current real-browser checks.

## Reproduction

Start only the frontend fixture server from frontend:

```sh
npm run dev -- --host 127.0.0.1 --port 5188 --strictPort
```

Wait for HTTP 200 at `/tests/fixtures/onboarding.html` before browser navigation; do not evaluate localStorage on an error/internal page. In a browser_exec session navigate there, load the checked-in Python runner using `exec(open(<absolute runner path>).read())`, then execute `run_matrix(0,10)`, `run_matrix(10,20)`, `run_matrix(20,30)`, `run_matrix(30,40)` and `run_lifecycle()`. Use separate calls/batches rather than a single long browser command. Results persist in the browser workspace and deduplicate by role/viewport/theme.

## Evidence and boundaries

- `docs/onboarding-tour-result.json`: machine-readable aggregate with actual matrix and lifecycle observations.
- `docs/onboarding-tour/matrix.json`, `lifecycle.json`: raw persisted browser observations.
- `docs/onboarding-tour/frontend-{test,lint,build}.log`: current command outputs.
- `docs/onboarding-tour/desktop-blue.png`, `mobile-green.png`: newly captured and visually inspected. Tooltip/highlight readable and contained; mobile wraps controls cleanly at 320px. The HTML-looking school name is intentional injection test text and remains literal.

This is **not full authenticated UAT**. The fixture renders actual providers, persistent DashboardLayout, DashboardShell and Driver tour in StrictMode, but supplies synthetic auth state and a public-settings API adapter. No real login, backend route, database, user data, uploaded-logo flow or cross-browser/screen-reader session was tested. Browser coverage is Chromium only.

The test Vite server was stopped and port 5188 verified closed. The process-manager stop timed out, so the exact owned Vite process was identified from its command line and terminated directly. Backend, DB, environment and commits were untouched.
