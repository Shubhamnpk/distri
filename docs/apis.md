# Drishti — Data & API Catalogue

Every live feed the dashboard uses, how to call it, and what we learned.
**No API keys are required anywhere.** All sources below are keyless.
Registry-only sources (no client yet) are marked ⏳.

Conventions across all clients (`lib/*.ts`):

- `User-Agent: Drishti-Nepal-Accountability-Dashboard/1.0`, `Accept: application/json`
- Next fetch caching: `revalidate: 86400` (daily) for slow series, `3600` (hourly) for market/weather/hazard feeds
- Fail-soft: `!res.ok` or throw → `[]` / `null`. UI guards `.length` and renders `N/A` or hides the element — never a crash, never a zero masquerading as data
- No secrets, no `.env` entries. If a source ever needs a key, add it here first

---

## 1. World Bank Open Data — 36 indicators (`lib/api.ts: fetchWb`)

- Base: `https://api.worldbank.org/v2/country/NPL/indicator/<CODE>?format=json&per_page=20&date=2018:2025`
- Auth: none. Update cadence: annual (WDI restates history — latest year can revise).
- Client fetches in one `Promise.all` (36 + 6 IMF in parallel), filters nulls, reverses to chronological.
- Special date windows: population / electricity access `2020:2025`, literacy + internet `2015:2025`, Gini + poverty `2010:2025`, exchange rate `2018:2026`, maternal mortality `2010:2025`, energy use `2010:2025`.

| Code | Meaning | Shown on |
|---|---|---|
| `NY.GDP.MKTP.CD` | GDP, current US$ | /economy hero |
| `NY.GDP.MKTP.KD.ZG` | GDP growth, annual % | /economy |
| `NY.GDP.PCAP.CD` | GDP per capita US$ | /economy |
| `NY.GDP.PCAP.PP.CD` | GDP per capita, PPP | /economy |
| `FP.CPI.TOTL.ZG` | Inflation, CPI % | /economy |
| `SP.POP.TOTL` | Population, total | /economy |
| `NE.EXP.GNFS.CD` / `NE.IMP.GNFS.CD` | Exports / imports US$ | /economy trade |
| `BX.TRF.PWKR.CD.DT` | Remittances US$ | /economy |
| `SL.UEM.TOTL.ZS` | Unemployment % | /economy |
| `BX.KLT.DINV.WD.GD.ZS` | FDI % of GDP | /economy |
| `GC.DOD.TOTL.GD.ZS` | Central govt debt % GDP | /economy |
| `EG.ELC.ACCS.ZS` / `EG.FEC.RNEW.ZS` | Electricity access / renewable share | /economy energy |
| `SP.DYN.LE00.IN` / `SP.DYN.IMRT.IN` | Life expectancy / infant mortality | /economy |
| `SH.XPD.CHEX.GD.ZS` / `SE.XPD.TOTL.GD.ZS` | Health / education spending % GDP | /economy |
| `SE.ADT.LITR.ZS` | Literacy % | /economy |
| `NV.AGR.TOTL.ZS` / `NV.IND.TOTL.ZS` / `NV.SRV.TOTL.ZS` | Sector value-added % GDP | /economy structure |
| `SI.POV.GINI` / `SI.POV.DDAY` | Gini / poverty under $2.15 | /economy society |
| `SP.URB.TOTL.IN.ZS` / `IT.NET.USER.ZS` | Urban share / internet users | /economy society |
| `PA.NUS.FCRF` | Official USD→NPR rate (annual) | /economy monetary chart + `getLiveNprRate` last-resort fallback |
| `NE.GDI.TOTL.ZS` | Gross capital formation % GDP | /economy structure |
| `GC.REV.XGRT.GD.ZS` | Govt revenue excl. grants % GDP | /economy fiscal |
| `NE.TRD.GNFS.ZS` | Trade % of GDP | /economy openness |
| `SH.STA.MMRT` | Maternal mortality per 100k | /economy living standards |
| `SE.PRM.ENRR` | Primary enrollment, net % | /economy society |
| `IT.CEL.SETS.P2` | Mobile subscriptions /100 | /economy society |
| `AG.LND.FRST.ZS` | Forest area % land | /economy energy |
| `EG.USE.PCAP.KG.OE` | Energy use pc (kg oil eq.) | /economy energy |
| `SP.DYN.TFRT.IN` | Fertility, births/woman | /economy living standards |

