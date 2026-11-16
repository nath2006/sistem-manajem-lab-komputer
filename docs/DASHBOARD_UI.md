# Dashboard UI and Chart.js verification

## Current design direction

The dashboard uses the application's existing fonts, navigation, neutral chart surfaces and native tables. **Every dashboard metric card uses the same solid configured-primary background and automatically contrasting foreground**, matching the Aset IT primary reference. This includes every insight summary, Admin administration statistic and the two existing Teknisi operational statistics. Metric icons are simple Lucide glyphs with no colored bubble; no metric uses a fixed positional palette, pastel supporting surface or gradient. Semantic labels and icons retain meaning. Only chart series retain coordinated blue/amber/green/red families derived from the live school primary; these are not Chart.js default colors. Foregrounds and chart outlines are resolved centrally in `frontend/src/utils/dashboardTheme.js`.

Guru, Kepala Lab and Koordinator Lab now show their greeting as the single content heading, followed by their existing operational action, then the insight panels. Their original request/review/announcement button markup, sizing, colors, icon treatment, spacing and handlers are preserved. Guru's ticket scope is a discreet note inside the ticket chart rather than a leading banner. Admin's lower statistics and two native tables share the exact full-width edges of the upper summaries/charts in both sidebar states.

## Implementation and data boundaries

- `DashboardChart.jsx` uses real Chart.js canvases with only bar/doughnut controllers, bar/arc elements, category/linear scales, tooltip and legend registered. It does not draw pretend SVG charts.
- `chart.js` is now an explicit exact dependency, **4.4.9**, matching the version already installed through the existing `react-chartjs-2` 5.3.0 peer dependency. The native integration does not introduce another chart wrapper.
- Data still comes from the unchanged, role-scoped `GET /dashboard/insights` contract. Existing session ownership, latest-request guards, background refresh, loading/error/retry and unavailable-versus-zero semantics remain intact.
- Category bars, condition arcs and ticket-status bars use solid semantic fill tokens rather than white-blended pastel fills. Those same centralized tokens provide the readable outlines and react to primary-color changes; the primary series keeps the configured primary itself. Seven-theme regression checks retain at least 3:1 contrast for semantic fills against the chart surface.
- Responsive canvases have dedicated relative/min-width-zero containers, bounded heights and `maintainAspectRatio: false` from initialization. Theme changes update the mounted chart's data/options; sidebar resize preserves its identity. Cleanup destroys each instance, including StrictMode mount/unmount cycles. Reduced motion disables animation and updates with `none`.
- Each canvas has an accessible image role/name and an associated native disclosure containing the same full labels/counts. Tooltip interactions and doughnut legend visibility are real Chart.js behavior. Status/condition labels do not depend on color alone; `Perlu perbaikan` cannot be mistaken for `Baik`.
- No dashboard backend/schema/permission changes, source database writes, production logins, onboarding edits or Aset IT implementation changes were made by this dashboard task.

Implementation follows the Chart.js maintainers' responsive, accessibility and updating-chart documentation. Copies of those primary-source Markdown documents are preserved with the scratch evidence.

## Reproduce UI-only browser checks

From `frontend`, run:

```sh
node tests/fixtures/soft-chartjs-server.mjs
```

Open the fixture at `http://127.0.0.1:5207/tests/fixtures/dashboard.html?role=Admin`; supported role query values are Admin, Guru, Kepala Lab, Koordinator Lab and Teknisi. This server supplies explicitly synthetic HTTP responses and synthetic session values. It never proxies to the application backend or connects to a database. Vite uses its own scratch cache, not the active application's optimization cache. `soft-chartjs-matrix.py` and `soft-chartjs-probe.js` provide the browser matrix and actual canvas/geometry measurements.

## Evidence and verified boundaries

Current evidence directory: `C:/Users/LOQ/AppData/Local/hermes/cache/scratch/final-card-evidence`. Its `matrix.py` runs the existing fixture/probe plus `frontend/tests/fixtures/dashboard-primary-cards.js` inside an explicitly owned, disposed CDP browser context. The earlier `soft-chartjs-evidence` directory is preserved as **historical pre-final-card evidence**, not presented as current verification after the solid-card override.

- **140 unique current normal configurations**: five roles × four widths (320, 360, 768, 1280) × seven live primary values (blue, green, red, yellow, near-white, black, navy). Deduplicated by role/width/theme, not by adding repeated runs. Each records computed primary/foreground equality for all metric cards, transparent icon backgrounds, nonblank real canvas pixels, reactive chart fills, stable identities, no document overflow and dashboard text contrast of at least 4.5:1. The matrix asserts actual card counts (Admin 8, Guru 3, Kepala/Koordinator 4, Teknisi 6) to prevent vacuous coverage.
- **Eight current Admin edge comparisons** cover four widths × initial/toggled sidebar states, including the combined native-table bounds. **Twelve current protected-action comparisons** verify exact HTML, computed styles and local geometry against the historical baseline, with greeting/action/chart order checked separately.
- `red-primary-cards.json` and `red-technician-cards.json` preserve the observed failing browser regressions before each corresponding production fix. The old mobile shortcut assertion was investigated, not loosened: all four role shortcuts still satisfy their original minimum-70px native-button contract, and all three protected-action source fixtures pass unchanged.
- `Admin-1280.png`, `Admin-360.png`, `Guru-360.png` and `Teknisi-1280.png` were inspected visually; all role/desktop/mobile preview paths and hashes are listed in the current manifest. Native tables intentionally scroll locally instead of becoming mobile cards.
- Current full frontend/backend logs, lint output, scratch production build and source/evidence SHA-256 hashes are recorded alongside the matrix. Existing `react-test-renderer` deprecation notices and lint warnings are reported rather than suppressed. Backend has no configured lint script.
- Historical `soft-chartjs-evidence/interactions.json` covers actual tooltip, legend, sidebar resize, reduced motion and StrictMode lifecycle behavior before this CSS-only metric override; those interaction observations are **historical**, not a newly rerun interaction suite. Historical earlier pale/monochrome proposals and screenshots are not final evidence.

These fixture checks exercise real React role pages, actual Chart.js and synthetic scoped payloads. They are **not** authenticated production/backend/database UAT, an OS screen-reader audit, physical touch-device testing or proof of source-database fingerprint preservation. The separate backend/review integration must establish those boundaries independently.
