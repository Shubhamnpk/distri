import { fetchNepseData } from './nepse'
import { fetchProjectNepalDistricts, fetchProjectNepalProjects } from './project-nepal'
import { getRelevantDatasets } from './opendatanepal'

// Re-export new modules
export { fetchNepseData, fetchNepseStocks, fetchNepseMarketSummary, fetchNepseIndices, fetchNepseIndex, fetchNepseTopStocks, fetchNepseMarketStatus, fetchUpcomingIpos } from './nepse'
export { fetchProjectNepalDistricts, fetchProjectNepalProjects } from './project-nepal'
export { getRelevantDatasets, searchDatasets } from './opendatanepal'
export { getNrbUsdRate, fetchLatestForex, fetchUsdNprSeries } from './nrb'
export type { NrbForexRate, NrbForexDay } from './nrb'
export { fetchDataNepalIndicators, fetchDataNepalPlaces, fetchDataNepalProvinces, fetchDataNepalGeography, fetchDataNepalDatasets } from './datanepal'
export type { DataNepalIndicator, DataNepalPlace } from './datanepal'
export { fetchBipadIncidents, fetchBipadAlerts, fetchBipadEarthquakes, fetchBipadLosses, fetchBipadProjects, fetchBipadRainStations, fetchBipadRiverStations, fetchBipadGeo } from './bipad'
export { fetchDhmForecast, fetchDhmObservations, fetchDhmCountryForecast } from './dhm'
export { fetchWbProjectCount, fetchWbProjects, wbProjectCommitment } from './wb-projects'
export type { WbProject } from './wb-projects'
export { fetchWhoNpl, searchWhoIndicators, WHO_CODES } from './who'
export { fetchCurrentWeather, fetchCurrentPm25, fetchNepalQuakes, NEPAL_DISTRICT_CENTERS } from './meteo'

// World Bank API
const WB_BASE = 'https://api.worldbank.org/v2/country/NPL/indicator'

export type WbDataPoint = { year: string; value: number | null }

async function fetchWb(indicator: string, years = '2018:2025'): Promise<WbDataPoint[]> {
  const url = `${WB_BASE}/${indicator}?format=json&per_page=20&date=${years}`
  const res = await fetch(url, { next: { revalidate: 86400 } })
  if (!res.ok) return []
  const json = await res.json()
  const arr = json?.[1]
  if (!arr) return []
  return arr
    .filter((d: { value: number | null }) => d.value !== null)
    .map((d: { date: string; value: number }) => ({ year: d.date, value: d.value }))
    .reverse()
}

// IMF API
const IMF_BASE = 'https://www.imf.org/external/datamapper/api/v1'

async function fetchImf(indicator: string): Promise<WbDataPoint[]> {
  try {
    const res = await fetch(`${IMF_BASE}/${indicator}/NPL`, { next: { revalidate: 86400 } })
    if (!res.ok) return []
    const json = await res.json()
    const values = json?.indicators?.[indicator]?.NPL
    if (!values) return []
    return Object.entries(values as Record<string, number>)
      .map(([year, value]) => ({ year, value }))
      .sort((a, b) => Number(a.year) - Number(b.year))
  } catch {
    return []
  }
}

