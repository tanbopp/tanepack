<!-- Phase 0 scaffolding, verification, decisions, and disk usage report for Tanepack -->

# Tanepack — Phase 0 Scaffolding Report

- **Repository path:** `D:\Sandbox\pacdora-clone\` (directory name kept intact)
- **Package / product identity:** `tanepack` (`0.1.0`)
- **Date:** 2026-11-14

---

## 1. Stack Summary (Installed Versions)

| Category                        | Package                                                                     | Spec                                                     | Installed Version                                   |
| ------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------- |
| Core UI                         | `react`                                                                     | `^18.3.1`                                                | `18.3.1`                                            |
| Core DOM                        | `react-dom`                                                                 | `^18.3.1`                                                | `18.3.1`                                            |
| Router                          | `react-router-dom`                                                          | `^6.30.6`                                                | `6.30.6`                                            |
| Server State                    | `@tanstack/react-query`                                                     | `^5.107.1`                                               | `5.107.1`                                           |
| Client State                    | `zustand`                                                                   | `^5.1.0`                                                 | `5.1.0`                                             |
| Validation / IDs                | `zod` / `nanoid`                                                            | `^4.6.7` / `^6.0.2`                                      | `4.6.7` / `6.0.2`                                   |
| M3 Color Engine                 | `@material/material-color-utilities`                                        | `^0.4.0`                                                 | `0.4.0`                                             |
| UI Library                      | `@mui/material`                                                             | `^6.5.0`                                                 | `6.5.0`                                             |
| Styling Runtime                 | `@emotion/react` / `@emotion/styled`                                        | `^11.14.0`                                               | `11.14.0` / `11.14.1`                               |
| 3D Stack (Step 3+)              | `three` / `@react-three/fiber` / `@react-three/drei`                        | `~0.170.0` / `^8.18.0` / `^9.122.0`                      | `0.170.0` / `8.18.0` / `9.122.0`                    |
| BaaS Client                     | `@supabase/supabase-js`                                                     | `^2.119.0`                                               | `2.119.0`                                           |
| TypeScript                      | `typescript`                                                                | `~5.9.3`                                                 | `5.9.3`                                             |
| Bundler / Plugin                | `vite` / `@vitejs/plugin-react`                                             | `^8.3.8` / `^6.3.0`                                      | `8.3.8` / `6.3.0`                                   |
| Test Stack                      | `vitest` / `@testing-library/react` / `@testing-library/jest-dom` / `jsdom` | `^5.1.0` / `^16.3.3` / `^6.6.0` / `^31.0.1`              | `5.1.0` / `16.3.3` / `6.9.1` / `31.0.1`             |
| Lint / Format / Git             | `eslint` / `typescript-eslint` / `prettier` / `husky` / `lint-staged`       | `^9.39.5` / `^8.72.2` / `^3.10.1` / `^9.1.7` / `^17.6.0` | `9.39.5` / `8.72.2` / `3.10.1` / `9.1.7` / `17.6.0` |
| Dev Icons / Types               | `material-symbols` / `@types/react` / `@types/react-dom` / `@types/three`   | `^0.49.0` / `^18.3.31` / `^18.3.7` / `~0.170.0`          | `0.49.0` / `18.3.31` / `18.3.7` / `0.170.0`         |
| Dev Query UI / Formatter Plugin | `@tanstack/react-query-devtools` / `prettier-plugin-organize-imports`       | `^5.107.1` / `^4.3.0`                                    | `5.107.1` / `4.3.0`                                 |

---

## 2. FSD Folder Tree (2 Levels Deep)

```text
.
├── .env.example
├── .gitignore
├── .husky/
├── .prettierignore
├── .prettierrc
├── MASTER_PROMPT.md
├── README.md
├── REPORT.md
├── docs/
│   └── supabase-schema.sql
├── eslint.config.js
├── index.html
├── package.json
├── pnpm-lock.yaml
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── providers/
│   │   ├── router/
│   │   └── styles/
│   ├── entities/
│   │   ├── design-document/
│   │   ├── dieline/
│   │   └── user/
│   ├── features/
│   │   └── .gitkeep
│   ├── main.tsx
│   ├── pages/
│   │   ├── editor/
│   │   ├── home/
│   │   └── not-found/
│   ├── shared/
│   │   ├── api/
│   │   ├── config/
│   │   ├── lib/
│   │   └── ui/
│   └── widgets/
│       └── app-shell/
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## 3. Design System Summary

