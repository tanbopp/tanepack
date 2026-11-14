# TANEPACK — MASTER PROMPT
## Phase 0: Project Scaffolding

> This file is an executable instruction set, not documentation.
> Every section is a hard requirement. Treat it as a contract with the developer.

---

## CONTEXT

You previously produced a deep reverse-engineering report on the reference
site (pacdora.com). That report is now our source of truth. This prompt
starts the actual implementation. We are not building the reference — we
are building "Tanepack", an original product inspired by the reference's
ARCHITECTURE (not copied assets, not copied code, not copied brand).

Read the following facts as fixed. Do not deviate without flagging
explicitly and asking me first.

---

## PRODUCT IDENTITY

- Product name: Tanepack
- Internal package name: tanepack
- Version: 0.1.0
- Target user: packaging designers in Indonesia on low-end office laptops
- Primary niche (v1): Folding cartons / tuck-end boxes only
- Target hardware floor: same as my dev machine below
- Repo folder (physical): D:\Sandbox\pacdora-clone\
  - Note: the folder is named "pacdora-clone" for legacy reasons.
    It is intentional. Do NOT rename it. Do NOT create a new folder
    called "tanepack". Product identity lives in package.json and UI,
    not in the folder name.

---

## HARDWARE CONSTRAINTS (NON-NEGOTIABLE)

- CPU: Intel Core i5-3470 @ 3.20GHz (4 cores, Ivy Bridge, 2012)
- RAM: 16 GB DDR3
- GPU: Intel HD Graphics (Ivy Bridge, 32 MB dedicated, Feature Level 11_0)
- Display: 1366×768 @ 60Hz
- C: SSD ~4 GB free (DO NOT USE for heavy artifacts)
- D: HDD ~430 GB free (USE THIS for repo, caches, node_modules)
- OS: Windows 10 Pro 64-bit
- Browser: latest Edge/Chrome stable

Every choice in this scaffolding MUST run smoothly at 1366×768 with
these specs. If a package is known to be heavy, choose a lighter
alternative and explain.

---

## ARCHITECTURAL CONSTRAINTS (FROM PRIOR ANALYSIS)

The reference report proved these architectural facts. We MUST preserve
them in our code structure:

1. 2D editor renders as DOM + CSS in physical millimeters (mm) + inline
   SVG clipPaths. NOT Fabric.js, NOT Konva, NOT Canvas2D for editing.
2. 2D→3D sync uses a single-flight coalescing queue: pause 3D during
   pointer drag, resume on pointer up, bake textures only on commit.
3. 3D renderer uses ON-DEMAND requestAnimationFrame (no idle 60fps loop).
   Render only on: camera change, resize, explicit needRenderOnce flag.
4. 3D geometry for folding cartons is PROCEDURAL from a dieline JSON
   (faces + folds + cuts + bleeds), not downloaded .glb files.
5. Heavy work (high-res photoreal render, CMYK PDF/AI/DXF export) is
   SERVER-side. Client only does: SVG dieline export, PNG snapshot up
   to 1024px.
6. Texture bake budget: max 1024px edge in interactive mode. No multi-
   channel PBR canvases until user adds a finish (foil/UV/emboss).
7. No MeshPhysicalMaterial.transmission in interactive mode. No MSAA
   render targets. No 2048px shadow maps. Use contact-shadow plane
   (gradient texture) instead.

If any scaffolding decision contradicts these, STOP and ask.

---

## TECH STACK (FINAL, DO NOT SUBSTITUTE)

- Build: Vite 5+ with React 18 + TypeScript 5+ (strict mode)
- Package manager: pnpm
- Router: React Router v6 (data router, lazy routes)
- State: Zustand (editor store) + TanStack Query v5 (server state)
- 2D editor: DOM + SVG (custom, no library) — see architectural constraint #1
- 3D: React Three Fiber (@react-three/fiber) + @react-three/drei
  - Version pinned to match React 18
  - Do NOT add @react-three/postprocessing (bloom/SSAO/etc.) — too heavy
