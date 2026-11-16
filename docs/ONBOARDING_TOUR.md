# Guided onboarding — Step 6

Verified **November 15, 2026 (UTC+07)** on `feat/aset-it-ticketing-dashboard`, HEAD `af3ce9fda32a046dae98855792bc119542b5ddf1` plus concurrent uncommitted ticket/dashboard work. This revision extends the existing **Driver.js 1.10.2** anchored tour, not a new onboarding menu, welcome modal or slide system.

## Content and permissions

All five existing roles retain their original role-specific task steps, welcome and profile replay. New short Indonesian steps:

| Title | Target contract | Role-specific explanation |
| --- | --- | --- |
| Aset IT Sekolah | `[data-tour-path="/aset-it"]` | Everyone can read Pembelajaran and Operasional assets, including printer and network devices. Admin manages all; Kepala Lab manages only Pembelajaran assets in their assigned lab; Guru, Koordinator Lab and Teknisi are read-only. |
| QR dan verifikasi aset | Same existing asset navigation target | Admin issues QR for all assets; Kepala Lab issues only within that same assigned Pembelajaran scope. Other roles view existing QR and print existing labels. Public verification is distinct from private procurement data, available only according to authenticated access. |
| Bantuan (Ticketing) | `[data-tour-path="/ticketing"]` | Retains the existing route. Admin manages classification, priority, status and assignee; Koordinator coordinates assignment/follow-up; Teknisi handles assigned work; Guru reports/tracks their tickets; Kepala Lab reports/tracks lab needs. Explains related assets, comments and history without changing authorization or workflows. |
| Grafik dashboard | `[data-tour="dashboard-charts"]` | Admin: category/condition/ticket status. Kepala Lab: school assets, own reports and tickets linked to their lab assets. Koordinator: category/condition and ticket status for coordination. Teknisi: category/condition and ticket status within Bantuan visibility. Guru: status of tickets they reported. |

Sidebar/menu labeling, dashboard components and chart data are owned by other steps. No new navigation attributes are needed: the persistent shell already emits `data-tour-path` for actual links. The dashboard owner supplies the **visible `data-tour="dashboard-charts"` wrapper for each role**; this step does not edit dashboard cards/routes. Chart wording describes each role's overview, not a promise of extra permissions.

The chart step is optional **only when its target is absent/hidden**, such as profile replay on a non-dashboard page. Available dashboard charts are highlighted. Missing mandatory role/navigation targets still stop cleanly without completion, as before. Target selection runs after the existing drawer coordination has committed. The tour never navigates or changes business data.

## Completion, cleanup and branding

- Existing architecture supports versioned completion, so its sole version constant changes **v2 → v3**. New key: `lab:onboarding:v3:<encoded-account>:<encoded-role>`.
- v2 and unrelated localStorage records are not removed or rewritten. Existing users can learn the new features once; profile **Panduan awal** replay remains available after Done or Skip.
- Only explicit Done/Skip persists completion. Escape, loading, account/role changes and unmount do not. Persistent shell identity, mobile drawer ownership, body scroll locks, original scroll positions and connected focus restoration remain intact.
- School/user text still uses `textContent`, never HTML interpolation.
- Tooltip surfaces remain neutral. Controls use the school's dynamic `--color-maroon`; scoped tooltip foreground/accent/hover tokens select readable text for very light or dark configured colors without modifying the school's theme. Yellow previously produced white-on-yellow next-button text; the regression and actual-browser contrast checks now cover this.
- No application-wide dark-mode feature is added or claimed; dark **primary colors** are tested on the existing neutral tooltip surface.

## Hover-contrast blocker follow-up — November 15, 2026 (UTC+07)

The only production change in this follow-up is the Skip button's hover background: neutral white instead of an 8% school-primary tint. Back retains its existing tint; Next retains its school-primary hover tokens. No theme, tooltip, 44px control or focus behavior was changed.

