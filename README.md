<!-- Project overview, architecture, scripts, and local cache setup for Tanepack -->

# Tanepack

Low-overhead 2D/3D folding carton packaging design tool built with React 18, TypeScript, Vite, Material Design 3, and Feature-Sliced Design (FSD).

> Repository directory: `D:\Sandbox\pacdora-clone\` (kept in-place intentionally for workspace continuity).

## Architecture (Feature-Sliced Design)

```text
src/
├── app/        # Providers, router, M3 tokens, MUI augmentations, global styles
├── pages/      # Lazy-loaded route views (HomePage, EditorPage, NotFoundPage)
├── widgets/    # Composite UI shells (TopBar, AppShell)
├── features/   # Interactive user features (Step 2+)
├── entities/   # Domain types and contracts (dieline, design-document, user)
├── shared/     # Config/env, Supabase client, units, IDs, M3 shared UI primitives
└── main.tsx    # Application entry point
```

Import direction flows strictly downward: `app -> pages -> widgets -> features -> entities -> shared`.

## Getting Started

```powershell
# Redirect temporary caches off C: if space-constrained
$env:TEMP = "D:\DevCache\tmp"
$env:TMP  = "D:\DevCache\tmp"

pnpm install
pnpm dev
```

Open `http://localhost:5173`.

## Scripts

- `pnpm dev` — Start Vite development server (`cacheDir` set to `D:/DevCache/vite`)
- `pnpm build` — Typecheck (`tsc --noEmit`) and create production bundle in `dist/`
- `pnpm preview` — Serve the production `dist/` bundle locally
- `pnpm typecheck` — Run TypeScript strict type checking
- `pnpm lint` — Run ESLint with `--max-warnings 0`
- `pnpm format` — Format code and organize imports with Prettier
- `pnpm test` — Run Vitest unit tests (`pnpm test -- --run` for single pass)

## Environment & Database Scaffold

Supabase integration is optional in Phase 0–1. Leave `.env.local` absent to run cleanly offline with zero warnings. When enabling cloud sync later, copy `.env.example` to `.env.local` and apply `docs/supabase-schema.sql` in Supabase.