- Country facts (static): `https://api.worldbank.org/v2/country/NPL?format=json` — REST Countries replacement.
- Gotcha: `EN.ATM.CO2E.PC` returns **zero** points for Nepal (even 2015:2025) — do not add without verifying.

## 2. IMF DataMapper — 6 forecasts to ~2030 (`lib/api.ts: fetchImf`)

- Pattern: `https://www.imf.org/external/datamapper/api/v1/<CODE>/NPL` → `json.indicators[CODE].NPL` = `{year: value}` map, sorted client-side.
- Auth: none. Cadence: biannual (WEO April/October).
- Codes: `NGDP_RPCH` (real GDP growth), `PCPIPCH` (inflation), `LUR` (unemployment), `BCA_NGDPD` (current account %GDP), `GGXWDN_NGDP` (govt net debt %GDP), `GGXCNL_NGDP` (fiscal balance %GDP; negative = deficit).
- Shown: /economy IMF outlook grid (6 cards).
- Gotcha: IMF returns **403 from some sandbox/datacenter IPs** — works in production, fails soft to `[]` elsewhere. Every card guards `.length`.

## 3. Nepal Rastra Bank FOREX — official (`lib/nrb.ts`)

- Docs: `https://www.nrb.org.np/api-docs-v1/`. Base: `https://www.nrb.org.np/api/forex/v1/rates`
- Example: `?from=2026-10-01&to=2026-10-13&page=1&per_page=10` → `{status:{code:200}, data:{payload:[{date, published_on, rates:[{currency:{iso3,name,unit}, buy, sell}]}]}}`
- Auth: none. Cadence: daily (banking days). Client: `next: {revalidate: 3600}`.
- Quirks: `buy`/`sell` arrive as **strings** — client coerces with `Number()`; `currency.iso3` is uppercase in payload; `status.code` must be 200.
- Functions: `getNrbUsdRate()` (latest USD mid-rate = primary input to `getLiveNprRate`), `fetchLatestForex()` (full daily table), `fetchUsdNprSeries(days)` (chart points).
- Shown: home live strip, /economy "Live NRB fixing today" pill.
- Fallback chain in `getLiveNprRate()`: NRB → jsDelivr currency-api (`cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json`, direct `usd.npr` else `usd.inr × 1.6` peg) → WB `PA.NUS.FCRF` → constant `133.5` (`NPR_FALLBACK`).
- Dead end: NRB `cmfm_rates/policy_rates` etc. now **404** (site restructured) — no JSON for policy/lending rates; those live in monthly PDFs only.

## 4. NEPSE mirror (`lib/nepse.ts`)