Strict RED → GREEN is recorded in scratch: the new CSS-parsing regression computes Skip's actual foreground and CSS hover blend across red, green, yellow, pale and navy. Before the fix, red failed at **4.221205578:1** and green at **4.436610569:1**. An actual Chromium pointer-hover run also failed for those two colors before the CSS change; its canvas-composited 8-bit samples were **4.232836050:1** and **4.445292736:1**. After the fix, **5 themes × 3 controls = 15 actual-hover checks passed**, minimum **4.607518094:1**. The browser checks `:hover`, computed foreground/background composited over the actual tooltip surface, preserved CSS primary, 44px dimensions and keyboard `:focus-visible` outlines—not normal text against assumed white.

Three current mobile lifecycle cases also passed: missing mandatory asset-navigation target aborts with **no v3 completion** and restores drawer, focus, portal and body lock; both **absent and hidden optional chart targets** reach explicit Done, persist exactly `lab:onboarding:v3:step6-fixture:Guru`, remain complete after reload and preserve v2/unrelated storage. These add coverage to existing behavior, not production lifecycle changes.

| Current follow-up command | Actual result |
| --- | --- |
| `cd frontend && node --test src/Components/Onboarding/*.test.mjs` | **14 passed, 0 failed** |
| `cd frontend && npm test` | Final rerun **206 passed, 0 failed, 0 skipped**; first attempt **205/206**, with an unrelated assets-recovery React `useRef` harness error during concurrent ticket changes; both logs retained |
| `cd backend && npm test` | **133 passed, 0 failed, 0 skipped** |
| `cd frontend && npm run lint` | Exit 0; **0 errors, 7 warnings** |
| `cd frontend && npm run build -- --outDir <scratch>/scratchletris-onboarding/hover-review/build --emptyOutDir` | Exit 0; real scratch production build |

Current follow-up artifacts are under the evidence root's `hover-review/`: `hover-pointer-red.json`, `hover-pointer.json`, `mandatory-target-current.json`, `optional-target-current.json`, test/lint/build logs and `server-cleanup.json`. The root `hover-red.log` captures the unit RED. `hover-review/evidence.json` hashes all **10 owned onboarding source/evidence files** and current artifacts; the root manifest retains historical results and links this follow-up.

**Historical boundary:** the **60-case matrix, 19 lifecycle checks and two screenshots below are preserved earlier evidence, NOT rerun by this hover follow-up**. The current browser proof is only the five-theme/15-control hover run and the three missing-target cases. Synthetic auth/settings/chart targets remain non-production UAT; no DB review commands, credentials, environment or Git writes were used. Only owned fixture Node PID **31128** was stopped; `netstat` verified **no LISTENING entry on port 5196** afterward.

## Strict TDD and automated results (historical Step 6 run)

New `step6.test.mjs` assertions were run RED before their production changes, then GREEN in vertical slices: asset scope → QR/private boundary → role-specific Bantuan → optional role charts → v3 preservation → extreme tooltip contrast. Existing Driver lifecycle/storage tests are retained; the previous version-number guard now expects v3.

Latest integrated-tree results:

| Command | Result |
| --- | --- |
| `cd frontend && node --test src/Components/Onboarding/*.test.mjs` | **13 passed, 0 failed** (6 new Step 6 regressions) |
| `cd frontend && npm test` | **185 passed, 0 failed, 0 skipped** |
| `cd backend && npm test` | **133 passed, 0 failed, 0 skipped** on the final rerun (initial concurrent run: 132/132); no DB review/migration commands run |
| `cd frontend && npm run lint` | Exit 0; **0 errors**, existing/concurrent warnings recorded in `frontend-lint-final.log` |
| `cd frontend && npm run build -- --outDir <scratch>/scratchletris-onboarding/build --emptyOutDir` | Exit 0; real production build in scratch, not the normal dist directory |

**Concurrent revision note:** the initial full frontend run had 179/185 passing, with six dashboard SSR harness failures importing `dashboardTheme.css` without an output path. No dashboard/helper file was edited by this step. The later full run passed 185/185 after concurrent dashboard work changed. Both initial and final logs are preserved; final counts must not be replaced by the older partial result. Tests emit some pre-existing React test-renderer/import.meta warnings; they are not represented as pristine output.

## Actual Driver.js browser verification

