# School settings and activity audit integration

## Backend wiring (parent-owned `index.js`)

```js
import settingsRoutes from './router/settingsRoutes.js';
import activityLogRoutes from './router/activityLogRoutes.js';
import activityLog from './middleware/activityLog.js';

// Register before ALL existing API routers so authentication can fill req.user later.
app.use('/api', activityLog);
app.use('/api/settings', settingsRoutes);
app.use('/api/activity-logs', activityLogRoutes);
```

Default middleware is ready to mount, not a factory. Named exports `createActivityLog({write,onError})`, `databaseActivityWriter(db)` support dependency-injected testing. Both routers have default ready-to-mount exports plus named factories `createSettingsRouter({db,authenticate})`, `createActivityLogRouter({db,authenticate})`.

Successful login must assign `req.user = {id:user.user_id, username:user.username, role:user.role}` before sending the response, because login does not invoke verifyToken. Logout must receive Authorization and use existing verifyToken. Middleware reads the final req.user / req.user_id at response finish; no decoding unverified tokens or capturing response tokens. Anonymous login attempts are recorded without usernames; authenticated API reads/writes and rejected role requests are recorded. Unauthenticated non-auth requests are not attributed or stored.

Endpoints:
- GET `/api/settings/public`: `{data:{school_name,logo_url,primary_color,schedule_start,schedule_end,lesson_duration}}`.
- GET/PUT `/api/settings`: verified Admin only. PUT replaces all six fields; duration must be a JSON integer; times HH:mm; end later than start; duration fits the daily window. Unknown keys are discarded.
- GET `/api/activity-logs?page=1&limit=20`: verified Admin only; limit 1–100. `{data:[],pagination:{page,limit,total,total_pages}}`, newest ID first.

Run `20261102_school_settings_activity_logs.sql` manually after backup against the intended MySQL database. **Not applied by this implementation.** Tables use the existing mysql2 pool, independently of Prisma. No edits to existing application tables or user records. Missing migrations cause a generic API error rather than silently accepting non-persisted settings.

## Frontend wiring (parent-owned files)

```jsx
import { SettingsProvider } from './Context/SettingsContext';
// Wrap app/routes in <SettingsProvider> inside main.jsx.
```

`useSettings()` returns `{settings, refreshSettings, reloadSettings, updateSettings, loading, error}`. `refreshSettings` aliases async `reloadSettings`; `updateSettings(data)` applies an already-persisted response immediately. Without a provider, SSR consumers receive defaults and no-op functions. Provider sets/restores `document.documentElement.style['--color-maroon']` with validated hex color. Parent replaces hardcoded school text/logo in Dashboard/login/Footer using `settings.school_name` / `settings.logo_url || fallbackLogo`; render logo as an img, never HTML/embed/iframe. Empty logo means use existing fallback.

Default page exports:
- `features/Pengaturan/Pengaturan.jsx`: mount e.g. `/pengaturan`, Admin-protected.
- `features/LogAktivitas/LogAktivitas.jsx`: mount e.g. `/log-aktivitas`, Admin-protected.

Pages also gate UI by AuthContext Admin role; backend authorization remains authoritative. Settings uses existing Dashboard/FormContainer. Public settings load failure leaves safe defaults. Admin load failure disables saving to prevent overwriting existing settings with defaults. Log UI has explicit loading/error/empty, refresh, and server pagination states (no periodic polling to flood audit logs).

## Security and limitations

- Logo configuration accepts empty or public HTTP(S) raster-image URL only (.png/.jpg/.jpeg/.gif/.webp), no credentials, query, fragment, IP literals, localhost/internal domains, data URLs, or SVG. Upload is intentionally not added; URL option satisfies the contract. Server never fetches remote logos. Remote response MIME/content and DNS changes cannot be guaranteed by URL validation; image rendering must stay in an img. External image hosts can see viewer requests.
- Audit metadata is an allowlist: user ID/name/role, method, route template, read/write/auth action, status, elapsed milliseconds, DB timestamp. Never body, password, authorization, cookies, token, query, IP, user agent or arbitrary JSON. Resource path parameters are represented by route templates rather than raw values.
- Audit is best effort, asynchronous after response completion with at most 100 in-flight writes; DB outage/overflow/process crash can lose records, and audit failure does not fail user operations. This is not a durable compliance/event queue. Configure retention/archival operationally; no automatic deletion added.
- Activity records describe API requests, not browser-only navigation, field-level changes, or background jobs. Abort/close requests use the last HTTP status. Pagination count and page queries are not a transaction, so concurrent inserts may shift pages.
- Settings affect configuration/theme immediately; applying schedule limits/duration to all scheduler UIs/endpoints and updating existing hardcoded branding is parent integration work.

## Verification

From repository root: `node --test backend/tests/settings-activity.test.js`.
From frontend: `node --test tests/settings-pages.test.mjs` and targeted eslint on the three new JSX files.
Backend HTTP tests use an injected SQL boundary, real Express HTTP requests, admin gates, settings validation, pagination, sanitized finishing-context audit and writer failure. Frontend test bundles actual JSX using existing esbuild and React SSR, with layout/network boundaries; no dependency added. It verifies provider/default fallback and admin/denied/loading page rendering. It does not replace browser E2E, real MySQL migration verification, or live production integration testing.
