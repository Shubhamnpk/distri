<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Drishti — AGENTS.md

## Commands
- `pnpm dev` / `pnpm build` / `pnpm start` (also `npm run ...`; lockfile is `pnpm-lock.yaml`)
- `npx tsc --noEmit` — required: `next.config.mjs` sets `typescript.ignoreBuildErrors: true` so `next build` hides type errors
- No lint/test/format scripts or `eslint.config.*` in repo; no `README.md`

## Stack
Next.js 16.3.3 App Router + Turbopack, React 19, TypeScript 5.7 strict (`noEmit`, `bundler` resolution, `isolatedModules`), Tailwind v4 via `@tailwindcss/postcss` + `tw-animate-css`, shadcn `base-nova` (RSC, `lucide`), `next/font` Inter, `@vercel/analytics` (prod only).

## Paths & aliases
- Alias `@/*` → `./*` (not `./src/*`) — `tsconfig.json:paths`
- shadcn aliases: `components:@/components`, `utils:@/lib/utils`, `ui:@/components/ui`, `lib:@/lib`, `hooks:@/hooks`; CSS at `app/globals.css`

## Structure
- `app/layout.tsx` — root layout: `Inter`, `ThemeProvider` (`data-theme` + `localStorage`), `Header`/`Footer`, `app-shell` wrapper
- `app/{page.tsx,globals.css,companies/,projects/,datasets/,economy/,sources/}` — App Router routes; add route via `app/<name>/page.tsx`
- `components/` — `header.tsx` (nav + `next/link`, mobile toggle), `footer.tsx`, `theme-provider.tsx`, `charts.tsx` (SVG `BarChart`/`LineChart`), `detail-drawer.tsx`, `shared.tsx`, `logo.tsx`, `ui/button.tsx`
- `lib/` — `api.ts` (WB + IMF), `data.ts` (hardcoded `companies`/`projects`/`sources`), `types.ts`, `utils.ts` (`cn` via `clsx`+`tailwind-merge`), `nepse.ts`, `opendatanepal.ts`, `project-nepal.ts`, `api-helpers.ts`
- `pnpm-workspace.yaml` — `minimumReleaseAgeExclude: ['@next/*','next']`

## Config quirks (verify before changing)
- `next.config.mjs`: `images.unoptimized: true` (no Next image optimization), `typescript.ignoreBuildErrors: true`
- `app/globals.css` is the Tailwind entry: `@import 'tailwindcss'`, `shadcn/tailwind.css`, `tw-animate-css`; no `tailwind.config.*`
- `postcss.config.mjs`: only `@tailwindcss/postcss`
- `components.json`: `style: base-nova`, `tailwind.css: app/globals.css`, `baseColor: neutral`, `cssVariables: true`

## Data fetching
- `lib/api.ts:fetchWb` → `https://api.worldbank.org/v2/country/NPL/indicator/<code>?format=json&date=2018:2025` (30 indicators + `fetchImf` for 4 IMF `datamapper/api/v1/<code>/NPL` forecasts to 2030)
- Other live sources: `lib/nepse.ts` → `shubhamnpk.github.io/yonepse` (`revalidate: 3600`), `lib/opendatanepal.ts` → `api.opendatanepal.com/api/3` (CKAN, 290+ datasets), `lib/project-nepal.ts` → `raw.githubusercontent.com/EverestValley/project-nepal`
- All use `fetch(..., { next: { revalidate: 86400 } })` except NEPSE (3600); handle `!res.ok` → `[]`
- `formatNpr`/`formatUsd` use live WB exchange rate `PA.NUS.FCRF` with fallback `133.5` (`lib/api.ts:NPR_RATE`)

## Styling / gotchas
- Design tokens in `app/globals.css: :root` (`--bg`, `--accent`, `--border`, etc.); dark mode via `[data-theme="dark"]` and `@media (prefers-color-scheme: dark)` — update both
- `components/charts.tsx`: SVG `<stop>` can't use CSS vars → `resolveColor()` via `getComputedStyle` after hydration; gradient `id` must be deterministic (`firstYear-lastYear-height-color`), no `Math.random()`; tooltip `zIndex: 2000` > modal `1000`
- App Shell layout depends on `app-shell` flex column; `content-wrap` padding uses `clamp()`
- Graphify knowledge graph exists at `graphify-out/` — run `graphify query "<q>"` / `path` / `explain` before broad grep; `graphify update .` after code changes