Synthetic fixture: `frontend/tests/fixtures/onboarding-step6.html` and `.jsx`. It uses actual SettingsProvider, DashboardLayout, persistent shell, profile menu, installed Driver.js and StrictMode. Auth/settings and the chart **target** are synthetic. The chart fixture is not a production chart/data/API test.

- **60 unique cases:** Admin, Guru, Kepala Lab, Koordinator Lab, Teknisi × **360×800, 768×1024, 1280×900** × **yellow `#ffff00`, pale `#fafafa`, near-black/navy `#000020`, red `#ff0000`**. Mobile/tablet include touch and verified coarse-pointer emulation.
- Each traverses all actual configured targets including assets, QR, Bantuan and charts; exercises Back, Done, profile Replay, Skip and Escape; checks visible/non-inert anchors, contained popovers, 44px controls, stable shell/boot, no document horizontal overflow, no HTML injection, no browser error/rejection events, unchanged old/unrelated storage and portal/overlay/body-lock cleanup.
- Computed normal next-button and Skip text contrast is **at least 4.5:1** in every extreme case. Actual school CSS primary value is checked rather than a hard-coded test color.
- **19 lifecycle checks:** previously open mobile drawer and both scroll positions, drawer lock ownership, focus return, bidirectional Tab wrapping, keyboard Done, no completion on Escape/loading/identity/role changes/unmount, completed-account gating, plus reduced motion and real blue/green pointer hover channel comparisons.
- **1 optional-target regression:** a page without dashboard charts still reaches profile and explicit Done, without navigating.
- Two inspected screenshots: mobile Kepala Lab QR/yellow and desktop Admin chart/navy. Tooltips are readable and contained. Chart preview highlights the explicitly labeled synthetic target, not a production chart.

**Boundary:** Chromium synthetic-component regression, **not production login/authenticated UAT**, real account permissions, DB persistence, printer delivery, uploaded-logo or cross-browser/screen-reader testing. Asset/QR/ticket authorization is described from the existing contracts, not granted by tour text.

## Evidence and reproduction

Evidence root (outside Git):

`C:/Users/LOQ/AppData/Local/hermes/cache/scratch/scratchletris-onboarding`

Contains `matrix.json`, `lifecycle.json`, `optional-target.json`, `previews.json`, the PNGs, initial/final test/lint/build logs, `server-cleanup.json` and `evidence.json` with programmatically aggregated counts and SHA-256 hashes. The manifest identifies exact owned source/evidence artifacts. Do not treat old `docs/onboarding-tour*` files from the prior v2 verification as Step 6 evidence.

Reproduce the fixture with an exclusively owned Vite server from frontend:

```sh
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5196 --strictPort
```

Wait for HTTP 200 at `/tests/fixtures/onboarding-step6.html`. In `browser_exec`, create an owned CDP browser context and page, attach with `flatten=True`, then set `STEP6_REPO`, `STEP6_EVIDENCE` and `STEP6_SESSION` before executing `onboarding-step6-browser.py`. The runner pins all actions to that session. Run `step6_matrix(0,10)` through `(50,60)` in separate batches, `step6_absent()` and the inherited `run_lifecycle()`. Create/attach/dispose the owned context **within each call**: observed harness sessions/targets did not survive across calls. Persisted results deduplicate by role/viewport/theme.

Harness issues were distinguished from production failures: an initial unpinned input timeout, stale CDP target/session IDs across calls, interrupted targets, one transient IPC socket error and a fixture-readiness timeout during concurrent test/build activity. Bounded call-local owned contexts and resumed batches completed the full final-wording matrix and all lifecycle assertions; no speculative production lifecycle patch was made. Lifecycle results now persist incrementally. Chart copy was tightened with an additional RED→GREEN assertion after the concurrent owner's actual category/condition/ticket-status contract became available.

The owned fixture listener was stopped by its exact verified native Node PID after the background shell wrapper had already exited; port **5196** was verified to have no LISTENING entry. No unrelated process was stopped. No DB, environment, secrets, uploads, dependency manifests, shared app/sidebar/ticket/dashboard implementation, commits, staging, pushes, main branch or tags were changed by this step.