export type EconomyData = {
  gdp: WbDataPoint[]
  gdpGrowth: WbDataPoint[]
  gdpPerCapita: WbDataPoint[]
  gdpPpp: WbDataPoint[]
  inflation: WbDataPoint[]
  population: WbDataPoint[]
  exports: WbDataPoint[]
  imports: WbDataPoint[]
  remittances: WbDataPoint[]
  unemployment: WbDataPoint[]
  fdi: WbDataPoint[]
  debt: WbDataPoint[]
  electricityAccess: WbDataPoint[]
  renewableEnergy: WbDataPoint[]
  lifeExpectancy: WbDataPoint[]
  infantMortality: WbDataPoint[]
  healthSpending: WbDataPoint[]
  educationSpending: WbDataPoint[]
  literacy: WbDataPoint[]
  agriculture: WbDataPoint[]
  industry: WbDataPoint[]
  services: WbDataPoint[]
  gini: WbDataPoint[]
  poverty: WbDataPoint[]
  urbanPopulation: WbDataPoint[]
  internetUsers: WbDataPoint[]
  exchangeRate: WbDataPoint[]
  investment: WbDataPoint[]
  govtRevenue: WbDataPoint[]
  tradeOpenness: WbDataPoint[]
  imfGdpGrowth: WbDataPoint[]
  imfInflation: WbDataPoint[]
  imfUnemployment: WbDataPoint[]
  imfCurrentAccount: WbDataPoint[]
  imfGovtDebt: WbDataPoint[]
  imfFiscalBalance: WbDataPoint[]
  maternalMortality: WbDataPoint[]
  primaryEnrollment: WbDataPoint[]
  mobileSubs: WbDataPoint[]
  forestArea: WbDataPoint[]
  energyUse: WbDataPoint[]
  fertility: WbDataPoint[]
}

export async function fetchEconomyData(): Promise<EconomyData> {
  const [
    gdp, gdpGrowth, gdpPerCapita, gdpPpp, inflation,
    population, exports, imports, remittances, unemployment,
    fdi, debt, electricityAccess, renewableEnergy,
    lifeExpectancy, infantMortality, healthSpending, educationSpending, literacy,
    agriculture, industry, services, gini, poverty,
    urbanPopulation, internetUsers, exchangeRate, investment, govtRevenue, tradeOpenness,
    imfGdpGrowth, imfInflation, imfUnemployment, imfCurrentAccount,
    imfGovtDebt, imfFiscalBalance,
    maternalMortality, primaryEnrollment, mobileSubs, forestArea, energyUse, fertility,
  ] = await Promise.all([
    fetchWb('NY.GDP.MKTP.CD'),
    fetchWb('NY.GDP.MKTP.KD.ZG'),
    fetchWb('NY.GDP.PCAP.CD'),
    fetchWb('NY.GDP.PCAP.PP.CD'),
    fetchWb('FP.CPI.TOTL.ZG'),
    fetchWb('SP.POP.TOTL', '2020:2025'),
    fetchWb('NE.EXP.GNFS.CD'),
    fetchWb('NE.IMP.GNFS.CD'),
    fetchWb('BX.TRF.PWKR.CD.DT'),
    fetchWb('SL.UEM.TOTL.ZS'),
    fetchWb('BX.KLT.DINV.WD.GD.ZS'),
    fetchWb('GC.DOD.TOTL.GD.ZS', '2018:2025'),
    fetchWb('EG.ELC.ACCS.ZS', '2020:2025'),
    fetchWb('EG.FEC.RNEW.ZS', '2018:2025'),
    fetchWb('SP.DYN.LE00.IN'),
    fetchWb('SP.DYN.IMRT.IN'),
    fetchWb('SH.XPD.CHEX.GD.ZS'),
    fetchWb('SE.XPD.TOTL.GD.ZS'),
    fetchWb('SE.ADT.LITR.ZS', '2015:2025'),
    fetchWb('NV.AGR.TOTL.ZS'),
    fetchWb('NV.IND.TOTL.ZS'),
    fetchWb('NV.SRV.TOTL.ZS'),
    fetchWb('SI.POV.GINI', '2010:2025'),
    fetchWb('SI.POV.DDAY', '2010:2025'),
    fetchWb('SP.URB.TOTL.IN.ZS'),
    fetchWb('IT.NET.USER.ZS', '2015:2025'),
    fetchWb('PA.NUS.FCRF', '2018:2026'),
    fetchWb('NE.GDI.TOTL.ZS'),
    fetchWb('GC.REV.XGRT.GD.ZS'),
    fetchWb('NE.TRD.GNFS.ZS'),
    fetchImf('NGDP_RPCH'),
    fetchImf('PCPIPCH'),
    fetchImf('LUR'),
    fetchImf('BCA_NGDPD'),
    fetchImf('GGXWDN_NGDP'),
    fetchImf('GGXCNL_NGDP'),
    fetchWb('SH.STA.MMRT', '2010:2025'),
    fetchWb('SE.PRM.ENRR', '2015:2025'),
    fetchWb('IT.CEL.SETS.P2', '2015:2025'),
    fetchWb('AG.LND.FRST.ZS', '2015:2025'),
    fetchWb('EG.USE.PCAP.KG.OE', '2010:2025'),
    fetchWb('SP.DYN.TFRT.IN'),
  ])
  return {
    gdp, gdpGrowth, gdpPerCapita, gdpPpp, inflation,
    population, exports, imports, remittances, unemployment,
    fdi, debt, electricityAccess, renewableEnergy,
    lifeExpectancy, infantMortality, healthSpending, educationSpending, literacy,
    agriculture, industry, services, gini, poverty,
    urbanPopulation, internetUsers, exchangeRate, investment, govtRevenue, tradeOpenness,
    imfGdpGrowth, imfInflation, imfUnemployment, imfCurrentAccount,
    imfGovtDebt, imfFiscalBalance,
    maternalMortality, primaryEnrollment, mobileSubs, forestArea, energyUse, fertility,
  }
}

