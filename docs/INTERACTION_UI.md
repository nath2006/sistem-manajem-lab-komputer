# Row actions and scrolling refinements

## Interaction rules

- User and announcement row actions deliberately use **blue for view, amber for edit, red for delete**, rather than forcing all three into the school brand. `RowActionButton` centralizes these variants, 44px targets, accessible names and hover/focus tooltips. Other themed controls and semantic status colors are unchanged.
- Existing permissions, detail/edit handlers and the guarded deletion preview are preserved. A custom tooltip is rendered through a portal so horizontal table scrolling does not clip its label; the native title remains a fallback and is suppressed while the custom tooltip is open.
- User role/status columns now match their actual cell data. Compact 11px badges can wrap within their cells instead of extending beyond a narrow column.
- Table and schedule instructions remain available to screen readers, but no longer occupy visible dashboard space. Tables retain native headers/rows on mobile and scroll only within their named, keyboard-focusable region.
- Shared table/sidebar scrollbars have transparent tracks and thin, rounded neutral thumbs, with a restrained school-color tint on hover. Neutral CSS fallbacks are required because the installed Flowbite/Tailwind build does not expose every `--color-gray-*` variable; without them, `scrollbar-color` computed to `auto`.

## Verification

From `frontend`:

```sh
node --test tests/action-buttons-scrollbars.test.mjs tests/announcements-management.test.mjs tests/theme.test.js tests/dashboard-mobile.test.mjs
```

Meaningful RED was observed for monotone actions, visible instructions and missing scrollbar neutral fallbacks; the focused new suite passes all four tests. Legacy action-color/source-scanning assertions were updated to the requested semantic variants; unchanged lab and schedule branding remains covered.

Browser fixture: actual User and Pengumuman components, real local HTTP fixture responses, and production-compiled application CSS. **16 cases** = two management screens × 320/390/1024/1440px × blue/green brands. Verified distinct action colors, minimum 44px controls, native table/header display, compact visible badges within cells, hidden visual instructions, styled scrollbar and no document overflow.

Actual component interactions also passed programmatic mouse-enter, keyboard focus, Escape dismissal, and opening/closing the real detail modal. No runtime errors remained. Native CDP pointer transport timed out, so this is **not** a claim of native-pointer coverage or authenticated full-app UAT.

Generated evidence: `C:/Users/LOQ/AppData/Local/hermes/cache/scratch/ui-polish-action-result.json`; fixture: `ui-polish-action-fixture.mjs` in the same scratch directory. The initial harness used classic JSX and failed in an automatically transformed component; matching the app's automatic JSX runtime resolved the harness error without modifying application behavior. The owned listener on 5207 was stopped and independently verified absent. User services and databases were not stopped or modified by this verification.

## Final integration

- Desktop sidebar is 288px expanded and an accessible 80px icon rail collapsed, with matching content offsets; mobile remains a hidden/inert closed drawer. Verified 20 role/viewport cases and five role hover/navigation cases from the independent shell fixture.
- Loaded the actual AdminDashboard with synthetic five-digit counts, actual sidebar, statistic cards and final production CSS. All **20 width/state/theme cases** at 1440/1280/1024/390/320px passed **80 icon-badge observations**: 64px circles remained inside their statistic rows, count/label text fit, and the document did not overflow. Both sidebar states and both non-red brands were exercised. This closes the earlier render-only statistic-badge coverage limitation.
- Log Aktivitas uses the reference's filter/header/five-column hierarchy, retaining light application surfaces. Its filters apply server-side before pagination. Independent checks confirmed six native-table viewport/theme cases and the saved filter/stale-request/retry observations. See `ACTIVITY_LOG_UI.md` for the read API and fixture boundary.
- Integrated frontend suite: **153 passed / 0 failed**; backend: **97 passed / 0 failed**. Lint: **0 errors / 6 existing warnings**. Production build passed in isolated scratch output. API/OpenAPI query contracts were updated and OpenAPI validation passed.
- Populated-card evidence: `C:/Users/LOQ/AppData/Local/hermes/cache/scratch/ui-polish-populated-badges.json`. This additional owned fixture was stopped; port 5207 was again verified closed. No source DB/schema/environment changes or publication were performed for these refinements.