- Design system:
  - Base: MUI v6 (@mui/material) with M3 theming
  - Palette generator: @material/material-color-utilities (official Google)
  - Icons: material-symbols (official M3 icon set, variable font)
  - Font: Google Sans via Google Fonts CDN, fallback Roboto Flex, then
    system stack
- Styling: MUI sx prop + Emotion (bundled with MUI). Do NOT add Tailwind
  (avoid dual styling systems).
- Database: Supabase (@supabase/supabase-js v2) — scaffold only, no
  wiring yet
- Testing: Vitest + @testing-library/react + jsdom
- Lint/format: ESLint 9 (flat config) + Prettier 3 + husky + lint-staged
- DevTools: React DevTools, TanStack Query DevTools (dev only)

If any version combination is incompatible (e.g., R3F needs different
React), pin the minimum compatible versions and document in README.

---

## REPO LOCATION & CACHE RELOCATION

- Repo: D:\Sandbox\pacdora-clone\
  - This folder already exists. Do NOT rename it.
  - Do NOT create D:\Sandbox\tanepack\ or any variant.
  - Confirm with pwd / Get-Location that you are inside it before
    running pnpm install.
- pnpm store: D:\DevCache\pnpm-store
- pnpm cache: D:\DevCache\pnpm-cache
- Vite cache: D:/DevCache/vite (via vite.config.ts cacheDir)
- Keep C: untouched. Verify D:\ paths before running pnpm install.

Run BEFORE any install:
```
pnpm config set store-dir "D:\DevCache\pnpm-store"
pnpm config set cache-dir "D:\DevCache\pnpm-cache"
```

---

## FOLDER STRUCTURE (FEATURE-SLICED DESIGN)

Create exactly this structure. Empty files with TODO comments are OK
where noted. Every folder should have at least one file so git tracks it.

```
src/
├── app/
│   ├── providers/
│   │   ├── ThemeProvider.tsx        # MUI M3 theme + Google Sans loading
│   │   ├── QueryProvider.tsx        # TanStack Query client
│   │   ├── SupabaseProvider.tsx     # Placeholder, wires in Phase 2
│   │   └── index.tsx                # Composes all providers
│   ├── router/
│   │   ├── index.tsx                # createBrowserRouter with lazy routes
│   │   └── routes.ts                # Route registry
│   ├── styles/
│   │   ├── tokens.ts                # M3 tokens generated from seed color
│   │   ├── global.css               # Resets + font-face + CSS vars
│   │   └── fonts.css                # Google Sans + fallback loader
│   └── App.tsx
├── pages/
│   ├── home/
│   │   └── HomePage.tsx             # Placeholder: "Welcome to Tanepack"
│   ├── editor/
│   │   └── EditorPage.tsx           # Placeholder: empty shell
│   └── not-found/
│       └── NotFoundPage.tsx
├── widgets/
│   ├── app-shell/
│   │   ├── TopBar.tsx               # M3 top app bar with Tanepack logo
│   │   └── AppShell.tsx             # Outlet + TopBar layout
│   └── (others added in Step 2+)
├── features/
│   └── (empty, filled in Step 2+)
├── entities/
│   ├── dieline/
│   │   ├── types.ts                 # Dieline, Face, Fold, Cut, Bleed
│   │   ├── generateTuckEndBox.ts    # Stub function signature only
│   │   └── index.ts                 # Barrel export
│   ├── design-document/
│   │   ├── types.ts                 # Project, DesignLayer, DesignElement
│   │   └── index.ts
│   └── user/
│       └── types.ts                 # User, GuestUser (from analysis)
└── shared/
    ├── ui/
    │   ├── M3Button.tsx             # Wrapper around MUI Button w/ M3 tokens
    │   ├── M3Icon.tsx               # Material Symbols wrapper
    │   └── index.ts
    ├── lib/
    │   ├── supabase.ts              # Client factory, reads env vars
    │   ├── units.ts                 # mm↔px, mm↔inch (3.7795275591 px/mm)
    │   └── id.ts                    # nanoid wrapper for entity IDs
    ├── config/
    │   └── env.ts                   # Zod-validated env loader
    └── api/
        └── (empty for Phase 1)
```