### Seed Color & M3 Color Tokens Exposed

- **Default seed color:** `#7B5E3B` (kraft cardboard brown), overridable via `VITE_TANEPACK_SEED_COLOR`.
- **Token generator:** `generateM3ColorScheme(seedHex, isDark)` using `Hct`, `SchemeTonalSpot`, and `MaterialDynamicColors` from `@material/material-color-utilities`.
- **Exposed schemes:** `LIGHT_COLOR_SCHEME` and `DARK_COLOR_SCHEME` (`src/app/styles/tokens.ts`), synced to `--md-sys-color-*` CSS variables on `document.documentElement` via `applyM3CssVariables` and bound into MUI v6 `theme.palette` (including `theme.palette.m3`).
- **Measured runtime CSS variables on `/`:** `--md-sys-color-primary: #825513`, `--md-sys-color-surface: #fff8f4`, `--md-sys-color-on-surface: #211a13`.
- **All 32 exposed M3 color roles:**
  - `primary`, `onPrimary`, `primaryContainer`, `onPrimaryContainer`
  - `secondary`, `onSecondary`, `secondaryContainer`, `onSecondaryContainer`
  - `tertiary`, `onTertiary`, `tertiaryContainer`, `onTertiaryContainer`
  - `error`, `onError`, `errorContainer`, `onErrorContainer`
  - `surface`, `onSurface`, `surfaceVariant`, `onSurfaceVariant`
  - `surfaceContainerLowest`, `surfaceContainerLow`, `surfaceContainer`, `surfaceContainerHigh`, `surfaceContainerHighest`
  - `outline`, `outlineVariant`
  - `inverseSurface`, `inverseOnSurface`, `inversePrimary`
  - `scrim`, `shadow`
- **Additional augmented M3 tokens:** 15 typography variants (`displayLarge`..`labelSmall`), shape scale (`none: 0`, `extraSmall: 4`, `small: 8`, `medium: 12`, `large: 16`, `extraLarge: 28`, `full: 9999`), elevations `level0`..`level5`, M3 motion curves/durations on `theme.transitions`, and state layer opacities (`hover: 0.08`, `focus: 0.12`, `pressed: 0.12`, `dragged: 0.16`, `disabled: 0.12`) on `theme.palette.action`.

### Font Loading Strategy & Confirmation

- `index.html` preconnects `https://fonts.googleapis.com` and `https://fonts.gstatic.com`.
- `src/app/styles/fonts.css` loads:
  - `Google Sans` (`wght@400;500;700&display=swap`)
  - Subsetted `Material Symbols Outlined` (`&icon_names=arrow_back,help,settings&display=swap`)
- **Primary font stack:** `'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`.
- **Online verification (headless Chrome `157.0.8103.51` at `1366×768`):** Both Google Fonts CSS stylesheets and `.woff2` files returned HTTP `200`; `document.fonts` reported `Google Sans` (`400`, `500`) and `Material Symbols Outlined` (`100 700`) as `loaded`.
- **Simulated font failure fallback:** Blocking `*fonts.googleapis.com*` and `*fonts.gstatic.com*` via CDP `Fetch.enable` confirmed `'Welcome to Tanepack'` rendered immediately (`285.39 × 36.11 px`) in system sans-serif fallback (`Segoe UI`) with zero FOIT and zero horizontal overflow (`scrollWidth = 1366`), while fixed clipped `24×24` `M3Icon` boxes prevented ligature fallback text (`settings`, `help`) from overlapping.

---

## 4. Bundle Size Report

Production build output (`pnpm build`, Vite `8.3.8`, `dist/assets/`):

| Chunk / Asset                  | Route Scope      | Raw Bytes   | Gzip Bytes  | Gzip KiB     | Vite Metric |
| ------------------------------ | ---------------- | ----------- | ----------- | ------------ | ----------- |
| `index-DyF6Q6jJ.js`            | Initial (`/`)    | `691,243 B` | `194,700 B` | `190.14 KiB` | `196.82 kB` |
| `Typography-BEsf4dVK.js`       | Initial (`/`)    | `78,521 B`  | `27,673 B`  | `27.02 KiB`  | `27.96 kB`  |
| `HomePage-KOc3giYT.js`         | Initial (`/`)    | `621 B`     | `405 B`     | `0.40 KiB`   | `0.40 kB`   |
| `rolldown-runtime-WkwZ5CU-.js` | Initial (`/`)    | `599 B`     | `368 B`     | `0.36 KiB`   | `0.36 kB`   |
| `index-D6EARYKf.css`           | Initial (`/`)    | `1,080 B`   | `587 B`     | `0.57 KiB`   | `0.59 kB`   |
| `EditorPage-Bb4pBx5F.js`       | Lazy (`/editor`) | `363 B`     | `281 B`     | `0.27 KiB`   | `0.28 kB`   |
| `NotFoundPage-MM8F0a35.js`     | Lazy (`*`)       | `572 B`     | `372 B`     | `0.36 KiB`   | `0.37 kB`   |

