# Drishti · दृष्टि

> Open public data and civic intelligence platform for Nepal.

Drishti is an open-source civic observability platform that unifies Nepal's public data into an interactive, real-time interface. It aggregates live macroeconomic indicators, national infrastructure projects, state-owned enterprise financials, capital market filings, disaster risk telemetry, hydrology, and weather across Nepal's 7 provinces and 77 districts.

---

## Highlights

- **National GIS Atlas (`/map`)**: Full-screen interactive map with street, topographic, and true-color satellite views. Features national pride infrastructure footprints, licensed hydropower plants, live river gauge levels, 24-hour rainfall stations, seismic epicenters, active BIPAD disaster alerts, and protected areas with instant multi-layer search and district bounds.
- **Macroeconomics (`/economy`)**: Real-time integration with 36 World Bank indicators, IMF World Economic Outlook projections, official Nepal Rastra Bank (NRB) foreign exchange rates, debt-to-GDP dynamics, inflation trends, and external sector metrics.
- **Infrastructure Portfolio (`/projects`)**: Deep-dive tracking across 30 National Pride Projects, physical and financial completion rates, geocoded footprints, contractor consortiums, and World Bank country portfolios.
- **Public Enterprises (`/companies`)**: Financial records, profit/loss trajectories, and balance-sheet transparency across Nepal's 44 State-Owned Enterprises (SOEs), paired with live NEPSE trading quotes and quarterly disclosures for listed entities.
- **Environment & Disaster Telemetry (`/environment`)**: Real-time feeds from the Department of Hydrology and Meteorology (DHM), BIPAD DRR portal, USGS seismic networks, and Open-Meteo atmospheric and air quality sensors.
- **Civic Procurement (`/procurement`)**: Public procurement monitoring, contract disclosures, honesty indicators, and high-value tender tracking.
- **Bikram Sambat Calendar (`/calendar`)**: Dual Bikram Sambat (BS) and Gregorian (AD) calendar with official gazetted public holidays, fiscal quarter bounds, and tax deadlines.

---

## Live Data Feeds

Drishti operates on a zero-key, open-access architecture. Every live feed connects to publicly accessible government or multilateral endpoints with server-side caching and graceful fallbacks:

| Domain | Source | Protocol / Endpoint | Update Cadence |
| :--- | :--- | :--- | :--- |
| **Forex** | Nepal Rastra Bank (NRB) | `nrb.org.np/api/forex/v1/rates` | Hourly |
| **Macro Indicators** | World Bank Open Data | `api.worldbank.org/v2/country/NPL/indicator/*` | Daily |
| **Economic Forecasts** | IMF via DB.nomics | `api.db.nomics.world/v22/series/IMF/WEO/*` | Daily |
| **Capital Markets** | NEPSE (via yonepse) | `shubhamnpk.github.io/yonepse/*` | Hourly |
| **Disaster Hazards** | BIPAD Portal (MoHA) | `bipadportal.gov.np/api/v1/*` | Hourly |
| **Weather & Hydro** | DHM Nepal (MFD) | `dhm.gov.np/mfd/api/*` | 2x Daily |
| **Seismology** | USGS Earthquake API | `earthquake.usgs.gov/fdsnws/event/1/*` | 15 Minutes |
| **Boundaries & Census** | DataNepal & OpenDataNepal | `datanepal.org/data/*`, `api.opendatanepal.com` | Daily / Static |

---

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Runtime & UI**: [React 19](https://react.dev/), [TypeScript 5.7](https://www.typescriptlang.org/) (Strict mode)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with custom civic design tokens and dark mode
- **Mapping & GIS**: [Leaflet](https://leafletjs.com/) and [React-Leaflet](https://react-leaflet.js.org/) with Esri World Imagery, OpenStreetMap, and OpenTopoMap
- **Data Visualization**: [Recharts](https://recharts.org/) with native SVG renderers and theme-aware palettes
- **Icons**: [Lucide React](https://lucide.dev/)
- **Date Conversion**: `nepali-date-converter` and `@lacspace/nepal-holidays`

---

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- pnpm (recommended) or npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/drishti.git
   cd drishti
   ```

2. Install dependencies:
   ```bash
   pnpm install
   # or
   npm install
   ```

3. Run the development server:
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

The `/releases` page is connected to `Shubhamnpk/distri` by default. To use a different GitHub repository, set `NEXT_PUBLIC_GITHUB_REPOSITORY` in `.env.local` (for example, `https://github.com/owner/repository`) or in your deployment environment.

---

## Quality Checks & Building

Run static type checking:
```bash
npx tsc --noEmit
# or
pnpm typecheck
```

Create an optimized production build:
```bash
pnpm build
# or
npm run build
```

Run the production server:
```bash
pnpm start
# or
npm run start
```

---

## Nepali Conventions & Number Formatting

Drishti adheres to standard Nepali public administration formatting standards:

- **Currency**: Prefixed with `रु` (`NPR_SYMBOL`), formatted according to South Asian numerical ladders (Lakh: 10^5, Crore: 10^7, Arba: 10^9, Kharab: 10^11).
- **Dual Calendars**: Bikram Sambat (BS) displayed alongside Gregorian (AD) with real-time conversion and gazetted public holidays.
- **Administrative Hierarchies**: Fully aligned with Federal Nepal's 7 Provinces and 77 Districts.

---

## License

Distributed under the [MIT License](LICENSE).
