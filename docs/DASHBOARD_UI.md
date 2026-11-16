# Dashboard UI and Chart.js verification

## Current design direction

The dashboard uses the application's existing fonts, navigation, neutral chart surfaces and native tables. **Every dashboard metric card uses the same solid configured-primary background and automatically contrasting foreground**, matching the Aset IT primary reference. This includes every insight summary, Admin administration statistic and the two existing Teknisi operational statistics. Metric icons are simple Lucide glyphs with no colored bubble; no metric uses a fixed positional palette, pastel supporting surface or gradient. Semantic labels and icons retain meaning. Chart series now use the exact seven Chart.js Colors-plugin default pigments, independent of school branding; the brand metric cards remain unchanged and dynamic. Chart palettes and semantic label mappings are resolved centrally in `frontend/src/utils/dashboardTheme.js`.

Guru, Kepala Lab and Koordinator Lab now show their greeting as the single content heading, followed by their existing operational action, then the insight panels. Their original request/review/announcement button markup, sizing, colors, icon treatment, spacing and handlers are preserved. Guru's ticket scope is a discreet note inside the ticket chart rather than a leading banner. Admin's lower statistics and two native tables share the exact full-width edges of the upper summaries/charts in both sidebar states.

## Implementation and data boundaries

- `DashboardChart.jsx` uses real Chart.js canvases with only bar/doughnut controllers, bar/arc elements, category/linear scales, tooltip and legend registered. It does not draw pretend SVG charts.
- `chart.js` is now an explicit exact dependency, **4.4.9**, matching the version already installed through the existing `react-chartjs-2` 5.3.0 peer dependency. The native integration does not introduce another chart wrapper.
- Data still comes from the unchanged, role-scoped `GET /dashboard/insights` contract. Existing session ownership, latest-request guards, background refresh, loading/error/retry and unavailable-versus-zero semantics remain intact.
- Category bars and ticket-status bars use the default Colors-plugin RGB pigments with its standard 50% background opacity; condition arcs use the default opaque doughnut fills. Explicit colors (rather than automatic positional reassignment) keep semantic conditions stable: Baik = default green (`rgb(75, 192, 192)`), Dalam Perbaikan = blue, Perlu Perbaikan = yellow, Rusak = red. Legend swatches derive from the same dataset fills. No chart pigment depends on the school primary; configured-primary metric cards and readable text tokens remain dynamic.
- Responsive canvases have dedicated relative/min-width-zero containers, bounded heights and `maintainAspectRatio: false` from initialization. Theme changes update the mounted chart's data/options; sidebar resize preserves its identity. Cleanup destroys each instance, including StrictMode mount/unmount cycles. Reduced motion disables animation and updates with `none`.
- Each canvas has an accessible image role/name and an associated native disclosure containing the same full labels/counts. Tooltip interactions and doughnut legend visibility are real Chart.js behavior. Status/condition labels do not depend on color alone; `Perlu perbaikan` cannot be mistaken for `Baik`.
- This chart revision makes no dashboard backend/schema/permission changes or database operations. Aset IT changes are limited to condition badge colors in its inventory table and a single blue in-repair branch in the user-modified verification UI; the surrounding UI is preserved.

Implementation follows the Chart.js maintainers' responsive, accessibility and updating-chart documentation. Copies of those primary-source Markdown documents are preserved with the scratch evidence.

## Reproduce UI-only browser checks

From `frontend`, run:

```sh
node tests/fixtures/soft-chartjs-server.mjs
```

Open the fixture at `http://127.0.0.1:5207/tests/fixtures/dashboard.html?role=Admin`; supported role query values are Admin, Guru, Kepala Lab, Koordinator Lab and Teknisi. This server supplies explicitly synthetic HTTP responses and synthetic session values. It never proxies to the application backend or connects to a database. Vite uses its own scratch cache, not the active application's optimization cache. `soft-chartjs-matrix.py` and `soft-chartjs-probe.js` provide the browser matrix and actual canvas/geometry measurements.

## Historical evidence and verified boundaries (before the default-palette override)