- **Total Initial JS gzipped (`/`):** `223,146 B` (`217.92 KiB` / `225.54 kB` per Vite kB reporter) — well under the `< 500 KB` budget.
- **Total Initial CSS gzipped (`/`):** `587 B` (`0.57 KiB` / `0.59 kB`) — well under the `< 500 KB` budget.

---

## 5. Verification Checklist Results

| #   | Check                                                   | Status                  | Observed Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --- | ------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `pnpm install`                                          | **PASS**                | `exit 0`; `528` packages installed; 0 peer dependency errors; Husky `prepare` hook initialized.                                                                                                                                                                                                                                                                                                                                                                                               |
| 2   | `pnpm typecheck` (`tsc --noEmit`)                       | **PASS**                | `exit 0`; 0 TypeScript errors with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.                                                                                                                                                                                                                                                                                                                                                                                        |
| 3   | `pnpm lint` (`eslint . --max-warnings 0`)               | **PASS**                | `exit 0`; 0 errors, 0 warnings across TypeScript, React Hooks, and FSD `import/order` / `import/no-restricted-paths`.                                                                                                                                                                                                                                                                                                                                                                         |
| 4   | `pnpm test -- --run` (`vitest --run`)                   | **PASS**                | `exit 0`; `1 passed` (`src/entities/dieline/types.test.ts`).                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 5   | `pnpm dev` (`http://localhost:5173`)                    | **PASS**                | Vite `8.3.8` ready in `314 ms` at `http://localhost:5173/`.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 6   | Browser routes, UI, M3, fonts, layout (`1366×768`)      | **PASS**                | Verified in headless Chrome `157.0.8103.51` CDP: `/` renders `"Welcome to Tanepack"`, `"Packaging design for everyone."`, `"Open Editor"`, disabled `Settings`/`Help` with `"Coming soon"` tooltip; `/editor` renders `"Tanepack — Editor"` + back arrow + `"Editor coming in Step 2."`; `/nonexistent` renders `"404"`, `"Page not found"`, `"Go home"`; `scrollWidth === 1366` on all views; 0 console errors and 0 console warnings on clean runs; blocked-font fallback verified legible. |
| 7   | `pnpm build`                                            | **PASS**                | `exit 0`; built `dist/` (`724 modules transformed`, `544 ms`).                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 8   | Lighthouse Desktop Performance                          | **PASS** (prod preview) | On `vite preview --port 5173` (`dist/`): Score `1.00`, **`LCP = 0.8 s` (`767.76 ms`)**, **`CLS = 0` (`0.000024`)**, `FCP = 0.5 s` (`497.90 ms`), `TBT = 0 ms`. (Dev unbundled `vite` server on `5173`: `FCP = 187.97 ms`, `CLS = 0.000048`, `LCP = 10,501.26 ms` due to unbundled ESM transforms over dev HTTP.)                                                                                                                                                                              |
| 9   | DevTools `localStorage`                                 | **PASS**                | `localStorage.length === 0` (`[]`) across `/`, `/editor`, `/nonexistent`.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 10  | Initial network bundle `< 500 KB` gzipped               | **PASS**                | Initial JS (`217.92 KiB`) + initial CSS (`0.57 KiB`) = **`218.49 KiB`** (`223,733 B`) gzipped (`dist/assets/`).                                                                                                                                                                                                                                                                                                                                                                               |
| 11  | `C:` free space delta `<= 100 MB` drop                  | **PASS**                | Baseline `3,932,196,864 B` -> Post-verification `3,941,658,624 B` (**`+9,461,760 B` / `+9.02 MiB` net free**).                                                                                                                                                                                                                                                                                                                                                                                |
| 12  | `D:\DevCache\pnpm-store` & `D:\DevCache\vite` populated | **PASS**                | `D:\DevCache\pnpm-store` (`1` store root), `D:\DevCache\vite` (`2` cache folders), `D:\DevCache\pnpm-state`, `pnpm-cache`, `tmp`, and `browser-profile*` populated cleanly.                                                                                                                                                                                                                                                                                                                   |