export const NPR_FALLBACK = 133.5
export const INR_TO_NPR = 1.6
// kept for backward compat - use getLiveNprRate() for live value
export const NPR_RATE = NPR_FALLBACK

let cachedNprRate: number | null = null

/** Free GitHub-hosted currency API (fawazahmed0/currency-api via jsDelivr).
 *  No key, CDN-cached. Uses INR*1.6 peg if NPR not present (peg holds: 95.27*1.6≈152.44 vs direct 152.51). */
export async function getLiveNprRate(): Promise<number> {
  if (cachedNprRate) return cachedNprRate
  // 1) authoritative: Nepal Rastra Bank official FOREX API
  try {
    const { getNrbUsdRate } = await import('./nrb')
    const nrb = await getNrbUsdRate()
    if (typeof nrb === 'number' && nrb > 0) {
      cachedNprRate = nrb
      return nrb
    }
  } catch {}
  try {
    const res = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json', {
      next: { revalidate: 86400 },
    })
    if (res.ok) {
      const data = await res.json()
      const direct = data?.usd?.npr
      if (typeof direct === 'number' && direct > 0) {
        cachedNprRate = direct
        return direct
      }
      const inr = data?.usd?.inr
      if (typeof inr === 'number' && inr > 0) {
        cachedNprRate = inr * INR_TO_NPR
        return cachedNprRate
      }
    }
  } catch {}
  // fallback to World Bank PA.NUS.FCRF
  try {
    const wb = await fetchWb('PA.NUS.FCRF', '2023:2026')
    const latest = wb[wb.length - 1]?.value
    if (typeof latest === 'number' && latest > 0) {
      cachedNprRate = latest
      return latest
    }
  } catch {}
  return NPR_FALLBACK
}

export function formatUsd(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
  return `$${v.toLocaleString()}`
}

export function formatNpr(v: number, rate?: number): string {
  const r = rate ?? cachedNprRate ?? NPR_FALLBACK
  const npr = v * r
  if (npr >= 1e12) return `NPR ${(npr / 1e12).toFixed(1)} Kharab`
  if (npr >= 1e9) return `NPR ${(npr / 1e9).toFixed(0)} Arba`
  if (npr >= 1e7) return `NPR ${(npr / 1e7).toFixed(0)} Crore`
  return `NPR ${Math.round(npr).toLocaleString()}`
}

export async function formatNprLive(v: number): Promise<string> {
  const rate = await getLiveNprRate()
  return formatNpr(v, rate)
}

export function formatNum(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return v.toLocaleString()
}

export function pctChange(curr: number, prev: number): number {
  return prev ? ((curr - prev) / prev) * 100 : 0
}
