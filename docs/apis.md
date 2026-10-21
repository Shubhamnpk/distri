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

## 2. IMF World Economic Outlook — 12 series to 2031 (`lib/imf.ts`)

- Primary: `https://api.imf.org/external/sdmx/2.1/data/IMF.RES,WEO,9.0.0/NPL.<CODE>.A?startPeriod=1980` → compact SDMX-ML (`<Obs TIME_PERIOD="YYYY" OBS_VALUE="X"/>`). The generic `WEO` dataflow is the **live** dataset behind the DataMapper chart (dataset stamp Aug‑Oct 2026); 14 parallel calls ≈ 2 s. `version` is derived from `PUBLICATION_DATE` (currently `2026-10`).
- Legacy direct: `https://www.imf.org/external/datamapper/api/v1/<CODE>/NPL` (browser primary in `lib/api.ts`) — **403 from many datacenter IPs**; the client falls back to `/api/imf` when any of its 6 series is empty.
- Fallback: DBnomics mirror (`https://api.db.nomics.world/v22/series/IMF/WEO:<version>/NPL.<code>?observations=1`) — **frozen at `WEO:2025-04`** (2025-10/2026-04 → 404). Its values are stale: 2026 growth = 5.48 vs the live 3.60. Use only if SDMX is down.
- Codes: `NGDP_RPCH` (real GDP growth), `NGDPD` (nominal GDP), `NGDPDPC` (GDP pc), `PPPGDP`/`PPPPC` (PPP), `PCPIPCH` (inflation), `BCA_NGDPD` (current account %GDP), `NID_NGDP` (investment %GDP), `GGR_NGDP`/`GGX_NGDP` (revenue/expenditure), `GGXCNL_NGDP` (fiscal balance), `GGXWDG_NGDP` (gross debt). `LUR` (unemployment) and `GGXWDN_NGDP` (net debt) are empty in the WEO extract — do not render unless filled.
- Shown: /economy IMF outlook grid (up to 12 cards).
- Actual vs forecast: the split is the **current year** (`FORECAST_START` in `app/economy/page.tsx`), not the WEO vintage. Years `< current` render solid (`value`), current onward render dashed (`forecast`). Forecast modals default to the 10Y range so the solid history is visible; 5Y would be all dashed.

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
- Used: `nepse_data.json` (stocks array — tolerant mapping: `companyName||name`, `percentChange||percent_change`), `market/summary.json`, `market/top_stocks.json`, `company/profiles.json`, `company/financials.json`, `market/status.json` (`{is_open}` flag), `other/sector_codes.json`, `market/history.json`, `indices/manifest.json` + `indices/monthly/YYYY-MM.json`.
- Verified shapes (2026-10-14 — mirror fields are terse and change without notice):
  - `market/summary.json` is an ARRAY of `{detail, value}` (`Total Turnover Rs:`, `Total Traded Shares`, `Total Transactions`, `Total Scrips Traded`, `Total Market Capitalization Rs:`, `Total Float Market Capitalization Rs:`) — client maps by substring into `NepseMarketSummary` (+`scripsTraded`, `+marketCap`). It is NOT `{marketIndex, …}`.
  - `market/indices.json` holds the real benchmarks: `NEPSE Index` (+ Sensitive/Float variants) with `close/change/perChange/previousClose/high/low/fiftyTwoWeekHigh/Low` — client `fetchNepseIndices()`/`fetchNepseIndex()` feeds the ticker, home KPI/tape/hero. (`market/index.json` 404s.) **Gotcha:** `change`/`perChange` lose their sign (all positive); compute `close - previousClose` yourself.
  - `market/top_stocks.json` keys are `top_gainer/top_loser/top_turnover/top_trade/top_transaction` (rows: `symbol/ltp/cp/pointChange/percentageChange/securityName`) — client normalises to `{topGainers, topLosers}`. Gainers/losers are full ranked lists (218/106), not 10-row teasers.
  - `nepse_data.json` market cap is in **Rs millions** for equities but **absolute rupees** for the 14 open-ended funds (`market_cap >= 1e6`) — `fetchNepseStocks` normalises to absolute NPR via that threshold.
  - `other/sector_codes.json` is `{sector: [{symbol, name}]}` — 16 sectors, 583 symbols, no duplicates (`fetchNepseSectorMap`).
  - `market/history.json` is newest-first daily `{businessDate, totalTurnover, totalTradedShares, totalTransactions, tradedScrips}` (~234 sessions); `fetchNepseMarketHistory(days)` returns oldest-first.
  - `indices/manifest.json` + `indices/monthly/YYYY-MM.json` (`dates[]`, `columns`, `series: {NEPSE, SENSIND, BANKSUBIND, …}` of `[dateIndex, close, open, high, low, turnover, volume, trades]`). `fetchNepseIndexHistory(months)` merges daily NEPSE closes. Latest shard can trail `market/indices.json` by a week.
  - `company/financials.json` (5.6MB, 307 symbols — client module-caches it) is `{symbol, reports[]}` where each report is `{type: Quarterly|Annual Report, quarter, fy, fy_nepali, pe, eps, paid_up_capital, profit, net_worth_per_share}` — there are NO flat revenue/equity fields; the card renders quarterly tables from `reports`. `company/profiles.json` is `{symbol, profile, email, phone, contact_person, address, status}` — no market-cap/EPS fields; card shows contact + standing only.
