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
- `app/{page.tsx,globals.css,companies/,projects/,datasets/,economy/,environment/,sources/}` — App Router routes; add route via `app/<name>/page.tsx` (`/environment` = live DHM/BIPAD/USGS/Open-Meteo feeds)
- `components/` — `header.tsx` (nav + `next/link`, mobile toggle), `footer.tsx`, `theme-provider.tsx`, `charts.tsx` (SVG `BarChart`/`LineChart`), `detail-drawer.tsx`, `shared.tsx`, `logo.tsx`, `ui/button.tsx`
- `lib/` — `api.ts` (WB + IMF), `data.ts` (hardcoded `companies`/`projects`/`sources`), `types.ts`, `utils.ts` (`cn` via `clsx`+`tailwind-merge`), `nepse.ts`, `opendatanepal.ts`, `project-nepal.ts`, `api-helpers.ts`
- `pnpm-workspace.yaml` — `minimumReleaseAgeExclude: ['@next/*','next']`

## Config quirks (verify before changing)
- `next.config.mjs`: `images.unoptimized: true` (no Next image optimization), `typescript.ignoreBuildErrors: true`
- `app/globals.css` is the Tailwind entry: `@import 'tailwindcss'`, `shadcn/tailwind.css`, `tw-animate-css`; no `tailwind.config.*`
- `postcss.config.mjs`: only `@tailwindcss/postcss`
- `components.json`: `style: base-nova`, `tailwind.css: app/globals.css`, `baseColor: neutral`, `cssVariables: true`

## Data fetching
- `lib/api.ts:fetchWb` → `https://api.worldbank.org/v2/country/NPL/indicator/<code>?format=json&date=2018:2025` (36 indicators + `fetchImf` for 6 IMF `datamapper/api/v1/<code>/NPL` forecasts to 2030: growth, inflation, unemployment, current account, govt net debt `GGXWDN_NGDP`, fiscal balance `GGXCNL_NGDP`)
- Other live sources: `lib/nepse.ts` → `shubhamnpk.github.io/yonepse` (`revalidate: 3600`), `lib/opendatanepal.ts` → `api.opendatanepal.com/api/3` (CKAN, 630 datasets), `lib/project-nepal.ts` → `raw.githubusercontent.com/EverestValley/project-nepal`
- New: `lib/nrb.ts` → NRB official FOREX API `nrb.org.np/api/forex/v1/rates` (primary USD→NPR rate for `getLiveNprRate`, hourly); `lib/datanepal.ts` → `datanepal.org/data/*.json` (36 indicators, 862 places, 753 local units, census 2021 + ECN 2026 mirrors). NSO CKAN (`data.nsonepal.gov.np`) unreachable from server — use DataNepal mirror instead.
- Round 4: yonepse-only for stocks (`lib/nepse.ts`: `fetchLtpRecent` 1y chart from `ltp/monthly/*.json` shards via manifest, `fetchUpcomingIpos` strip in ticker, `fetchNepseIndices` real benchmark). Retired OmitNomis ShareSansar (duplicate source). Dead shards: yonepse `ltp/daily/*`, `daily/*`, `proposed_dividend`, `OMF.json` (all 404).
- Round 3: `lib/bipad.ts` → BIPAD DRR API `bipadportal.gov.np/api/v1/` (incidents/alerts/quakes/losses/projects/stations/geo, DRF `?limit=&offset=`, hourly); `lib/dhm.ts` → DHM MFD `dhm.gov.np/mfd/api/{weather,manual-observation,country-forecast}` (2×daily); `lib/wb-projects.ts` → WB Projects `search.worldbank.org/api/v3/projects` (must use `countrycode_exact=NP`, projects is keyed object; count shown on `/projects`); `lib/who.ts` → WHO GHO OData (`SpatialDim eq 'NPL'`, `NumericValue`, always `$filter`+`$top`); `lib/meteo.ts` → Open-Meteo forecast + separate air-quality host + USGS FDSN Nepal bbox. Dead ends (do not integrate): IMF direct from sandbox (403, works in prod), NSO CKAN (unreachable), PPMO/bolpatra (403), hydropower portal (HTML only, no JSON), NOC official (no JSON) + `noc-nepal-api` host (DNS fail), gold mirror (404), CoinGecko (DNS fail from sandbox), REST Countries (now key-gated — use WB country API), ReliefWeb v1 (dead), IATI live API (key — use bulk dumps), ACLED/FIRMS/GFW/ElectricityMaps/NewsData (all key-gated), OpenAQ v3 (key), aqicn (needs token).
- All use `fetch(..., { next: { revalidate: 86400 } })` except NEPSE (3600); handle `!res.ok` → `[]`
- `formatNpr`/`formatUsd` use live WB exchange rate `PA.NUS.FCRF` with fallback `133.5` (`lib/api.ts:NPR_RATE`)
- Full feed catalogue (endpoints, codes, gotchas, dead ends): `docs/apis.md` — read it before adding any source

## Styling / gotchas
- Design tokens in `app/globals.css: :root` (`--bg`, `--accent`, `--border`, etc.); dark mode via `[data-theme="dark"]` and `@media (prefers-color-scheme: dark)` — update both
- Tokens are fully mapped in `@theme inline`, so prefer utilities over `var()` in new code: `bg-card/bg-sunken/bg-canvas`, `text-ink/text-secondary/text-tertiary`, `border-line/border-line-light`, `text-accent/bg-accent`, `text-danger/bg-danger-light`, `shadow-sm/md/lg`, `rounded-lg(14px)/rounded-xl(18px)`, `font-sans`. Values match the `var()` tokens exactly.
- `components/charts.tsx`: Recharts (`BarChart`/`LineChart`/`ProgressRing`) with identical props — colors resolved via `getComputedStyle` after hydration (`resolveColor`, SVG attrs can't take `var()`); gradient `id` deterministic, animations off (30+ charts/page), tooltip positioned natively by Recharts
- App Shell layout depends on `app-shell` flex column; `content-wrap` padding uses `clamp()`