---

## 6. Deviations & Rationale

1. **Prettier vs ESLint `import/order` conflict resolution:** `prettier-plugin-organize-imports` sorts bare aliases (`@shared/ui`) before alphabetical packages (`react-router-dom`), which directly conflicts with ESLint's FSD-grouped `import/order` (`external` before `internal` `@app/**`..`@shared/**`) and causes `lint-staged` loops on commit. Kept `prettier-plugin-organize-imports` installed in `devDependencies` as approved, omitted it from `.prettierrc` per the plugin's own ESLint compatibility docs, and let ESLint `import/order` own import ordering. Added `.prettierignore` to leave `pnpm-lock.yaml` and `MASTER_PROMPT.md` untouched.
2. **`vite.config.ts` / `vitest.config.ts` path resolution without `@types/node`:** Replaced `node:path` + `__dirname` with `decodeURIComponent(new URL(relativePath, import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1')` so `tsc --noEmit` passes without adding unapproved `@types/node` and Vitest 5 emits zero `configLoader: 'native'` `__dirname` warnings.
3. **Zero-warning / zero-error browser console hardening:** Added an inline SVG data-URI favicon in `index.html` to eliminate `/favicon.ico` 404 console errors, opted into React Router v7 future flags in `src/app/router/index.tsx` to eliminate v6 transition warnings, added `overflow: hidden` + `sans-serif` fallback on `M3Icon` / `.material-symbols-outlined` for clean blocked-font rendering, and left `ReactQueryDevtools` unmounted in Phase 0 so `localStorage` remains empty on load.
4. **Browser automation fallback:** Desktop `chrome-devtools` MCP failed to attach (`DevToolsActivePort` absent because desktop Chrome remote debugging was not active). Ran equivalent live checks using local headless Chrome `157.0.8103.51` (`--headless=new --user-data-dir=D:\DevCache\browser-profile-cdp`) over CDP (`verify_browser.mjs`).
5. **Lighthouse measurement target:** Measured both unbundled `pnpm dev` and production `vite preview --port 5173` on `http://localhost:5173/`; production `dist/` preview is the valid benchmark for production LCP/CLS (`0.8 s` LCP / `0` CLS).

---

## 7. Decisions Applied

- **A1 (`typescript`):** Pinned `~5.9.3` (installed `5.9.3`, stayed on TS 5.x, avoided 7.x).
- **A2 (`@react-three/fiber`):** Pinned `^8.18.0` (installed `8.18.0`, avoided 9.x).
- **A3 (`@react-three/drei`):** Pinned `^9.122.0` (installed `9.122.0`, avoided 10.x).
- **A4 (`three` + `@types/three`):** Pinned both to `~0.170.0` (installed `0.170.0` for both, compatible with Drei `9.122.0`).
- **A5 (`vite`):** Used `^8.3.8` (`8.3.8`, works cleanly with React 18 and Node `v26.13.0`).
- **A6 (`vitest`):** Pinned `^5.1.0` (installed `5.1.0`).
- **A7 (`@vitejs/plugin-react`):** Pinned `^6.3.0` (installed `6.3.0`).
- **A8 (`@mui/material`):** Pinned `^6.5.0` (installed `6.5.0`, avoided 9.x).
- **A9 (`eslint`):** Pinned `^9.39.5` (installed `9.39.5`).
- **B (Implicit packages):** Added approved runtime (`zod`, `nanoid`, `three`, `@types/three`, `@emotion/react`, `@emotion/styled`, `@supabase/supabase-js`) and dev (`@vitejs/plugin-react`, `@types/react`, `@types/react-dom`, `typescript-eslint`, `@eslint/js`, `globals`, `eslint-plugin-react-hooks`, `eslint-plugin-import`, `eslint-import-resolver-typescript`, `prettier-plugin-organize-imports`, `husky`, `lint-staged`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `material-symbols`) packages with zero peer errors.
- **C1 (`console.warn` vs `no-console`):** Configured `'no-console': ['warn', { allow: ['warn', 'error'] }]` in `eslint.config.js`; `src/shared/config/env.ts` stays silent when both Supabase vars are missing, warns once if partial, and runs cleanly with zero console errors/warnings when unconfigured.
- **C2 (`shared/ui/` scope):** Created only `M3Button`, `M3Icon`, `M3IconButton`, `M3CircularProgress` (and `index.ts`); deferred unused wrappers with zero placeholder files.
- **C3 (`500 KB` budget & icons):** Applied `< 500 KB` gzipped budget strictly to initial JS + CSS (`218.49 KiB`); loaded `Material Symbols Outlined` via Google Fonts CDN stylesheet subsetted with `&icon_names=arrow_back,help,settings`.
- **C4 (MUI v6 M3 augmentation & TopBar buttons):** Augmented `@mui/material/styles` (palette roles + `m3`, typography variants, shape scale, transitions, `palette.action` state layers) and `@mui/material/Typography`; rendered disabled TopBar `Settings`/`Help` buttons wrapped in MUI `Tooltip` `"Coming soon"`.
- **D1 (`TEMP`/`TMP` + `state-dir`):** Redirected `TEMP`/`TMP` to `D:\DevCache\tmp` and configured `pnpm config set state-dir "D:\DevCache\pnpm-state"` prior to install.
- **D2 (`C:` free space criterion):** Captured baseline (`3,932,196,864 B`) and verified final (`3,941,658,624 B`, `+9.02 MiB` net free delta, well within `<= 100 MB` drop rule).
- **D3 (Font fallback strategy):** Used `'Google Sans'`, `-apple-system`, `BlinkMacSystemFont`, `'Segoe UI'`, `sans-serif`; deferred self-hosted `Roboto Flex` to Phase 2.
- **D4 (Lighthouse method):** Executed `pnpm dlx lighthouse http://localhost:5173/ --preset=desktop --only-categories=performance --chrome-flags="--headless=new --user-data-dir=D:\DevCache\browser-profile"` with `TEMP`/`TMP` on `D:\DevCache\tmp` and reported exact JSON metrics.
- **E1–E5 (Execution governance):** Applied overrides over `MASTER_PROMPT.md`, followed `MASTER_PROMPT.md` elsewhere, documented every decision here, and prepared the specified initial git commit.