---

## DESIGN SYSTEM REQUIREMENTS (CRITICAL)

### M3 COLOR SYSTEM
- Generate full M3 palette from a single seed color using
  @material/material-color-utilities.
- Seed color: pick a warm, packaging-friendly tone. Suggested:
  #7B5E3B (warm kraft/paper brown) OR let me override in .env as
  VITE_TANEPACK_SEED_COLOR.
- Generate both light and dark schemes.
- Expose all M3 color roles as CSS variables AND MUI theme tokens:
  primary, onPrimary, primaryContainer, onPrimaryContainer,
  secondary, onSecondary, secondaryContainer, onSecondaryContainer,
  tertiary, onTertiary, tertiaryContainer, onTertiaryContainer,
  error, onError, errorContainer, onErrorContainer,
  surface, onSurface, surfaceVariant, onSurfaceVariant,
  surfaceContainer (lowest → highest),
  outline, outlineVariant,
  inverseSurface, inverseOnSurface, inversePrimary
- MUI theme must use these as the palette source, NOT MUI defaults.

### M3 TYPOGRAPHY SCALE
- Use Google Sans as primary font family.
- Full M3 type scale:
  - displayLarge/Medium/Small (57/45/36 sp)
  - headlineLarge/Medium/Small (32/28/24 sp)
  - titleLarge/Medium/Small (22/16/14 sp)
  - bodyLarge/Medium/Small (16/14/12 sp)
  - labelLarge/Medium/Small (14/12/11 sp)
- Load via Google Fonts CSS API in fonts.css with:
  ```
  font-family: 'Google Sans', 'Roboto Flex', -apple-system,
               BlinkMacSystemFont, 'Segoe UI', sans-serif
  ```
- Include font-display: swap and preconnect hints in index.html.
- If Google Sans fails to load (network/blocked), Roboto Flex fallback
  must be visually acceptable. Verify by simulating font failure.

### M3 SHAPE SCALE
- Expose as theme shape tokens:
  - none: 0
  - extraSmall: 4px
  - small: 8px
  - medium: 12px
  - large: 16px
  - extraLarge: 28px
  - full: 9999px
- Apply to MUI theme.shape and per-component overrides.

### M3 ELEVATION
- 0–5 levels using M3 shadow tokens (not MUI defaults).
- Prefer tonal surface elevation (surfaceContainerLow → High) over
  heavy drop shadows for the editor UI.

### M3 MOTION
- Expose easing tokens:
  - emphasized: cubic-bezier(0.2, 0, 0, 1)
  - emphasizedDecelerate: cubic-bezier(0.05, 0.7, 0.1, 1)
  - emphasizedAccelerate: cubic-bezier(0.3, 0, 0.8, 0.15)
  - standard: cubic-bezier(0.2, 0, 0, 1)
  - standardDecelerate, standardAccelerate
- Duration tokens: short (100ms), medium (300ms), long (500ms)
- Apply to MUI transitions.

### M3 STATE LAYERS
- Hover: 8% opacity overlay of onSurface
- Focus: 12%
- Pressed: 12%
- Dragged: 16%
- Configure as MUI state layer opacities.

### ICONS
- Use material-symbols npm package (official M3 icon font).
- Wrap in M3Icon.tsx component that accepts: name, size (default 24),
  filled (bool), weight (default 400).
