# Mobile native tables

## Contract

Tables remain native `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th scope="col">` and `<td>` at every viewport. No mobile card transformation or hidden column header. Legacy `data-label` metadata remains compatible, but duplicate cell labels are hidden at every width.

`TableScrollRegion` supplies a named, focusable region, a linked Indonesian swipe/keyboard hint, local horizontal overflow, overscroll containment, a visible keyboard focus ring and a themed scrollbar. Focus the region and use Left/Right arrows; touch users can swipe horizontally without moving the whole page. No document-level overflow hiding is used.

Shared management tables, ticket lists, dashboard panels (including Admin and Koordinator tables), and activity logs use this wrapper. Weekly schedules retain their existing sticky time column and existing labelled keyboard region, now using the same scroll styling. Tables have a 40rem minimum width; wide schemas may naturally require more. Cell content wraps; action controls/links have at least 44px targets. Existing coarse-pointer 16px inputs prevent mobile input zoom. Search, page-size selectors and pagination remain outside the scroll viewport.

No data, filter, role, loading, empty-state, deletion-context, navigation or API logic was changed. Dynamic `--color-maroon` remains the brand token; ticket/add/pagination hover stays in the selected color family.

## Regression checks

Run from `frontend`:

```sh
node --test tests/mobile-native-tables.test.mjs tests/mobile-layout.test.js tests/ticketing-list.test.js tests/table-data.test.js tests/deletion-context.test.js
npm test
npm run lint
npm run build
```

Observed RED: missing named keyboard viewport on shared table; native-table guard caught hidden mobile header/card CSS; ticket viewport lacked accessibility instructions. GREEN: 15 focused checks passed. Full current frontend suite: **141 passed, 0 failed**, including the parent-updated login test. Lint: **0 errors, 6 existing warnings** (Footer, PengecekanStatus, AddPerangkat, AuthContext, TeknisiDashboard, authLoginCover).

The initial standard build encountered an `EBUSY` lock copying the existing `dist` favicon. A full production build succeeded with an isolated scratch output directory, without stopping the user's services or altering Vite configuration.

## Browser evidence

An isolated HTTP fixture bundled the **actual** shared Table and feature-local TicketList components, React state/router, and actual Vite-compiled application CSS. It used no auth, backend, database, environment changes or app Vite dependency cache. This verifies shared UI behavior, not authenticated full-app UAT.

Matrix: **8 cases** = 320, 390, 768, 1440px × blue (`#2563eb`) and green (`#15803d`), with actual coarse-pointer emulation. Each case checked both tables (16 table observations): native computed table/header/row/cell display, visible headers, hidden duplicate labels, accessible region/instruction association, >=44px actions and no document overflow. Mobile cases additionally verified genuine local horizontal overflow and scrolling.

Additional browser checks: keyboard ArrowRight scrolling; next-page records; controlled search; empty-search message; shared and ticket action callbacks; real mouse hover matching the browser's expected 90% dynamic-brand color mix in both themes. Browser AX tree exposed 2 tables, 8 column headers and 20 cells. A harness initially assumed RGB hover serialization; Chromium returned correct OKLab instead, so the final check compares against Chromium's computed expected color mix rather than a color-string format.

Evidence directory (absolute):

`C:/Users/LOQ/AppData/Local/hermes/cache/scratch/mobile-tables-evidence/`

- `matrix.json`, `matrix-final.json`: 8 viewport/theme records and two table observations per record; final matrix rechecked the final production build.
- `interactions.json`: 6 interaction checks and 2 exact themed-hover comparisons.
- `accessibility.json`: actual browser accessibility-role counts.
- `preview-390.png`: mobile table screenshot.
- `suite.log`, `build.log`: execution output.
- `build/`: isolated production output.

Fixture source: `C:/Users/LOQ/AppData/Local/hermes/cache/scratch/mobile-tables-fixture.mjs`. Owned fixture listener on 5198 was stopped after verifying its process command; post-stop listener count was **0**. User services on 5174/5500 were not stopped. No commits or pushes were made by this workstream.