- Base: `https://shubhamnpk.github.io/yonepse/data` (GitHub Actions, trading days ~15:00 NPT). Auth: none, CORS-open. Revalidate 3600.
- Used: `nepse_data.json` (stocks array — tolerant mapping: `companyName||name`, `percentChange||percent_change`), `market/summary.json`, `market/top_stocks.json`, `company/profiles.json`, `company/financials.json`, `market/status.json` (`{is_open}` flag).
- Verified shapes (2026-10-14 — mirror fields are terse and change without notice):
  - `market/summary.json` is an ARRAY of `{detail, value}` (`Total Turnover Rs:`, `Total Traded Shares`, `Total Transactions`, `Total Scrips Traded`, `Total Market Capitalization Rs:`, `Total Float Market Capitalization Rs:`) — client maps by substring into `NepseMarketSummary` (+`scripsTraded`, `+marketCap`). It is NOT `{marketIndex, …}`.
  - `market/indices.json` holds the real benchmarks: `NEPSE Index` (+ Sensitive/Float variants) with `close/change/perChange/previousClose/high/low/fiftyTwoWeekHigh/Low` — client `fetchNepseIndices()`/`fetchNepseIndex()` feeds the ticker, home KPI/tape/hero. (`market/index.json` 404s.)
  - `market/top_stocks.json` keys are `top_gainer/top_loser/top_turnover/top_trade/top_transaction` (rows: `symbol/ltp/cp/pointChange/percentageChange/securityName`) — client normalises to `{topGainers, topLosers}`.
  - `company/financials.json` (5.6MB, 307 symbols — client module-caches it) is `{symbol, reports[]}` where each report is `{type: Quarterly|Annual Report, quarter, fy, fy_nepali, pe, eps, paid_up_capital, profit, net_worth_per_share}` — there are NO flat revenue/equity fields; the card renders quarterly tables from `reports`. `company/profiles.json` is `{symbol, profile, email, phone, contact_person, address, status}` — no market-cap/EPS fields; card shows contact + standing only.
- Never integrated 404: `/data/OMF.json` (migrated to folder shards). Do not wire official `nepalstock.com/api/nots/*` directly — session-gated + throttled + ToS risk; mirror-first.
- Shown: /companies `NepseTicker` (index, turnover, volume, gainers/losers, Open/Closed pill), per-company `CompanyNepseCard`.
- Helpers: `formatNprAmount` (T/B/Cr/L), `formatNumber`, `getSectorColor`.

## 5. Open Data Nepal CKAN (`lib/opendatanepal.ts`)

- Base: `https://api.opendatanepal.com/api/3` (CKAN 2.11.3, ~630 datasets). Auth: none. Revalidate 86400.
- Used actions: `package_search?q=&rows=`, `package_show?id=`, `datastore_search?resource_id=&limit=`, org/tag filters.
- `getRelevantDatasets()` buckets: companies (dept-of-industry org), projects (MoF org), economy (hydropower tag), social (`health education agriculture` search).
- `NEPAL_DATA_QUERIES` holds 17 canned queries (industry, FDI, hydropower, GDP, procurement, health, education, agriculture, climate, water…).
- CKAN envelope: `{success, result}` — client returns `result` or `null`.
- Shown: /datasets explorer (category → query mapping).

## 6. project-nepal (`lib/project-nepal.ts`)

- Base: `https://raw.githubusercontent.com/EverestValley/project-nepal/main/data`. Auth: none. Revalidate 86400.
- Paths: `hierarchy/provinces.json`, `hierarchy/districts.json`, `content/<pid>-<province-slug>/districts/<did>-<district-slug>/{projects,budgets}/2082-83.json`.
- District slugs resolved via hierarchy and cached in-memory (`getDistrictSlugResolved`).
- Helpers: `mapProjectStatus` (Reported→At risk, In Progress→On track…), `calculateProgress`, `formatBudget`.
- `fetchDistrictProblems` is a **stub returning `[]`** — raw GitHub can't list directories; needs GitHub Contents API work before use.

## 7. DataNepal.org mirrors (`lib/datanepal.ts`)

- Base: `https://datanepal.org/data/<file>.json` (static, MIT code). Auth: none. Revalidate 86400. All verified live.
- `indicators.json` (36 curated indicators w/ definitions + units), `places.json` (862: country→7 provinces→77 districts→753 local units), `geography.json` (753 boundaries/areas), `datasets.json` (source registry w/ licences).
- Provenance inside: NSO Census 2021, ECN HoR-2026 aggregates, OCHA COD-AB, UNFPA 2023 projections, Wikidata places, WB WDI. Attribute the **publisher**, not the mirror.
- Note: `observations.parquet` has **no JSON twin** — fine-grained values need a parquet reader (future ETL, not runtime fetch).