This section records the earlier metric-card revision only. Reactive chart-fill assertions below are no longer the current contract; use `default-chart-evidence` for the latest chart revision.

Current evidence directory: `C:/Users/LOQ/AppData/Local/hermes/cache/scratch/final-card-evidence`. Its `matrix.py` runs the existing fixture/probe plus `frontend/tests/fixtures/dashboard-primary-cards.js` inside an explicitly owned, disposed CDP browser context. The earlier `soft-chartjs-evidence` directory is preserved as **historical pre-final-card evidence**, not presented as current verification after the solid-card override.

- **140 unique current normal configurations**: five roles × four widths (320, 360, 768, 1280) × seven live primary values (blue, green, red, yellow, near-white, black, navy). Deduplicated by role/width/theme, not by adding repeated runs. Each records computed primary/foreground equality for all metric cards, transparent icon backgrounds, nonblank real canvas pixels, reactive chart fills, stable identities, no document overflow and dashboard text contrast of at least 4.5:1. The matrix asserts actual card counts (Admin 8, Guru 3, Kepala/Koordinator 4, Teknisi 6) to prevent vacuous coverage.
- **Eight current Admin edge comparisons** cover four widths × initial/toggled sidebar states, including the combined native-table bounds. **Twelve current protected-action comparisons** verify exact HTML, computed styles and local geometry against the historical baseline, with greeting/action/chart order checked separately.
- `red-primary-cards.json` and `red-technician-cards.json` preserve the observed failing browser regressions before each corresponding production fix. The old mobile shortcut assertion was investigated, not loosened: all four role shortcuts still satisfy their original minimum-70px native-button contract, and all three protected-action source fixtures pass unchanged.
- `Admin-1280.png`, `Admin-360.png`, `Guru-360.png` and `Teknisi-1280.png` were inspected visually; all role/desktop/mobile preview paths and hashes are listed in the current manifest. Native tables intentionally scroll locally instead of becoming mobile cards.
- Current full frontend/backend logs, lint output, scratch production build and source/evidence SHA-256 hashes are recorded alongside the matrix. Existing `react-test-renderer` deprecation notices and lint warnings are reported rather than suppressed. Backend has no configured lint script.
- Historical `soft-chartjs-evidence/interactions.json` covers actual tooltip, legend, sidebar resize, reduced motion and StrictMode lifecycle behavior before this CSS-only metric override; those interaction observations are **historical**, not a newly rerun interaction suite. Historical earlier pale/monochrome proposals and screenshots are not final evidence.

These fixture checks exercise real React role pages, actual Chart.js and synthetic scoped payloads. They are **not** authenticated production/backend/database UAT, an OS screen-reader audit, physical touch-device testing or proof of source-database fingerprint preservation. The separate backend/review integration must establish those boundaries independently.

## Historical local revision: vivid chart-only pigments (superseded November 16, 2026)

The user subsequently rejected this custom palette. The measurements below are retained only as historical evidence, not current acceptance claims. The current default-palette checks live in scratch `default-chart-evidence`.

The earlier solid-fill aliases still inherited dark semantic text colors. Chart fills now use a separate primary-derived HSL palette: saturated blue, emerald, amber and red families with deliberate lightness. Every series changes with live branding, including white, black and navy; chart-primary visibility is normalized while metric-card primary tokens remain untouched. Existing contrast-safe text/outlines, labels, numeric disclosures and async ownership behavior are unchanged. No gradients or shadows were introduced.