- Do NOT use @mui/icons-material (that's Material Icons, older set).

### COMPONENT WRAPPERS
- Build thin wrappers in shared/ui/ for: M3Button, M3IconButton,
  M3TextField, M3Dialog, M3Drawer, M3Tabs, M3Slider, M3Menu.
- Wrappers should default to M3-correct props (variant, size, shape).
- Do NOT wrap everything — only components used in first 2 sprints.

---

## DOMAIN TYPES (FROM PRIOR ANALYSIS)

Define in entities/dieline/types.ts these types EXACTLY matching the
shape the analysis observed on the reference (adapted for TypeScript,
using ISO units, but preserving the concept):

```typescript
export interface Point { x: number; y: number; }
export type Unit = 'mm' | 'in' | 'dm' | 'cm';

export interface Cut {
  id: string;
  path: string;                  // SVG path "M L Q Z..." in mm units
}
export interface Fold {
  id: string;
  from: Point;
  to: Point;
  angle: number;                 // degrees, 0 = flat, 90 = folded
}
export interface Bleed {
  id: string;
  path: string;
}
export interface Face {
  id: string;
  name: string;                  // "front", "back", "top-flap", etc.
  path: string;                  // SVG path in mm units (printable area)
  folds: string[];               // Fold IDs bordering this face
  adjacentFaces: string[];       // Face IDs this face shares edges with
}
export interface FoldGroup {
  id: string;
  name: string;
  faceIds: string[];
  pivotFoldId: string;
  animatedAngleRange: [number, number]; // e.g. [0, 90]
}
export interface Dieline {
  archetype: 'tuck-end' | 'mailer' | 'sleeve';  // Phase 1: only tuck-end
  dimensions: {
    length: number;              // mm
    width: number;               // mm
    height: number;              // mm
    thickness: number;           // mm (paperboard thickness)
    bleedSize: number;           // mm (e.g. 3)
  };
  unit: Unit;
  totalWidth: number;            // mm, canvas bounding box width
  totalHeight: number;           // mm, canvas bounding box height
  faces: Face[];
  cuts: Cut[];
  folds: Fold[];
  bleeds: Bleed[];
  foldGroups: FoldGroup[];
}
```

Define in entities/design-document/types.ts:

```typescript
export interface DesignElementBase {
  id: string;
  type: 'text' | 'image' | 'shape';
  faceId: string;                // which face it's on
  side: 'outside' | 'inside';
  transform: {
    x: number;                   // mm
    y: number;                   // mm
    width: number;               // mm
    height: number;              // mm
    rotation: number;            // degrees
  };
  opacity: number;               // 0..1
  zIndex: number;
}
export interface TextElement extends DesignElementBase {
  type: 'text';
  content: string;
  style: {
    fontFamily: string;
    fontSize: number;            // mm
    fontWeight: number;
    lineHeight: number;
    letterSpacing: number;
    textAlign: 'left' | 'center' | 'right';
    color: string;               // hex
  };
}
export interface ImageElement extends DesignElementBase {
  type: 'image';
  src: string;                   // data URL or object URL
  naturalWidth: number;          // px
  naturalHeight: number;         // px
  fit: 'fill' | 'contain' | 'cover';
}
export interface ShapeElement extends DesignElementBase {
  type: 'shape';
  shape: 'rect' | 'circle' | 'polygon';
  fill: string;
  stroke: string;
  strokeWidth: number;           // mm
  points?: number[];             // for polygon
}
export type DesignElement = TextElement | ImageElement | ShapeElement;

export interface Project {
  id: string;
  version: 1;
  name: string;
  createdAt: string;             // ISO
  updatedAt: string;             // ISO
  dieline: Dieline;
  layers: {
    outside: DesignElement[];
    inside: DesignElement[];
  };
  metadata: {
    seedColor?: string;
    thumbnail?: string;          // data URL
  };
}
```

Define in entities/user/types.ts:

```typescript
export interface User {
  id: string;
  email: string;
  displayName: string;
  plan: 'free' | 'lite' | 'pro' | 'business';
}
export interface GuestUser {
  id: 'guest';
  sessionId: string;             // stored in localStorage
}
```

In entities/dieline/generateTuckEndBox.ts create ONLY the function
signature with a TODO body:

```typescript
export function generateTuckEndBox(
  dimensions: Dieline['dimensions']
): Dieline {
  throw new Error('Not implemented — see Step 2 prompt');
}
```

Do NOT implement the generator in this step.

---

## SUPABASE SCAFFOLD (MINIMAL)

Create these files. Do NOT wire Supabase into any feature yet.

### 1. src/shared/lib/supabase.ts
- Export a function createSupabaseClient() that reads env vars and
  returns a SupabaseClient instance (or null if env missing).
- Singleton pattern.
- No auth flow, no queries. Just the factory.

### 2. src/shared/config/env.ts
- Zod schema validating:
  - VITE_SUPABASE_URL (url, optional in Phase 1)
  - VITE_SUPABASE_ANON_KEY (string, optional in Phase 1)
  - VITE_TANEPACK_SEED_COLOR (string hex, default '#7B5E3B')
- Export validated env object.
- Fail gracefully with console.warn if Supabase vars missing (Phase 1).

### 3. .env.example at repo root
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_TANEPACK_SEED_COLOR=#7B5E3B
```

### 4. docs/supabase-schema.sql — DRAFT ONLY, for Phase 2. Include:
- users table (extends auth.users with display_name, plan enum)
- projects table (id uuid, user_id uuid FK, name text,
  design_json jsonb, thumbnail_url text, created_at, updated_at)
- project_assets table (id, project_id FK, storage_path, mime_type)
- RLS policies commented but not enforced (Phase 2 concern)
- Add header comment: "-- Phase 2 DRAFT. Do not run in Phase 1."

Do NOT create .env.local. I will create it myself from .env.example.

---

## APP SHELL (MINIMAL WORKING ROUTES)

Build a working but minimal app:

### 1. HomePage (route "/")
- Centered M3 headlineMedium text: "Welcome to Tanepack"
- Subtitle bodyLarge: "Packaging design for everyone."
- M3Button (filled, primary) labeled "Open Editor" → navigates to /editor
- Verify: Google Sans renders, M3 tokens apply, button has M3 state layer.

### 2. EditorPage (route "/editor")
- Empty shell only: TopBar with "Tanepack — Editor" title + back button.
- Center text: "Editor coming in Step 2."
- Do NOT build editor UI in this phase.

### 3. NotFoundPage (route "*")
- M3 headlineLarge "404", bodyLarge "Page not found", button "Go home".

### 4. AppShell with M3 TopAppBar
- Left: "Tanepack" wordmark (Google Sans, labelLarge)
- Right: M3Icon buttons for "settings" and "help" (Material Symbols)
- Height 64px, surface color, elevation 0 (tonal via border-bottom)
- Sticky, no scroll issues at 1366×768

### 5. Router setup with lazy loading
- All page components imported via React.lazy + Suspense fallback
- A tiny M3CircularProgress fallback

---

## CONFIGURATION FILES

Create these:

### 1. vite.config.ts
- cacheDir: 'D:/DevCache/vite'
- React plugin + TypeScript path aliases matching FSD structure:
  - '@app/*', '@pages/*', '@widgets/*', '@features/*',
    '@entities/*', '@shared/*'
- Build target: 'es2020'
- No additional plugins unless strictly required

### 2. tsconfig.json
- strict: true
- noUncheckedIndexedAccess: true
- exactOptionalPropertyTypes: true
- Path aliases matching vite.config.ts
- Module resolution: 'bundler'

### 3. eslint.config.js (flat config for ESLint 9)
- TypeScript + React rules
- import/order with FSD boundary rules:
  - app can import from any layer below
  - pages can import from widgets, features, entities, shared
  - widgets from features, entities, shared
  - features from entities, shared
  - entities from shared only
  - shared from nothing (only external)
- no-console (warn), no-debugger (error)
- Use @typescript-eslint and eslint-plugin-react-hooks

### 4. .prettierrc
- semi: true, singleQuote: true, printWidth: 100, tabWidth: 2
- plugins: prettier-plugin-organize-imports

### 5. .gitignore
- node_modules, dist, .env.local, .env.*.local, *.log
- .vite, coverage, .DS_Store

### 6. .husky/pre-commit
- pnpm lint-staged

### 7. package.json scripts
- dev: vite
- build: tsc --noEmit && vite build
- preview: vite preview
- lint: eslint . --max-warnings 0
- format: prettier --write .
- test: vitest
- test:ui: vitest --ui
- typecheck: tsc --noEmit

### 8. README.md
- Project name, tagline, one-paragraph description of Tanepack
- Phase status (currently Phase 0: Scaffolding)
- Dev setup instructions (pnpm, D:\ cache, env vars)
- Architecture summary (FSD layers + 2D/3D split + on-demand render)
- Note on hardware constraints and why they matter
- License: TBD

---

## VERIFICATION CHECKLIST (MUST PASS BEFORE MARKING DONE)

Run these in order and report results:

- [ ] pnpm install — completes without errors
- [ ] pnpm typecheck — zero TypeScript errors
- [ ] pnpm lint — zero ESLint errors, zero warnings
- [ ] pnpm test — vitest runs, at least 1 placeholder test passes
      (create src/entities/dieline/types.test.ts with one type-level test)
- [ ] pnpm dev — Vite starts on http://localhost:5173
- [ ] Open http://localhost:5173/ in browser at 1366×768:
      - [ ] HomePage renders with M3 colors and Google Sans (or fallback)
      - [ ] "Open Editor" button navigates to /editor
      - [ ] /editor shows TopBar with correct M3 styling
      - [ ] /nonexistent shows 404 page
      - [ ] No horizontal scroll at 1366×768
      - [ ] No console errors or warnings in DevTools
- [ ] pnpm build — completes, dist/ produced
- [ ] DevTools Lighthouse (Desktop, Performance only):
      - [ ] LCP < 2.5s
      - [ ] CLS < 0.1
- [ ] DevTools → Application → Local Storage: no unexpected writes
- [ ] DevTools → Network: initial bundle < 500 KB gzipped
- [ ] Verify C: drive free space UNCHANGED (all install went to D:)
- [ ] Verify D:\DevCache\pnpm-store and D:\DevCache\vite populated

---

## STRICT RULES

1. DO NOT implement the editor UI. This is Phase 0.
2. DO NOT implement the box generator. Only the function signature.
3. DO NOT wire Supabase auth or any query.
4. DO NOT add any library not explicitly listed above without asking.
5. DO NOT use Fabric.js, Konva, Pixi, or any canvas library.
6. DO NOT use Tailwind or any CSS-in-JS other than Emotion (MUI).
7. DO NOT generate multiple components you won't use — keep it minimal.
8. DO NOT use @mui/icons-material (use material-symbols instead).
9. DO NOT copy any color, font, asset, or code from the reference site.
10. DO NOT create mockups, pouch generator, or bottle support yet.
11. If any package version conflict arises, STOP and ask with details.
12. If a step in the verification checklist fails, STOP and report
    — do not mask with workarounds.
13. Use ISO units everywhere in domain types (mm). Only convert at
    UI boundaries.
14. Every file you create must have a 1-line header comment describing
    its purpose.
15. DO NOT rename the repo folder D:\Sandbox\pacdora-clone\ and DO NOT
    create a new folder named "tanepack". The folder name stays as-is.

---

## FINAL DELIVERABLES

At the end, produce a REPORT.md file at the repo root
(D:\Sandbox\pacdora-clone\REPORT.md) containing:

1. Stack summary (versions installed for each major dependency)
2. FSD folder tree as created (2-level deep)
3. Design system summary:
   - Seed color used
   - All M3 color tokens exposed (list them)
   - Font loading strategy and confirmation Google Sans loaded or
     fell back
4. Bundle size report: initial JS gzipped, initial CSS gzipped
5. Verification checklist results (pass/fail per item)
6. Any deviations from this prompt with rationale
7. List of what is intentionally deferred to Step 2 (the box
   generator) and Step 3 (2D editor)
8. Disk usage report: how much space used on C: vs D:

Then make an initial git commit with message:
```
chore(scaffold): initial Tanepack project setup
```

Now begin. If any requirement is ambiguous or conflicts with another,
STOP and ask before proceeding.