## 8. BIPAD disaster-risk API (`lib/bipad.ts`)

- Base: `https://bipadportal.gov.np/api/v1/` (NDRRMA, ~150 resources). Auth: none. Revalidate 3600. Verified live.
- Used: `/incident/`, `/alert/`, `/earthquake/`, `/loss/`, `/project/`, `/rain-stations/`, `/river-stations/`, `/{province,district,municipality,ward}/`.
- Shape: DRF `{count, next, previous, results[]}` — client takes `?limit=` (default 10) and returns `{count, results}`. Note: `count` can be a 64-bit sentinel — treat as opaque.
- Shown: /environment incidents + alerts. Geo backbone reserved for map joins.
- Map joins (`lib/district-geo.ts`, `/projects/map`): `/district/` rows carry `centroid` + `bbox` + `province` number + `title_en` (77 districts, tiny, 12s timeout, module-cached). District polygons come BUNDLED per province from `public/geo/districts/<1-7>.geojson` (split from the 1.2MB monolith — 76–226KB each, fetched ONLY when its province opens, cached per province; exact `{DISTRICT, HQ, PROVINCE}` join). DataNepal `place_boundaries.json` is a last-resort fallback. If the district API stalls, pins/zoom/filter derive from the bundled polygons — drill-down never blanks. Our 30 projects have no GPS — pinned to matched-district centroids via `lib/geo:matchDistricts` (+ deterministic jitter), always labeled ≈ approx; national-scope projects stay unpinned in the side list.

## 9. DHM weather API (`lib/dhm.ts`)