- TDD: the new regression first failed on the old blue info fill's saturation (0.731). It now checks saturation, lightness, chroma, separation from semantic text, preserved raw primary and distinct colors across eight extreme primaries. The previous solid-alias test was updated to the explicitly requested new contract, retaining outline contrast and live-theme coverage.
- Current execution: **232 frontend tests, 142 backend tests, and the unchanged 14-test async lifecycle scope passed**; lint has zero errors and seven existing warnings; the production build succeeded into scratch. Counts describe the execution-time tree, including concurrent user work, not a claim of ownership over those edits.
- Current browser proof: **16 Admin configurations** (360/1280 × blue/green/maroon/red/yellow/white/black/navy), **48 real chart checks**, no blank canvases or document overflow, stable mounted instances, exact dataset-to-token equality, nonzero opaque pixels of each actual fill, and existing outlines at least 3:1 against white. All 48 chart palettes differ from their measured baseline. Other roles and historical interactions were not freshly rerun.
- Actual blue condition colors changed from `#156f5e / #7b5e34 / #2159d4` to `#0cf07c / #f09b0c / #0c5ef0`; measured saturation is about 0.905 and lightness about 0.494, rather than the old muted emerald/amber lightness of 0.259/0.343.
- Evidence: `C:/Users/LOQ/AppData/Local/hermes/cache/scratch/vivid-chart-evidence/manifest.json` contains exact source/evidence hashes and registered counts; `before.json`, `after.json`, `assertions.json` and `palette-difference.json` preserve actual datasets, pixel counts and computed differences. `comparison-360.png` and `comparison-1280.png` compare baseline replay (left) with current actual canvas pixels (right) on white; inspected canvas exports show crisp, visibly more vivid fills.
- Screenshot limitation: the browser compositor returned invalid black/white page screenshots. Those files are retained as failed evidence, not proof. Canvas PNG exports are real rendered Chart.js buffers; **baseline-replay** exports deliberately replay the originally measured baseline fills, rather than pretending to be original whole-page screenshots. Full-page visual acceptance remains a manual review item. This synthetic UI-only run never accessed production authentication or databases.

Changes are local for review; no commit or push was made. User-owned layout/footer/table/asset-verification/editor changes remain outside this revision.

## Current default-palette revision (November 16, 2026)

- Exact installed Chart.js 4.4.9 Colors source was read from `dist/chart.js.map` (`src/plugins/plugin.colors.ts`, not `.js`). The version-tagged upstream TypeScript source was fetched and is byte-identical. Official colors documentation confirms the seven-color plugin and explicit-color override behavior. Artifacts are in scratch `default-chart-evidence`.
- Custom HSL generation is removed. Seven exact default RGB tokens are fixed across live brands; default bar background alpha is 0.5 and doughnut colors are opaque. Four condition labels map independently of server row order/subsets to default green, blue, yellow and red. The default green is Chart.js's teal-looking `rgb(75, 192, 192)`, not a custom replacement. Legend and dataset colors match.
- Asset inventory now has labeled condition badges. The existing device table already had the four correct semantic classes; the user-modified public verification UI receives only the missing blue in-repair branch. Brand metric cards remain unchanged and dynamic.
- RED was observed for exact palette, in-repair tone, public verification blue badge and inventory table badge before implementation. Updated default-palette tests replace the old HSL expectations; existing role, async/session and lifecycle tests are preserved.
- Execution-time full frontend suite: **238 passed, 0 failed/skipped**; lint **0 errors, 7 warnings**; scratch production build passed. This includes concurrent sibling work and must be refreshed by the parent after final integration.
- Browser fixture: **10 live-brand/viewport configurations plus 3 condition reorder/subset configurations**, totaling **39 real canvas observations**, validate opaque condition pixels, legend equality, stable mounted IDs and unchanged live-primary card backgrounds. An additional five-role shared-view check covers Guru's ticket-only scope; it is not a full role-page matrix. Real legend hide/restore, tooltip, unmount cleanup (zero instances) and remount (three instances) passed. Desktop/mobile screenshots and actual canvas PNGs were inspected.
- Main matrix uses reduced motion. An initial ordinary-animation resize probe had zero buffers; a later foregrounded, settled ordinary-motion update produced nonblank canvases. Both observations are retained rather than claiming a clean all-animation matrix.
- **No database operations or authenticated real-app UAT were performed by this child.** The fixture uses synthetic props and a SettingsContext adapter, never the active backend/database. No database was created, cloned, switched or seeded. No print implementation, Git commit, push, merge or branch change was performed. Parent owns final integrated verification and publication.