- Never integrated 404: `/data/OMF.json` (migrated to folder shards). Do not wire official `nepalstock.com/api/nots/*` directly — session-gated + throttled + ToS risk; mirror-first.
- Shown: `/market` (index hero + 12M chart, turnover KPI strip, squarified turnover/market-cap heatmap with sector filter, gainers/losers/turnover leaders, 30-session activity, breadth, sector pulse, sortable full board, IPO pipeline); /companies `NepseTicker` (index, turnover, volume, gainers/losers, Open/Closed pill), per-company `CompanyNepseCard`.
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
- Index: `GET /api/v1/` returns the router's resource names — nearly all are reachable anonymously (re-verified 2026-10-19). `curl.exe` works from Windows; **PowerShell 5.1 `Invoke-WebRequest` got 404 for every path** (use curl).
- Used: `/incident/`, `/alert/`, `/earthquake/`, `/loss/`, `/project/`, `/rain-stations/`, `/river-stations/`, `/{province,district,municipality,ward}/`, and for the disaster ledger (`app/disasters/page.tsx`) + climate panel (`app/environment/page.tsx`): `/hazard/`, `/incident-profile/`, `/incident-relief/`, `/annual-budget-activity/`, `/nepali-fiscal-year/`, `/nap-temperature/`, `/nap-precipitation/`, `/loss/<id>/`; for the map district card (`components/national-map.tsx`): `/demographic/`, `/earthquake-riskscore/`.
- Shape: DRF `{count, next, previous, results[]}` — client takes `?limit=` (default 10, honoured up to ≥2000) and returns `{count, results}`. Note: `count` **is always the 64-bit sentinel 9223372036854775807** — never displayable, never trust it; count rows yourself or page until `next` is null. **`/district/` never nulls `next`**: after the 77 real rows it keeps serving empty pages, so stop on a short page (`rows.length < limit`), not on `next`.
- **Ordering gotcha (was serving 2011 data)**: the default sort is **ASCENDING**, so an unordered `/incident/` returns 2011–2016 fires. Must pass `&ordering=-id` (or `-incident_on`). **Camel-case `ordering=-incidentOn` is silently ignored** — same for `orderby=`, `sort=`. `/alert/` has the same trap (unordered = 2026-05, `-id` = this week). Incidents ≈ 28/day, so `limit=1000` covers ~5 weeks, `2000` ~7.
- **`fields=` works** (field names in snake_case: `?fields=id,title,point,hazard,incident_on`) and cuts `/incident/` from 149 KB/200 rows to ~183 KB/1000 rows. Unknown names are silently dropped (a camelCase `incidentOn` just vanishes) — verify the response.
- Filters that work: `?hazard=<id>`, `?district=<id>`, `?hazard=&district=` combined, `?search=<text>` (title), `?incident=<id>` on child resources. Filters that do **nothing** (silently): `__gte`/`__lte` date lookups (`incidentOn__gte=`, `createdOn__gte=`), `loss__isnull=`.
- Detail routes work: `/incident/<id>/`, `/loss/<id>/`, `/district/<id>/` (carries `code` e.g. `ktm`, `order`, numeric `province`). `?fields=` is honoured on detail routes too, e.g. `/loss/489392/?fields=id,estimated_loss`. Joins: `incident.loss` → `/loss/<id>/` (all people/family/infrastructure/livestock/agriculture counters + `estimatedLoss`); `loss` → `/loss-people|loss-family|loss-infrastructure|loss-agriculture|loss-livestock/?loss=<id>` (per-victim rows: gender/status/age, `belowPoverty`, `economicLoss`, `equipmentValue`, `beneficiaryOwner`); `/incident-relief/?incident=<id>` → relief given for that incident. Many incidents have no loss/relief child rows.
- **The `incident.loss` join must be per-id — bulk joins silently miss most rows.** Loss rows are *not* ordered with the incidents pointing at them (new incidents frequently carry old loss ids), so `/loss/?ordering=-id&limit=N` matched only **35/200** incidents at `limit=200` and **59/200** at `limit=400` (measured 2026-10-19). `?id__in=`, `?ids=` and `expand=` are all **silently ignored** (`id__in` returns the default ascending page), and `ordering=-id` on `/loss/` does work for the page itself (489392, 489391…) while deep `offset=` without `ordering` pages the ascending set. Only `/loss/<id>/` fetches reliably: `fetchBipadLossesByIds()` pulls the ~50 ids the ledger shows in batches of 12 → **50/50 joined**.
- **Map card detail + loss** - `/incident/<id>/` adds `titleNe`, `cause`, `description`, `verificationMessage`, `approved`, `dataSource` and `wards[]` (numeric ids; the slim list/pin row has none of these). `/loss/<id>/` (join from `incident.loss`) carries the full counters: people death/missing/injured (+ gender splits), `peopleAffectedCount`, `familyAffected/Relocated/EvacuatedCount`, `livestockDestroyedCount`, infrastructure destroyed/affected (house, road, bridge, electricity), `infrastructureEconomicLoss`, `agricultureEconomicLoss` and `estimatedLoss` in NPR. Child rows (`/loss-people|family|infrastructure|livestock|agriculture/?loss=<id>`) are sparse per-victim/per-item detail - most rows just carry `count`, and `loss-people` names are usually null. Place names: `/ward/<id>/` -> `municipality` -> `/municipality/<id>/` (`title`, `type`, `district`) -> `/district/<id>/`. **The municipality's `district` FK can be an id the `/district/` list never returns** (Sanibheri's district is 542 = Rukum West while the list stops at 78), so resolve it through the detail route. **Map pins are inline-SVG glyphs from `lib/hazard-svg.ts`** (snake, slope, flame, cloud+rain, waves, paw, wind, bolt, cracked house, snow, virus, plane, car, warning), tinted with the hazard dictionary's `color`; BIPAD's own 24px line-art `icon` turns to mush at pin size. Clicking a pin opens its incident card (title + Nepali title, hazard, date, ward/palika/district, source, verification, casualty/damage grid, NPR estimate).
- Shown: /environment incidents + alerts (`ordering=-id`), map "Incidents" layer (1000 slim pins, BS-2083 filtered), map district card census profile + seismic risk, /disasters incident ledger + relief + DRR budget, /environment NAP climate panel.
- **More data, verified 2026-10-19 — ✔ = integrated** — the high-value ones first:
  - ✔ `/hazard/` — **47-row hazard dictionary** (id → `title`/`titleEn`/`titleNe`, `icon`, `color`, `type`). Incident/alert/loss/bulletin rows only carry a numeric `hazard`, so this is the lookup that turns `hazard: 10` into "Fire". 11 KB, cache forever. (Fire 10, Flood 11, Landslide 17, Earthquake 8, Snake Bite 20, Forest Fire 12, GLOF 26, Cold Wave 6, Thunderbolt 23…)
  - ✔ `/incident-profile/` — **national yearly aggregates 2011→2026**, no params, and **not the DRF shape**: returns `{data:[{year, values:{incidentCount, estimatedTotalLoss (NPR), peopleDeathCount, peopleMissingCount, peopleInjuredCount, familyRelocatedCount, livestockDestroyedCount, agricultureDestroyedCount, totalInfrastructureDestroyedCount}}]}` (2015 Gorkha year; 2024: 8,462 incidents / NPR 3.16 bn / 756 deaths; 2026 is partial). 4 KB — a ready-made accountability time series. `fetchBipadIncidentProfile()` reads `.data`, not `.results`.
  - `/resource-profile/` — national facility counts: schools 8,581 · health 16,299 · finance 14,460 · governance 3,206 · tourism 2,759 · cultural 4,166 · communication 640 · industry 779.
  - ✔ `/incident-relief/` — **what was actually handed out per incident**: `reliefAmountNpr`, `numberOfBeneficiaryFamily`, `dateOfReliefDistribution`, `causeOfIncident`, `fiscalYear` (id → `/nepali-fiscal-year/`), `province`/`district`/`municipality` (numeric ids), `nameOfBeneficiary`, and an equity split (`totalMaleBenefited`, `totalFemaleBenefited`, `totalDalitBenefited`, `totalJanjatiBenefited`, `totalMadhesiBenefited`, `totalMinoritiesBenefited`, `totalDisabledBenefited`). **Sparse**: only **12 rows exist in total** (रु 2,374,999, dates Oct 2023→Mar 2026) while the yearly loss totals run to NPR 3.16 bn — report both as published, never as relief-vs-damage arithmetic. `incident` here is a numeric id, not an object.
  - `/bipad-bulletin/` — daily national bulletin: `bulletinDate` + window (`fromDateTime`→`toDateTime`, 14:00→14:00), `peopleLoss` per province (`{province:{death,injured,missing}}`), `hazardWiseLoss` (keys in Nepali: बाढी/पहिरो/आगलागी…, each with deaths/injured/missing/incidents), `dailySummary`, `pdfFile`/`pdfFileSummary`, `addedHazards`, `sitrep` (id). Some fields (`pdfFile`, `tempMin*`, `province`) are empty on recent rows — read defensively.
  - `/situation-report/` — 3 rows only, all 2020 monsoon (`title`, `narration` HTML, `fromDate`/`toDate`, `event`).
  - `/disaster-profile/` — **municipality DRRM reports**: title `"<City> DRRM Report FY 2079/80"`, `summaryFileEn/Np` + `fullFileEn/Np` (live PDFs under `/mediafiles/reports/disaster_profile/`), `drrmCommitteeFormationDate`, `drrmCommitteeMembersCount`, `mayorChairperson`/`chiefAdministrativeOfficer`/`drrFocalPerson` (numeric ids — resolve via `/organization/` or the municipality contact resources), `fiscalYear`.
  - ✔ `/annual-budget-activity/` — **DRR budget + expenditure line items**: `activityName`, `fundType` ("DRR Fund of Muicipality"), `otherFundType`, `donerOrganization`, `amount`, `expenditure` (often `null`), `status` (Ongoing 42 / Completed 63 / Started 35 / blank 45), `projectStartDate/EndDate`, `remarks`, `priorityArea/Action/Activity`. **185 rows** total, all in the fetched window; `?ordering=-id&fields=` slims 107 KB → ~37 KB. **Data-quality warnings**: the funder field holds **29 distinct spellings** (municipalities, NGOs, plus junk like `asiudhiads` and an IP address) — display as entered, don't de-dupe silently; fund/amounts are pilot entries, not audited. `/priority-area|priority-action|priority-activity/` give the NDRRMA priority taxonomy those line items point at.
  - `/annual-budget/` — the budget **header** resource is **pure demo data** (all 153 rows titled `"Demo Budget Title"`, absurd magnitudes). Do not use; the activity resource is the only real one.
  - `/nepali-fiscal-year/` — BS↔AD mapping (39 rows; `id` ascends with BS year, `id 1` = `titleEn` "2060/61", `id 39` = "2098/99"; `titleEn`/`titleNp`, `startDateBs/endDateBs`, `startDateAd/endDateAd`) for labelling `fiscalYear` ids on relief/budget rows.
  - `/flood-station/` — **GLOFAS flood-forecast stations**: `station_name`, `river_name`, `river_basin`, `provider_1/2` (DHM), `valid_glofas`, `has_household_data`, `is_activated`, `corrected_point`, `drain_ar_pro`, calibration fields.
  - `/event/` — 26 rows grouping hazard episodes (`चट्याङ्ग`, `मनसुन 2082 (बाढी)`) with `startedOn`/`endedOn`/`severity`/`hazard` (all currently tagged `hazard: 18`); `polygon` mostly null.
  - `/document/` + `/document-category/` — official files (e.g. `Press_Release_07.pdf`) with `publishedDate`, `region`, `category` id, `file` URL; `/manual/` (form type + `file`), `/municipality-images/` (Durham landslide inventory/susceptibility map filenames per municipality).
  - Open-space / safe-area inventories: `/openspace-detail/` + `/communityspace-detail/` (`openSpaceName`, `polygons`, `geoserverUrl`, `layerName`, `workspace`, `image`), plus `/amenities/`, `/open-amenities/`, `/suggested-use/`, `/open-suggested/`, `/open-eia/` (`isAvailable` per EIA question), `/open-media/`, `/eia/` (7 EIA checklist questions only — no project EIAs).
  - GIS catalogue: `/layer/` (`title`, `workspace`+`layername`, `public`, `bbox`, `jsonData`, `category`, `hazard`, `legendTitle`) and `/layer-group/` (tree with `parent`/`level`/`metadata`) — the raw material for hazard overlays via their GeoServer. `/geoserver-filter/` is a help message, not data.
  - ✔ `/nap-temperature/` + `/nap-precipitation/` — **NAP downscaled CMIP climate projections**: 78 rows each (77 districts + one `region:"national"`), each with `rcp45`/`rcp85` and `sdRcp45`/`sdRcp85` as **arrays of 120 annual `{year, value}` points, 1981→2100** (temperature = annual mean °C, precipitation = annual mm total; `sd` is 0 through the 1981–2010 calibration period, and rcp45 = rcp85 there — a useful sanity check). **One row ≈ 12 KB, the whole table ≈ 1 MB per metric**, so always query one region: `?district=<id>` or `?region=national` (both return exactly 1 row). `fetchBipadNap(kind, {district|national})`. District ids join `/district/` (Kathmandu 27).
  - ✔ `/demographic/` — **census counts, one row per local unit PER census year** (`?district=27` → 22 rows = 11 palikas × 2011+2021, so always pick one `censusYear` before summing or you double-count). Fields: `totalPopulation`, `malePopulation`, `femalePopulation`, `householdCount`, `totalAboveFiveYears`, `totalLiterate`, `male/femaleLiterate`, `male/femaleLiteracyRate`, `literacyRate`, `ageGroupPopulation.{male,female}` with **16 bands** (00-04 … 70-74, 75+) that sum exactly to `totalPopulation`, `municipality` (join key), `censusYear`, `federalLevel:"local"`, `district` (**null** in every row). `literacyRate` is **blank on the 2021 rows** → compute `sum(totalLiterate)/sum(totalAboveFiveYears)` (Kathmandu 89%). **Silently ignored filters**: `?censusYear=`, `?federalLevel=`, and `?district__title=` (returns every district's 2011 rows — a trap). Use `?district=<id>&limit=100`, then filter client-side. Kathmandu 2021 summed over its 11 palikas: **1,994,555 people · 542,892 households · 89% literate (5+)**; Dolakha 171,289. `fetchBipadDistrictProfile(id)` does the year-pick + sum and says so in the UI (district totals are computed here, not published).
  - ✔ Palika census (`/demographic/` + `/municipality/?district=<id>`): `/demographic/` names the palika only by numeric `municipality` id, so `fetchBipadPalikaCensus(districtId)` also pulls `/municipality/?district=` (11 rows for Kathmandu, 5 for Kaski; `id`, `title`, `centroid`, `bbox`) and joins on that id. Do **not** rely on names alone: 632 of 777 boundary polygons match BIPAD titles, 67 differ (`Pokhara Lekhnath`→`Pokhara`, `Bhimsen`→`BhimsenThapa`, `Sulikot`→`Barpak Sulikot`, `Ghanglekh`→`Ghyanglekh`, `Budhanilakantha`→`Budhanilkantha`), so the map falls back to the nearest BIPAD centroid inside the district. Verified 2021: Pokhara 513,504 people / 140,459 households / 89% literate (5+); Kathmandu's 11 palikas sum to 1,994,555.
  - ✔ `/earthquake-riskscore/` — **77 rows, one per district** (`district` = numeric id), `data: { rank, riskScore, hdiScore, remoteScore, medScore, maxScore, pctScore, specificityScore }` (Kathmandu `2.6 · #41`, Dolakha `2.5 · #45`; district 69 `#53`). The `data` blob's keys vary by resource — read defensively. `fetchBipadQuakeRisk()`.
  - Name→id join: `fetchBipadDistrictIds()` = `/district/?limit=100&fields=id,title` (all 77 in one request) keyed by `canonDistrictKey`. **Required** — district ids in the map can come from the bundled polygon files, whose ids are synthetic (Kathmandu polygon `1005` vs BIPAD `27`), and `/demographic/?district=1005` answers **400**. All 77 polygon names canonically match BIPAD titles (checked 2026-10-19). `/district/` itself carries **no** population.
  - `/vulnerability/?district=<id>` — one row per palika (census 2021), `municipality` id joins `/demographic/`, `data: { HDI, hpi, percapita, lifeExpectancy, remoteness, riskScore, radio, computer, internet, jarWater, … }` (Kathmandu palikas HDI 0.661, percapita ~196,885, life expectancy 72.4). Not shown yet — the only route to HDI/life-expectancy at district level (pop-weighted mean).
  - ✔ `/highway/` — **Department of Roads blockage log**: 405 rows (~6 months, 29 highways), `ordering=-id` for newest first (`count` is the sentinel). Fields: `title` (road name), `roadRefno` (`NH03`), `linkCode` (`NH03-084`), `point{coordinates:[lon,lat]}`, `location`, `division`, `chainage`, `endChainage`, `status` (**OPEN 328 / PARTIAL_OPEN 74 / CLOSED 3**), `closureReason` (Landslide 311, Heavy Rainfall 27), `repairEta`, `effortsBeingMade`, `remarks`, `images[]`, `dateRoadblockStart`/`…EndEstimated`/`…End`, `actualRepairTime`, `contactPerson`, `district`/`province` ids, `affectedDemography`. `?status=CLOSED` works; `?fields=` **silently drops `roadRefno`** (fetch full rows, 409 KB) and some `dateRoadblockStart` values are **BS dates** (`2083-…`) — discard years outside 2000–2100. Status is the latest state, not a reopen date (id 78 is OPEN with no end; id 302 CLOSED with an end). Photos are 100–370 KB JPEGs under `https://navigate.dor.gov.np/api/uploads/images/` (158 images on 104 rows, all 200 OK). `fetchBipadRoadBlocks()`; the map shows only CLOSED + PARTIAL_OPEN, with permanent `NHxx · closed` labels on the 3 closed dots and thumbnails in the card. Clicking a map `NHxx` chip opens a highway card (OSM name, live closed/partial counts, event count, districts, main cause, latest block, clickable blockage list); the log publishes no highway length, so the card says so rather than guessing.
  - Other per-municipality datasets: `/vizrisk-building/` (building-level survey + `vulnerabilityScore`), `/ibf-households/` (impact-based-forecast household vulnerability: income, house type, flood depth/return period, safe-shelter distance), `/ibf-vulnerability-indicator/`, `/profile-household/` (very wide household survey), `/keyvalue-json/` (vizrisk themes). DataNepal carries `area_sqkm` per place but **no** population values — take census numbers from BIPAD.
  - `/citizen-report/` — crowdsourced reports with `image`, `point`, `hazard`, `verified` (samples unverified) + optional `incident` link; `/contact-training/`, `/organization/` (`title`, `level`, `responsibleFor`, contacts), `/nongov-contact/` (NGO/CSO training contacts), `/inventory/` + `/inventory-item/` + `/inventory-stockin/` + `/inventory-stockout/` (relief stock ledger with `quantity`/`rate`/`expiryDate`/`referenceNumber`/`organization`), `/metadata/`, `/country/`, `/feedback/`, `/disaster-profile/`…
- **Dead / stale / gated (verified 2026-10-19, do not integrate)**: `/weather/` frozen at **2023-06-04** (Dadeldhura/Dipayal/Dhangadi rows; `rainfall`/`sky`/`sunrise` present but years old — DHM direct remains the only live weather); `/pollution/` AQI frozen at **2025-01-01** (`/pollution-stations/` exists, `aqi`/`aqiColor` OK but stale → keep Open-Meteo for AQI); `/pollution-trimed/` 2024-04; `/rain-trimed/` + `/river-trimed/` are `trimType:daily, trimBy:avg` **daily-average series** (echarts-style, e.g. Karnali at Chisapani 3.64 m, station images under `daq.hydrology.gov.np`), historical not live; `/relief-flow/` + `/relief-release/` → **401**; `/risk-reduction/`, `/recovery/`, `/research/`, `/fire/`, `/streamflow/`, `/notification/`, `/ward-information/`, `/homepage-content/`, `/disability-type/`, `/reconstruction/`, `/temporary-shelter-*/`, `/overall-beneficiary-status/`, `/tranche-one|two-status/`, `/payment-received-status/`, `/funding-source/` all return `count: 0` (empty); `/supplier/` 404.
- Map joins (`lib/district-geo.ts`, `/projects/map`): `/district/` rows carry `centroid` + `bbox` + `province` number + `title_en` (77 districts, tiny, 12s timeout, module-cached). District polygons come BUNDLED per province from `public/geo/districts/<1-7>.geojson` (split from the 1.2MB monolith — 76–226KB each, fetched ONLY when its province opens, cached per province; exact `{DISTRICT, HQ, PROVINCE}` join). DataNepal `place_boundaries.json` is a last-resort fallback. If the district API stalls, pins/zoom/filter derive from the bundled polygons — drill-down never blanks. Because of that fallback the selected district's `d.id` is not always a BIPAD id: census/risk lookups go through `fetchBipadDistrictIds()` (name → id), never `d.id`. Our 32 projects use researched sites first (`lib/project-coords.ts`: dam/airfield/temple GPS, confidence-labeled) falling back to matched-district centroids via `lib/geo:matchDistricts` (+ deterministic jitter), always labeled ◎ exact vs ≈ approx; national-scope projects stay unpinned in the side list.

## 9. DHM weather API (`lib/dhm.ts`)

- Base: `https://dhm.gov.np/mfd/api`. Auth: none. Revalidate 3600. Verified live (payloads stamped same-day).
- Used: `/weather` (20 cities, 2-day manual+model forecast, EN/NE), `/manual-observation` (today's observed min/max + rainfall), `/country-forecast` (bulletin).
- Verified 2026-10-15: numeric per-city forecast is days 1–2 ONLY — match rows by the `day` field, not array index. `/three-days-forecast-latest` returns Nepali titles + `forecast-images/…/day_N_….png` paths that 404 at every predictable base (`/mfd/`, `/`) — do not embed; day-3 exists only as unreachable map images.
- Day semantics (verified): `day` counts from the payload issue datetime (`date = issue + (day−1)`); numbering shifts between the 2×-daily issues, so NEVER hardcode day 1 = today — label from `forecastDayLabel(day, issueIso)`. `model_forecast` mirrors the same days with all-null values (useless — ignore). Stations also carry `sunrise`/`sunset` ("5:58:16 AM" NPT) + `datetime` — used for precise day/night (`isDayBySun`).
- Shown: /environment outlook grid (first 8 stations with forecasts; rain badge > 40%).
- Shown: /environment outlook grid (first 8 stations with forecasts; rain badge > 40%).
- Dead end: `hydrology.gov.np` realtime is socket.io SPA with no REST — use BIPAD station mirrors instead.
- DHM's `/weather` payload is capped at **~19 cities** and `/manual-observation` at **~21** — that is the whole network DHM publishes (not a client bug). For national coverage use the BIPAD hydrology mirrors (section 17): ~660 rain gauges + ~280 river/water-level stations.

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
- Air quality is a **different host**: `https://air-quality-api.open-meteo.com/v1/air-quality?...&hourly=pm2_5` — client takes the last hourly value; `current=pm2_5` returns the instantaneous model value instead.
- **Both hosts accept comma-separated `latitude`/`longitude` arrays** — many points in ONE request (`fetchCurrentTemps`; a single-point reply is wrapped to `[json]`). Measured 2026-10-19: 231 air-quality points with `current=pm2_5` → HTTP 200 in ~1.2 s, ~76 KB, no nulls. This is what the /map PM2.5 field uses (`fetchPm25Grid`).
- `NEPAL_PM25_GRID` = 231 nodes at 0.4° over 26.2–30.4 N / 80.1–88.3 E. 0.4° **is** CAMS' native spacing, so it is the honest floor — finer sampling would invent detail. The model smooths valleys (reads Kathmandu ~13 µg/m³ against a several-times-higher real load); the map legend says so.
- `NEPAL_DISTRICT_CENTERS` pins 7 city lat/lons (Kathmandu, Pokhara, Biratnagar, Nepalgunj, Dhangadhi, Surkhet, Jumla).
- Earthquakes: `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=26&maxlatitude=31&minlongitude=80&maxlongitude=89&limit=N&orderby=time`. Verified live.
- Model gap-filler: `daily=temperature_2m_max,temperature_2m_min&forecast_days=7` backs DHM's null `to_temperature` and missing station observations — UI must tag these `·model`, never silently.
- Shown: /environment hero (temp/humidity/rain/PM2.5 + AQI pill w/ US-EPA breakpoints), tremor pills, and the /map **Air PM2.5** wash (WHO 24 h bands 5/15/25/35/50, mutually exclusive with the rain wash so two quantities never stack).
- Dead ends: OpenAQ v3 (key), aqicn (token — `demo` serves canned data), DoEnv `pollution.gov.np` portal (SPA, datacenter-blocked; retry in browser).

## 13. Registry-only sources ⏳ (listed in `lib/data.ts: sources`, no client yet)

| Source | Why no client | Path forward |
|---|---|---|
| NSO Census 2021 results site | Original hosts flaky; DataNepal mirror covers it | Use `lib/datanepal.ts` |
| Niti/Naxa Hydropower Portal (572 projects) | **Fully wired**: full register parsed server-side by `app/api/hydro/route.ts` from the `/core/datasets/` HTML table (the portal's own `hydro.js` carries only 10 map points) | 572 GPS pins on `/projects/map` + `HydroAtlas` |
| HDX COD-AB + COD-PS | Verified CKAN (`data.humdata.org/api/3/action/package_search`) | `lib/hdx.ts` for map shapes + p-codes |
| UNICEF SDMX (`sdmx.data.unicef.org`) | Needs `Accept: application/vnd.sdmx.data+json;version=2.0.0` header + SDMX-JSON parser | Small client, header first |
| UN Data Portal (WPP) | Locations/indicators verified; data endpoint returned 401 with guessed params | One param/header pass |
| NTA MIS monthly PDFs | 15 yrs of tabular PDFs, stable URLs | PDF parser pipeline (see sources page brief) |
| EDCD EWARS weekly bulletins | Numbered weekly PDFs + public dashboard | Trivial harvester |
| DoFE labor permits, CEHRD Flash, DoR progress, ERC DMS lists, AEPC/NEA reports | HTML/PDF, no JSON | Scraper prompt on /sources |
| ECN HoR-2082 (ERIS) | ASP.NET HTML, no JSON | Scraper only if election scope grows |

## 14. Explicit dead ends — do not integrate

IMF direct from sandbox (403, works in prod) · NSO CKAN `data.nsonepal.gov.np` (unreachable) · PPMO/bolpatra (403 bot-wall) · NOC official (HTML ticker only) + `noc-nepal-api` host (DNS fail) · gold mirror `sabinmagar` (404) · CoinGecko (DNS fail from sandbox) · FRED/ITC TradeMap/Swippee (keys) · IRMIS/MeroShare/TMS (auth) · FENEGOSIDA history (login) · REST Countries (now key-gated) · ReliefWeb v1 (dead; v2 needs approved appname) · IATI live API (needs subscription key — use bulk dumps) · ACLED / FIRMS / GFW / ElectricityMaps / NewsData (keys) · Kalimati prices (host unreachable — recheck from Nepal IP) · `welcomenepal.com` (hijacked — use `tourism.gov.np`) · DoR old road-network JSON (gone; use ICIMOD ArcGIS road layer — section 17) · NEPSE official NOTS (session-gated — mirror-first).

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
- **yonepse extras (`lib/nepse.ts`)** — `/data/ipo/upcoming.json` (company, units, date_range, announcement_date), shown in the IPO pipeline; `/other/brokers.json` returns `{value:[...]}` with active status, broker code/name, 30-day and latest turnover, TMS links, and branch metadata. `/other/brokers.json` is used by `/market` to rank the six leading active brokers by 30-day turnover. Also confirmed live: `/data/ltp/manifest.json` (2007-2026 monthly index), `/data/ltp/monthly/YYYY-MM.json` (sparse per-symbol series). Dead shards (404, do not use): `/data/ltp/daily/*`, `/data/daily/*`, `/proposed_dividend/latest_1y.json`, `/data/OMF.json`.
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

## 17. National map data layers (`/projects/map`, `components/national-map.tsx`)

- **Hydropower register** — `app/api/hydro/route.ts` fetches `https://hydro.naxa.com.np/core/datasets/` and parses the single `<table id="hydropower">` (572 rows, **92 columns**) into JSON: name, province, district, municipality, capacity MW, river, licence no/issue/validity, promoter, address, lon/lat, licence type. Revalidate 86400. The portal's own `/static/assets/data/hydro.js` carries only 10 map points — do not use it as the register. Total licensed ≈ 23,970 MW. **Licence-type split: Survey 311 · Generation 180 · Operation 81** — the only usable status signal; the richer columns (civil construction, electric generated, date of operation, affected households…) are all `0`/`False` stubs on every row. Client: `lib/hydro.ts:fetchHydroProjects()` (relative `/api/hydro`); `hydroKind()` maps to `operation`/`generation`/`survey` with `HYDRO_KIND_COLOR`/`HYDRO_KIND_LABEL`, a matching licence filter in the atlas panel, and drop-shaped divIcon pins sized by MW (CSS classes match the kind string exactly).
- **Roads** — `components/osm-roads.tsx` draws the full OpenStreetMap network from **OpenFreeMap vector tiles** (`https://tiles.openfreemap.org/planet`, resolved through its TileJSON; the undated `/planet/{z}/{x}/{y}.pbf` alias answers **200 with a 0-byte body**, so always use the dated snapshot URL). Keyless, CORS `*`, decoded with `leaflet.vectorgrid` (SVG/canvas tile renderer), layer `transportation` styled by `class` (trunk/primary → brown, secondary/tertiary → ochre, minor/street from z9, track/path from z11, rail dashed). **The layer is clipped to Nepal**: each tile canvas is punched out with `destination-out`/`evenodd` along the union of the 7 province outlines (already loaded for the borders), so Indian and Tibetan roads never draw — and this needs the GridLayer `_tiles` list, not `_vectorTiles` (that registry only exists when `getFeatureId` is set). Selecting a blockage redraws `transportation_name` features whose `ref` matches its `roadRefno` (tiles carry both `NH03` and `NH3`; normalise leading zeros) as a fat coloured line, and the map flies to the dot at z9 when the view is wider than z8 — at z7 most tiles carry no named alignment. **Ref chips** ("NH03", "H20") are placed at the midpoint of each highway's longest visible segment: the renderer factory wraps `_initPath` to capture the symbolizer's `properties.ref` + tile-pixel `_parts`, converts them back to lat/lng, keeps one label per ref (longest segment wins, 28 max) and only inside the province union. The `transportation_name` layer is therefore styled invisible (`weight 0`) rather than skipped, or there would be no geometry to read; labels live in their own `roadlabels` pane (z 405) and are clickable: each also captures the tile's `properties.name`, so a click opens the highway card and re-highlights the alignment (one toggle, "Roads", drives the lines, chips and the 77 closed/partial BIPAD dots). Attribution lives in the legend (`© OpenStreetMap contributors · OpenFreeMap`); the map itself runs `attributionControl={false}`. **Retired:** ICIMOD ArcGIS `Nepal/BaseMap/MapServer/2` (old DoR snapshot; 41 of 77 active blockages sit >8 km from its nearest line — Humla/Mugu roads are missing), and the dead DoR road JSON.
- **Rain + river stations** — `lib/bipad.ts:fetchBipadRainStationsAll()` (~660 gauges) and `:fetchBipadRiverStationsAll()` (~280 water-level stations) walk the DRF `next` links (8 pages × 100). `count` on these resources is a 64-bit sentinel — never trust it, count the fetched rows. **Rain rows**: `averages[]` = 5 windows (`interval` 1/3/6/12/24 h, `value` mm + `status{danger,warning}`), `measuredOn`, `elevation`, `basin`, `description` (`"District,Municipality,Station,id"`), `affectedDemography`, numeric `district`/`province` codes. **River rows**: live `waterLevel`/`warningLevel`/`dangerLevel`/`waterLevelOn`/`steady`/`status` (`BELOW WARNING` / `ABOVE WARNING` / `ABOVE DANGER`) + `description`, `affectedDemography`. Note `status` also matches `WARNING` inside `BELOW WARNING LEVEL` — only treat the `ABOVE …` forms as warn/danger.
- **Admin-name resolution** — station `district`/`province` are BIPAD numeric ids; resolve district names from the already-loaded `fetchBipadDistricts()` list (same `id`) and provinces from `PROVINCE_NUM_TO_NAME`. No extra endpoint needed. BIPAD geo routes are **singular** (`/province/`, `/district/`, `/municipality/`); the plural forms 404 and `?limit=` is ignored (each returns its full list).
- **Panes** — the atlas puts polygons in a custom `shapes` pane (z 390) and all point markers in a `points` pane (z 620). Leaflet stacks by insertion order, so without this the async province/district/muni polygons load *after* the pins and swallow their clicks (the "pins only clickable after selecting a province" bug).