- Base: `https://dhm.gov.np/mfd/api`. Auth: none. Revalidate 3600. Verified live (payloads stamped same-day).
- Used: `/weather` (20 cities, 2-day manual+model forecast, EN/NE), `/manual-observation` (today's observed min/max + rainfall), `/country-forecast` (bulletin).
- Verified 2026-10-14: numeric per-city forecast is days 1–2 ONLY — match rows by the `day` field, not array index. `/three-days-forecast-latest` returns Nepali titles + `forecast-images/…/day_N_….png` paths that 404 at every predictable base (`/mfd/`, `/`) — do not embed; day-3 exists only as unreachable map images.
- Shown: /environment outlook grid (first 8 stations with forecasts; rain badge > 40%).
- Shown: /environment outlook grid (first 8 stations with forecasts; rain badge > 40%).
- Dead end: `hydrology.gov.np` realtime is socket.io SPA with no REST — use BIPAD station mirrors instead.

## 10. World Bank Projects API (`lib/wb-projects.ts`)

- `https://search.worldbank.org/api/v3/projects?format=json&countrycode_exact=NP&rows=N&page=P`. Auth: none. Revalidate 86400. Verified live: **281 Nepal projects**.
- Gotchas: **must** use `countrycode_exact=NP` (bare `countrycode` silently returns global); `projects` is a **keyed object** (`{P-id: {...}}`) — client uses `Object.values()`; amounts are strings (`totalamt`, `idacommamt`, `lendprojectcost`) — see `wbProjectCommitment()`.
- Shown: /projects header ("World Bank portfolio in Nepal: N").

## 11. WHO Global Health Observatory (`lib/who.ts`)

- Pattern: `https://ghoapi.azureedge.net/api/<CODE>?$filter=SpatialDim%20eq%20'NPL'&$top=N`. Auth: none. Revalidate 86400. Verified live (`WHOSIS_000001` → NPL 2022: 71.4).
- Gotchas: dimension field is `SpatialDim` (not `SpatialDimension`); read `NumericValue` (ignore the `Value` uncertainty string); default to `Dim1 = SEX_BTSX` (both sexes) rows; **always** `$filter` + `$top` — unfiltered dumps are huge.
- `WHO_CODES` holds 4 candidates; only life expectancy is byte-verified — verify any new code via `searchWhoIndicators()` before charting.
- Shown: none yet (client + registry ready; next health card).

## 12. Open-Meteo + USGS (`lib/meteo.ts`)

- Forecast: `https://api.open-meteo.com/v1/forecast?latitude=&longitude=&current=temperature_2m,relative_humidity_2m,rain,weather_code&timezone=Asia%2FKathmandu`. Auth: none. Revalidate 3600. Verified live.
- Air quality is a **different host**: `https://air-quality-api.open-meteo.com/v1/air-quality?...&hourly=pm2_5` — client takes the last hourly value.
- `NEPAL_DISTRICT_CENTERS` pins 7 city lat/lons (Kathmandu, Pokhara, Biratnagar, Nepalgunj, Dhangadhi, Surkhet, Jumla).
- Earthquakes: `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=26&maxlatitude=31&minlongitude=80&maxlongitude=89&limit=N&orderby=time`. Verified live.
- Model gap-filler: `daily=temperature_2m_max,temperature_2m_min&forecast_days=7` backs DHM's null `to_temperature` and missing station observations — UI must tag these `·model`, never silently.
- Shown: /environment hero (temp/humidity/rain/PM2.5 + AQI pill w/ US-EPA breakpoints) and tremor pills.
- Dead ends: OpenAQ v3 (key), aqicn (token — `demo` serves canned data), DoEnv `pollution.gov.np` portal (SPA, datacenter-blocked; retry in browser).

## 13. Registry-only sources ⏳ (listed in `lib/data.ts: sources`, no client yet)

| Source | Why no client | Path forward |
|---|---|---|
| NSO Census 2021 results site | Original hosts flaky; DataNepal mirror covers it | Use `lib/datanepal.ts` |
| Niti/Naxa Hydropower Portal (572 projects) | HTML tables + **keyless JSON**: `/api/district/`, `/api/gapanapa/`, `hydro.js` GeoJSON points (name/MW/river/year/coords) — wired via `lib/naxa.ts` for the national atlas | Plotted live on `/projects/map` |
| HDX COD-AB + COD-PS | Verified CKAN (`data.humdata.org/api/3/action/package_search`) | `lib/hdx.ts` for map shapes + p-codes |
| UNICEF SDMX (`sdmx.data.unicef.org`) | Needs `Accept: application/vnd.sdmx.data+json;version=2.0.0` header + SDMX-JSON parser | Small client, header first |
| UN Data Portal (WPP) | Locations/indicators verified; data endpoint returned 401 with guessed params | One param/header pass |
| NTA MIS monthly PDFs | 15 yrs of tabular PDFs, stable URLs | PDF parser pipeline (see sources page brief) |
| EDCD EWARS weekly bulletins | Numbered weekly PDFs + public dashboard | Trivial harvester |
| DoFE labor permits, CEHRD Flash, DoR progress, ERC DMS lists, AEPC/NEA reports | HTML/PDF, no JSON | Scraper prompt on /sources |
| ECN HoR-2082 (ERIS) | ASP.NET HTML, no JSON | Scraper only if election scope grows |

## 14. Explicit dead ends — do not integrate

IMF direct from sandbox (403, works in prod) · NSO CKAN `data.nsonepal.gov.np` (unreachable) · PPMO/bolpatra (403 bot-wall) · NOC official (HTML ticker only) + `noc-nepal-api` host (DNS fail) · gold mirror `sabinmagar` (404) · CoinGecko (DNS fail from sandbox) · FRED/ITC TradeMap/Swippee (keys) · IRMIS/MeroShare/TMS (auth) · FENEGOSIDA history (login) · REST Countries (now key-gated) · ReliefWeb v1 (dead; v2 needs approved appname) · IATI live API (needs subscription key — use bulk dumps) · ACLED / FIRMS / GFW / ElectricityMaps / NewsData (keys) · Kalimati prices (host unreachable — recheck from Nepal IP) · `welcomenepal.com` (hijacked — use `tourism.gov.np`) · DoR old road-network JSON (gone) · NEPSE official NOTS (session-gated — mirror-first).

## 15. Formatting & money

- `formatUsd` / `formatNpr` / `formatNum` / `pctChange` live in `lib/api.ts` (canonical) — `lib/api-helpers.ts` duplicates them with a fixed 133.5 rate (legacy, do not extend).
- `formatNpr` uses live `getLiveNprRate()` when available, else `NPR_FALLBACK = 133.5`; Indian peg `INR_TO_NPR = 1.6`.
- NEPSE-specific `formatNprAmount` (T/B/Cr/L) lives in `lib/nepse.ts`; budget strings (`NPR 213.9B`, `USD 216M`) parse via `parseBudgetCr` in `lib/data.ts` (B = 100 Cr, USD × 133.5).

## 16. Company sources — live vs blocked (swept 2026-10-13)

Two subagent sweeps probed ~30 company-data sources with real fetches. Integrated clients first, then the full matrix.

### Integrated

- **yonepse LTP history (`lib/nepse.ts: fetchLtpRecent`)** — `ltp/manifest.json` (2007-2026 month index) + `ltp/monthly/YYYY-MM.json` (~244KB: `dates[]` + per-symbol `[dateIndex, ltp, volume, turnover, trades]` rows). Client merges the last 3 months into chronological closes. Shown: per-company recent-sessions chart (`CompanyNepseCard`).
- Exact symbol map (`lib/company-symbols.ts`, hand-verified 2026-10-14): Nepal Telecom→NTC, CIT→CIT, Salt Trading→STC. RBB trades as **RBBL** but is suspended (LTP 0.00, absent from both daily mirrors) — deliberately unmapped. NEA/NOC/NAC/NTV/NWSC/DDC/CAAN/DCGF unlisted; cements/metals/spinning closed; Dhaubadi pre-operational. Unmapped companies show MoF figures with no market section — no fuzzy matching.
- Retired: OmitNomis ShareSansar mirror (duplicate stock source — yonepse covers snapshot + history + IPO + brokers alone).
- **yonepse extras (`lib/nepse.ts: fetchUpcomingIpos`)** — `/data/ipo/upcoming.json` verified live (company, units, date_range, announcement_date). Shown: IPO pipeline strip in `NepseTicker`. Also confirmed live but unused: `/data/ltp/manifest.json` (2007-2026 monthly index), `/data/ltp/monthly/YYYY-MM.json` (sparse per-symbol series), `/other/brokers.json` (90+ brokers, turnover, TMS links). Dead shards (404, do not use): `/data/ltp/daily/*`, `/data/daily/*`, `/proposed_dividend/latest_1y.json`, `/data/OMF.json`.
- **merolagani handler JSON** — `https://merolagani.com/handlers/webrequesthandler.ashx?type=market_summary` verified live (`{mt:"ok", overall:{...}, turnover:{detail:[{s,lp,t,pc,h,l,op,q}]}}`, 63KB). Only source for EPS/P/E/book/dividends/market-cap (via `CompanyDetail.aspx?symbol=` HTML, scrapable). Not wired (mirror-first policy) — fallback candidate if yonepse stalls. `nepse-data.merolagani.com` is a stub ("API development."). parse.bot marketplace mirror is key-gated (paid).
- **GLEIF LEI** — `https://api.gleif.org/api/v1/lei-records?filter[entity.legalAddress.country]=NP` verified live: **42 Nepali entities** (banks w/ BICs, hydros, subsidiaries) with legal names, addresses, jurisdiction. Registry only — niche ID layer for banks/hydros.
- **Wikidata REST** — `wbsearchentities` + `Special:EntityData/<QID>.json` verified live (e.g. Nepal Telecom → Q3338265). SPARQL endpoint timed out from sandbox — use REST, not SPARQL. Registry only (QIDs/founded/HQ for the 19 PEs).
- **Open Data Nepal orgs** — `office-of-company-registrar`, `department-of-industry`, `ppmo`, `inland-revenue-department` orgs exist; `q=company registrar` returns 0, `q=department of industry` non-empty. Unlisted-company path = org-scoped `package_search` (follow-up).

### Live but not machine-readable (HTML/PDF/XLSX — harvester/ETL territory)

- **SEBON** `sebon.gov.np/public-issues-data` — yearly XLSX master (`/uploads/2026/08/10/<hash>.xlsx`) + pipeline pages; counts: 90 brokers, 125 DPs, 33 merchant bankers, 24 MFs. Cleanest bulk issuer dataset.
- **NIA** `nia.gov.np/insurance-industry-data` — monthly dual PDF+XLSX per month (FY 2083/084→2078/79), ~3–4wk lag. Only machine-readable insurer financials.
- **CDSC** `cdsc.com.np/registeredcompany` — 286-row issuer table + RTA map; homepage counters (8.1M demat). NOTE: `www.` subdomain is dead — use apex.
- **NTA** `nta.gov.np/page/licensee-list` (server-rendered: 25 network, 2 GSM, 12 VSAT, 104 ISPs) + `page/mis-pdf` (220-row monthly index, stable `MIS_2083 Bhadra.pdf` pattern back to 2060 BS).
- **NRB** `nrb.org.np/bank-list` (~150 BFIs + branch tables) + monthly BFI statistics (PDF/XLSX).
- **NTC CMS** `cms.ntc.net.np/storage/media/*.pdf` — only PE with predictable quarterly financial URLs (Nuxt SPA, JSON-backed CMS).
- **CIB** `cibnepal.org.np/assets/upload/block/blacklist_upload_<date>.pdf` (predictable) + HTML member list (124). Reports behind login.
- **OAG legacy** `old.oag.gov.np` (report index + `/uploads/files/*.pdf`) — new `oag.gov.np` is a JS shell (unscrapable as HTML).
- **DoInd** `doind.gov.np` — counters (5,821 industries, 7,564 FDI) + monthly FDI reports; verification form has CAPTCHA (single-record only).
- **FNCCI** `fncci.org/member/*.php` — paginated HTML member DB. `data.fncci.org` BIS portal linked.
- **IBN** `ibn.gov.np` — PDFs + press releases only; `ossc.ibn.gov.np` login.
- **WB Enterprise Surveys Nepal 2023** — bulk CSV behind free registration (not keyless-anonymous).
- **Kaggle NEPSE sets** — stale 2022–24 + needs Kaggle key.

### Blocked (do not retry without new access)

- **NEA whole domain** — WAF "Request Rejected" (Imperva/F5) for fetcher UAs.
- **DOCSI** (`docsi.gov.np` + `www`) — DNS/connect fail, both.
- **OCR registry bulk** — `company.ocr.gov.np` is a JS shell; CAMIS login-walled; `robots.txt` discloses no API.
- **IRD PAN lookup** — JS/XHR behind form; bulk lists don't exist; portal auth-walled.
- **COPOMIS** (`copomis.gov.np`) — auth-wall. **CIB credit reports** — login. **HMIS/DHIS2** — login.
- **OAG new site** — JS shell (use legacy host above).
- **NARC** — 403 WAF. **CAAN stats subpages** — transient transport errors (retry; homepage 200).
- **DoLIDAR / Traffic Police / NTB apex / lalitpurmun / pokharamun** — DNS/connect fail from outside Nepal (retry in-country).
- **PPMO blacklist** — transport error/403. **CDSC `www`** — dead (apex works).
- **OpenCorporates** — no NP jurisdiction (404) + API needs token (401). **Crunchbase/LinkedIn/Clearbit** — paid/OAuth. **nepsealpha** — login-gated. **nepsetrading AI** — paywalled. **FNCCI `/members`** — 404 (use `/member/*.php`).
- **NEPSE intraday shards, dividend file, OMF** — 404 (see yonepse notes above).
- **Wikidata SPARQL** — sandbox timeout (REST works).
