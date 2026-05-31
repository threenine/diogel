# Package G — Final Dashboard Shortcomings Review

Date: 2026-05-19

## Gate Results

- `npm run lint`: ✅ Pass
- `npm run typecheck`: ✅ Pass
- `npm run test:run`: ✅ Pass (`24 passed`)
- `npm run build:chrome`: ✅ Pass
- `npm run build:firefox`: ✅ Pass
- `npm audit --omit=dev`: ✅ Pass (`0 vulnerabilities`)

Notes:

- During an initial run, build failed under local Node `v22.20.0` due to engine check (`>=22.22.0`).
- Re-running under project-pinned Node `v24.14.0` (from `.nvmrc`) produced all green gate results.

## What Changed (Observed State After Packages A–F)

- Dashboard has a direct route at `/dashboard` (`src/router/routes.ts`) with `DashboardLayout` and `DashboardPage`.
- Sidebar in vertical drawer includes:
  - Logo (`/images/diogel.svg`)
  - App header (`Diogel`)
  - Version label (`footer.version` + `APP_VERSION`)
- Sidebar utility links are safe placeholders:
  - Current URLs are `#`
  - Items are disabled and guarded from external open when placeholder (`openUtilityLink` short-circuits)
- Sidebar `New Signature` action routes to dashboard quick-sign anchor (`{ name: 'dashboard', hash: '#quick-sign' }`) and does not trigger direct signing.
- Connected Relays widget now derives metric from active account kind `10002` relay-list metadata via `getConnectedRelaySummaryForActiveKey()` and exposes honest unavailable state (`—` + unavailable copy) when metadata cannot be resolved.
- Quick Sign behavior aligns with design intent:
  - JSON-first editor
  - Supported kinds constrained in UI copy
  - Preview step before confirmation
  - Publish is explicit opt-in
  - Publish relays come from selected account relay metadata and are previewed before confirm

## Remaining Limitations

- Manual visual acceptance (light/dark polish, narrow viewport usability, and end-to-end interaction feel) still requires human-run UI session confirmation; this review is code-and-gate backed.
- Support/Documentation links are intentionally non-functional placeholders (`coming soon`) and should be replaced with real destinations before treating as complete product navigation.
- Connected Relays depends on resolvable account relay metadata (kind `10002`) and available relay endpoints; when unavailable, widget correctly reports unknown/unavailable rather than estimating from global online catalogs.

## Audit Status

- `npm audit --omit=dev`: no production dependency vulnerabilities detected (`0 vulnerabilities`).
- No broad dependency update was performed in this package; status reflects current lockfile state.

## Manual Visual QA Notes (Checklist Mapping)

### Confirmed via implementation inspection

- Dashboard route loads directly (`/dashboard` route exists and maps to dashboard page).
- Sidebar shows logo/header/version in dashboard drawer navigation.
- Sidebar utility links are safely handled (disabled placeholders, guarded open behavior).
- `New Signature` opens Quick Sign section anchor, not direct sign execution.
- Connected Relays count is sourced from account kind `10002` relay metadata and surfaces unavailable state honestly.
- Quick Sign includes preview-before-sign and publish destination summary with selected relay list.

### Requires runtime visual verification sign-off

- Light and dark mode visual quality acceptable.
- Narrow viewport layout usability acceptable.
- Final UX wording/spacing balance across cards and sidebar in live rendering.