---

## 8. Intentionally Deferred (Step 2 & Step 3+)

- **Step 2 (Parametric Box Generator & Dieline):**
  - Implementation of `generateTuckEndBox` (`src/entities/dieline/generateTuckEndBox.ts`, currently throws `'Not implemented — see Step 2 prompt'`).
  - Folding carton dimension/bleed/flap math, fold/cut/bleed SVG path generation, unit switcher UI, and template presets.
- **Step 3 (2D DOM/SVG Editor & Single-Flight 3D Scene):**
  - 2D DOM + CSS (`mm`) + `<clipPath>` artwork layer editor UI in `EditorPage` (`Editor coming in Step 2.`).
  - Procedural 3D tuck-end mesh generator and on-demand `@react-three/fiber` scene.
  - Deferred `shared/ui` components: `M3TextField`, `M3Dialog`, `M3Drawer`, `M3Tabs`, `M3Slider`, `M3Menu`.
  - Deferred typography: self-hosted `Roboto Flex` fallback.
- **Phase 2 Cloud Persistence:**
  - Executing `docs/supabase-schema.sql`, wiring auth flows, cloud project queries, asset uploads, `.env.local` provisioning, and mounting `@tanstack/react-query-devtools`.
- **Out of v1 scope:** Pouches, bottles, cans, prebuilt `.glb` mockups, server-side photoreal renders, CMYK PDF/AI/DXF exporters.

---

## 9. Disk Usage Report (`C:` vs `D:`)

| Drive | Baseline Free (Before `pnpm install`) | Post-Verification Free (After Build + Chrome + Lighthouse) | Net Change / Usage                       |
| ----- | ------------------------------------- | ---------------------------------------------------------- | ---------------------------------------- |
| `C:`  | `3,932,196,864 B` (`3.66 GiB`)        | `3,941,658,624 B` (`3.67 GiB`)                             | **`+9,461,760 B` (`+9.02 MiB` free)**    |
| `D:`  | `450,908,897,280 B` (`419.94 GiB`)    | `449,960,804,352 B` (`419.06 GiB`)                         | **`-948,092,928 B` (`904.17 MiB` used)** |

- **Populated `D:` directories:** `D:\Sandbox\pacdora-clone\node_modules`, `D:\DevCache\pnpm-store`, `D:\DevCache\pnpm-cache`, `D:\DevCache\pnpm-state`, `D:\DevCache\vite`, `D:\DevCache\tmp`, `D:\DevCache\browser-profile`, `D:\DevCache\browser-profile-cdp`.
