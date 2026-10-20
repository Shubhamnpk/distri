// BIPAD portal (NDRRMA) - official disaster-risk API, keyless, paginated DRF shape.
// https://bipadportal.gov.np/api/v1/ - ~150 resources. Verified live 2026-10-13.
// Shape: { count, next, previous, results[] }. Supports ?limit=&offset=.

import { canonDistrictKey, normName } from './district-geo'

const BIPAD_BASE = 'https://bipadportal.gov.np/api/v1'

const HEADERS = {
  'User-Agent': 'Drishti-Nepal-Accountability-Dashboard/1.0',
  'Accept': 'application/json',
}

async function fetchBipad<T>(path: string, limit = 10, query = ''): Promise<{ count: number; results: T[] }> {
  try {
    const res = await fetch(`${BIPAD_BASE}${path}?limit=${limit}${query}`, {
      headers: HEADERS,
      next: { revalidate: 3600 },
    })
    if (!res.ok) return { count: 0, results: [] }
    const json = await res.json()
    return { count: typeof json?.count === 'number' ? json.count : (json?.results?.length ?? 0), results: json?.results ?? [] }
  } catch {
    return { count: 0, results: [] }
  }
}

export type BipadIncident = {
  id: number
  title: string
  titleNe?: string
  point?: { type: string; coordinates: [number, number] }
  hazard?: number
  /** id of the matching `/loss/<id>/` row — join it for casualties and damage. */
  loss?: number | null
  incidentOn?: string
  createdOn?: string
  modifiedOn?: string
  verified?: boolean
  dataSource?: string
  [key: string]: unknown
}

export type BipadAlert = {
  id: number
  title: string
  point?: { type: string; coordinates: [number, number] }
  createdOn?: string
  affectedDemography?: { maleCount: number; femaleCount: number; householdCount: number }
  [key: string]: unknown
}

export type BipadQuake = {
  id: number
  title?: string
  point?: { type: string; coordinates: [number, number] }
  magnitude?: number
  createdOn?: string
  [key: string]: unknown
}

/** Recent disaster incidents (fire, flood, landslide…) with coords + wards.
 *  `ordering=-id` is MANDATORY: the API's default sort is ASCENDING on
 *  incidentOn, so an unordered call returns 2011 records, not this week's.
 *  `fields` (snake_case, e.g. `id,title,point,hazard,incident_on`) shrinks the
 *  payload ~2.5x for map pins; unknown names are silently dropped. */
export async function fetchBipadIncidents(limit = 10, fields?: string) {
  return fetchBipad<BipadIncident>('/incident/', limit, `&ordering=-id${fields ? `&fields=${fields}` : ''}`)
}

/** Active warnings (flood water-level, pollution…) with affected demography. */
export async function fetchBipadAlerts(limit = 10) {
  return fetchBipad<BipadAlert>('/alert/', limit, '&ordering=-id')
}

/** Earthquake feed (mirrors NEMRC-style station telemetry). */
export async function fetchBipadEarthquakes(limit = 10) {
  return fetchBipad<BipadQuake>('/earthquake/', limit, '&ordering=-id')
}

/** Recorded losses (people + infrastructure) - accountability-grade aggregates. */
export async function fetchBipadLosses(limit = 10) {
  return fetchBipad<Record<string, unknown>>('/loss/', limit, '&ordering=-id')
}

/** DRR projects inventory (who is building resilience, where). */
export async function fetchBipadProjects(limit = 10) {
  return fetchBipad<Record<string, unknown>>('/project/', limit)
}

/** Realtime telemetry mirrors: rain/river stations (minute-hourly freshness). */
export async function fetchBipadRainStations(limit = 50) {
  return fetchBipad<Record<string, unknown>>('/rain-stations/', limit)
}

export async function fetchBipadRiverStations(limit = 50) {
  return fetchBipad<Record<string, unknown>>('/river-stations/', limit)
}

/** Canonical admin geo backbone (province/district/municipality/ward) with bboxes + EN/NE names. */
export async function fetchBipadGeo(level: 'province' | 'district' | 'municipality' | 'ward', limit = 100, fields?: string) {
  return fetchBipad<BipadGeo>(`/${level}/`, limit, fields ? `&fields=${fields}` : '')
}

export type BipadGeo = {
  id: number
  title?: string
  titleNe?: string
  province?: number
  district?: number
  centroid?: { type: string; coordinates: [number, number] }
  [key: string]: unknown
}

/** 77 districts with centroids — DHM stations carry no district, only coordinates. */
export function fetchBipadDistrictCentroids() {
  return fetchBipad<BipadGeo>('/district/', 100, '&fields=id,title,centroid')
}

export type BipadHazard = {
  id: number
  title: string
  titleEn?: string
  titleNe?: string
  color?: string
  icon?: string
  type?: string
  [key: string]: unknown
}

/** Hazard dictionary (47 rows: id → EN/NE name, icon, colour). Stable — safe to trust. */
export async function fetchBipadHazards() {
  return fetchBipad<BipadHazard>('/hazard/', 60)
}

export type BipadLoss = {
  id: number
  peopleDeathCount?: number
  peopleMissingCount?: number
  peopleInjuredCount?: number
  peopleAffectedCount?: number
  familyAffectedCount?: number
  familyRelocatedCount?: number
  familyEvacuatedCount?: number
  livestockDestroyedCount?: number
  infrastructureDestroyedCount?: number
  infrastructureDestroyedHouseCount?: number
  infrastructureAffectedHouseCount?: number
  infrastructureDestroyedRoadCount?: number
  infrastructureDestroyedBridgeCount?: number
  infrastructureDestroyedElectricityCount?: number
  infrastructureEconomicLoss?: number
  agricultureEconomicLoss?: number
  estimatedLoss?: number | null
  [key: string]: unknown
}

const LOSS_FIELDS = 'id,people_death_count,people_missing_count,people_injured_count,family_affected_count,family_relocated_count,livestock_destroyed_count,infrastructure_destroyed_count,infrastructure_destroyed_house_count,estimated_loss'

/** Single detail record (`/loss/123/`), not a list — `fetchBipad` returns `.results`, which detail routes lack. */
async function fetchBipadOne<T>(path: string, query?: string): Promise<T | null> {
  try {
    const res = await fetch(`${BIPAD_BASE}${path}${query ? `?${query}` : ''}`, { headers: HEADERS, next: { revalidate: 3600 } })
    if (!res.ok) return null
    const json = await res.json()
    return json && typeof json === 'object' && !Array.isArray(json) ? (json as T) : null
  } catch {
    return null
  }
}

/** Loss rows are NOT ordered with the incidents that point at them (new incidents often carry
 *  old loss ids), `id__in` is ignored, and deep offsets drift — so bulk joins miss most rows.
 *  Fetch the ids we actually need, in small batches. */
export async function fetchBipadLossesByIds(ids: number[]): Promise<BipadLoss[]> {
  const uniq = [...new Set(ids.filter(id => Number.isFinite(id) && id > 0))]
  const out: BipadLoss[] = []
  for (let i = 0; i < uniq.length; i += 12) {
    const batch = await Promise.all(uniq.slice(i, i + 12).map(id => fetchBipadOne<BipadLoss>(`/loss/${id}/`, `fields=${LOSS_FIELDS}`)))
    for (const row of batch) if (row) out.push(row)
  }
  return out
}

/** Full incident record: the list endpoint's slim rows omit `titleNe`, `cause`,
 *  `description`, `verificationMessage`, `wards[]` and `dataSource`. */
export type BipadIncidentDetail = BipadIncident & {
  titleNe?: string | null
  description?: string | null
  cause?: string | null
  verificationMessage?: string | null
  approved?: boolean
  wards?: number[]
  streetAddress?: string | null
  dataSource?: string | null
}

export function fetchBipadIncidentDetail(id: number) {
  return fetchBipadOne<BipadIncidentDetail>(`/incident/${id}/`)
}

/** Loss record joined from `incident.loss` (casualties, families, damage, NPR estimate). */
export function fetchBipadLoss(id: number) {
  return fetchBipadOne<BipadLoss>(`/loss/${id}/`)
}

export type BipadIncidentPlace = { municipality?: string; municipalityType?: string; ward?: string; district?: string }
const placeCache = new Map<number, Promise<BipadIncidentPlace | null>>()

/** `/incident/` rows carry ward ids, not names: ward → municipality → district. */
export function fetchBipadIncidentPlace(wardId: number): Promise<BipadIncidentPlace | null> {
  const cached = placeCache.get(wardId)
  if (cached) return cached
  const p = (async () => {
    const ward = await fetchBipadOne<{ title?: string; municipality?: number }>(`/ward/${wardId}/`)
    if (!ward?.municipality) return null
    const muni = await fetchBipadOne<{ title?: string; type?: string; district?: number }>(`/municipality/${ward.municipality}/`)
    if (!muni) return null
    const dist = muni.district ? await fetchBipadOne<{ title?: string }>(`/district/${muni.district}/`) : null
    return {
      municipality: muni.title,
      municipalityType: muni.type,
      ward: ward.title,
      district: dist?.title,
    }
  })().catch(() => null)
  placeCache.set(wardId, p)
  return p
}

export type BipadIncidentProfile = {
  year: number
  values: {
    incidentCount: number
    estimatedTotalLoss: number
    peopleDeathCount: number
    peopleMissingCount: number
    peopleInjuredCount: number
    familyRelocatedCount: number
    livestockDestroyedCount: number
    agricultureDestroyedCount: number
    totalInfrastructureDestroyedCount: number
  }
}

/** National yearly disaster aggregates 2011→today. Returns `{data:[…]}`, not the DRF `results` shape. */
export async function fetchBipadIncidentProfile(): Promise<BipadIncidentProfile[]> {
  try {
    const res = await fetch(`${BIPAD_BASE}/incident-profile/`, { headers: HEADERS, next: { revalidate: 21600 } })
    if (!res.ok) return []
    const json = await res.json()
    const rows: BipadIncidentProfile[] = Array.isArray(json?.data) ? json.data : Array.isArray(json?.results) ? json.results : []
    return rows.filter(r => r?.values && typeof r.year === 'number').sort((a, b) => a.year - b.year)
  } catch {
    return []
  }
}

export type BipadRelief = {
  id: number
  causeOfIncident?: string | null
  nameOfBeneficiary?: string
  numberOfBeneficiaryFamily?: number
  dateOfReliefDistribution?: string
  reliefAmountNpr?: number | null
  totalMaleBenefited?: number | null
  totalFemaleBenefited?: number | null
  incident?: number
  province?: number
  district?: number
  municipality?: number
  fiscalYear?: number
  [key: string]: unknown
}

/** Relief actually distributed (amount, families, date) — sparse: NDRRMA has published only ~12 rows. */
export async function fetchBipadIncidentRelief(limit = 100) {
  return fetchBipad<BipadRelief>('/incident-relief/', limit, '&ordering=-id')
}

export type BipadBudgetActivity = {
  id: number
  activityName?: string
  fundType?: string | null
  otherFundType?: string | null
  donerOrganization?: string | null
  amount?: number | null
  expenditure?: number | null
  status?: string | null
  projectStartDate?: string | null
  projectEndDate?: string | null
  [key: string]: unknown
}

const BUDGET_FIELDS = 'id,activity_name,fund_type,other_fund_type,doner_organization,amount,expenditure,status,project_start_date,project_end_date'

/** DRR budget line items with spend + status. The `/annual-budget/` header resource is demo data — only use activities. */
export async function fetchBipadBudgetActivities(limit = 200) {
  return fetchBipad<BipadBudgetActivity>('/annual-budget-activity/', limit, `&ordering=-id&fields=${BUDGET_FIELDS}`)
}

export type BipadFiscalYear = {
  id: number
  titleEn?: string
  titleNp?: string
  startDateAd?: string
  endDateAd?: string
  [key: string]: unknown
}

/** BS↔AD fiscal-year ladder (id 1 = 2060/61 BS). */
export async function fetchBipadFiscalYears(limit = 60) {
  return fetchBipad<BipadFiscalYear>('/nepali-fiscal-year/', limit, '&ordering=-id')
}

export type BipadNapPoint = { year: number; value: number }

export type BipadNapRow = {
  id: number
  region: string
  district?: number | null
  rcp45?: BipadNapPoint[]
  rcp85?: BipadNapPoint[]
  sdRcp45?: BipadNapPoint[]
  sdRcp85?: BipadNapPoint[]
  [key: string]: unknown
}

/** NAP downscaled CMIP projections: 120 annual points 1981→2100, per district (77) + `region:"national"`.
 *  One row is ~12 KB, so query a single region — never the whole table (~1 MB per metric). */
export function fetchBipadNap(kind: 'temperature' | 'precipitation', opts: { district?: number } = {}) {
  const q = opts.district != null ? `&district=${opts.district}` : '&region=national'
  return fetchBipad<BipadNapRow>(`/nap-${kind}/`, 1, q)
}

export type BipadStation = {
  id: number
  title: string
  point?: { type: string; coordinates: [number, number] }
  district?: number
  province?: number
  basin?: string | null
  elevation?: number
  status?: string
  /** Rain gauges only — accumulation per window (interval in hours: 1, 3, 6, 12, 24). */
  averages?: { value: number | null; interval: number; status?: { danger?: boolean; warning?: boolean } }[]
  waterLevel?: number
  dangerLevel?: number
  warningLevel?: number
  waterLevelOn?: string
  steady?: string
  measuredOn?: string
  [key: string]: unknown
}

/** Walk the DRF `next` links to pull the whole station network (rain ~660, river ~280). */
async function fetchBipadPages<T>(path: string, pages = 8, limit = 100): Promise<T[]> {
  const out: T[] = []
  let url: string | null = `${BIPAD_BASE}${path}?limit=${limit}`
  for (let i = 0; i < pages && url; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS, next: { revalidate: 3600 } })
      if (!res.ok) break
      const json: { results?: T[]; next?: string | null } = await res.json()
      out.push(...(json?.results ?? []))
      url = json?.next ?? null
    } catch {
      break
    }
  }
  return out
}

/** National rainfall-gauge network (~660 stations) with coords + elevation. */
export function fetchBipadRainStationsAll(): Promise<BipadStation[]> {
  return fetchBipadPages<BipadStation>('/rain-stations/')
}

export type BipadDemographicRow = {
  id: number
  totalPopulation?: number | null
  malePopulation?: number | null
  femalePopulation?: number | null
  householdCount?: number | null
  literacyRate?: number | null
  totalAboveFiveYears?: number | null
  totalLiterate?: number | null
  censusYear?: string | null
  federalLevel?: string | null
  municipality?: number | null
  ageGroupPopulation?: { male?: Record<string, number>; female?: Record<string, number> }
  [key: string]: unknown
}

export type DistrictProfile = {
  censusYear: string
  /** Local units (palikas) summed into this profile. */
  units: number
  population: number
  male: number
  female: number
  households: number
  /** Share of the 5+ population that is literate, from summed totals (null when the API blanks them). */
  literacy: number | null
  ageBands: { band: string; male: number; female: number }[]
}

/** Census profile for one district, summed from its palika rows.
 *  The API stores one row per palika PER census year (2011 + 2021) and silently ignores
 *  `?censusYear=`, so we pick the newest year present and sum only those rows — mixing
 *  years double-counts. Everything returned here is computed from the rows, not published. */
export async function fetchBipadDistrictProfile(districtId: number): Promise<DistrictProfile | null> {
  const { results } = await fetchBipad<BipadDemographicRow>('/demographic/', 100, `&district=${districtId}`)
  if (!results.length) return null
  const year = results.map(r => String(r.censusYear ?? '')).sort().at(-1) ?? ''
  const rows = results.filter(r => String(r.censusYear ?? '') === year)
  if (!rows.length) return null
  const sum = (pick: (r: BipadDemographicRow) => number | null | undefined) =>
    rows.reduce((s, r) => s + (pick(r) ?? 0), 0)
  const above5 = sum(r => r.totalAboveFiveYears)
  const literate = sum(r => r.totalLiterate)
  const bands = Object.keys(rows[0].ageGroupPopulation?.male ?? {})
    .map(band => ({
      band,
      male: sum(r => r.ageGroupPopulation?.male?.[band]),
      female: sum(r => r.ageGroupPopulation?.female?.[band]),
    }))
    .sort((a, b) => a.band.localeCompare(b.band))
  return {
    censusYear: year,
    units: rows.length,
    population: sum(r => r.totalPopulation),
    male: sum(r => r.malePopulation),
    female: sum(r => r.femalePopulation),
    households: sum(r => r.householdCount),
    literacy: above5 > 0 ? (literate / above5) * 100 : null,
    ageBands: bands,
  }
}

export type PalikaCensus = {
  id: number
  title: string
  censusYear: string
  population: number
  male: number
  female: number
  households: number
  /** Share of the 5+ population that is literate (computed when the rate is blank). */
  literacy: number | null
  /** BIPAD's palika centroid — used when the boundary file spells the name differently. */
  centroid?: [number, number]
}

/** Newest census row for every palika of one district. Rows are also keyed by
 *  `normName(title)` for the common case; the caller falls back to the nearest
 *  centroid when the boundary file uses an older or differently-spelled name.
 *  `/demographic/` names the palika only by numeric id, so titles come from
 *  `/municipality/?district=` and the two are joined on it. 2021 rows blank
 *  `literacyRate`, so it is recomputed from `totalLiterate / totalAboveFiveYears`. */
export async function fetchBipadPalikaCensus(districtId: number): Promise<{ year: string; rows: PalikaCensus[]; byName: Record<string, PalikaCensus> }> {
  const [muni, dem] = await Promise.all([
    fetchBipad<{ id: number; title: string; centroid?: { coordinates?: [number, number] } }>('/municipality/', 100, `&district=${districtId}`),
    fetchBipad<BipadDemographicRow>('/demographic/', 100, `&district=${districtId}`),
  ])
  const meta = new Map(muni.results.map(m => [m.id, m]))
  const year = dem.results.map(r => String(r.censusYear ?? '')).sort().at(-1) ?? ''
  const rows: PalikaCensus[] = []
  const byName: Record<string, PalikaCensus> = {}
  for (const r of dem.results) {
    if (String(r.censusYear ?? '') !== year || r.municipality == null) continue
    const m = meta.get(r.municipality)
    if (!m?.title) continue
    const above5 = r.totalAboveFiveYears ?? 0
    const literate = r.totalLiterate ?? 0
    const row: PalikaCensus = {
      id: r.municipality,
      title: m.title,
      censusYear: year,
      population: r.totalPopulation ?? 0,
      male: r.malePopulation ?? 0,
      female: r.femalePopulation ?? 0,
      households: r.householdCount ?? 0,
      literacy: r.literacyRate ?? (above5 > 0 ? (literate / above5) * 100 : null),
      centroid: m.centroid?.coordinates,
    }
    rows.push(row)
    byName[normName(m.title)] = row
  }
  return { year, rows, byName }
}

export type BipadRoadBlock = {
  id: number
  title: string
  roadRefno?: string | null
  linkCode?: string | null
  point?: { type: string; coordinates: [number, number] }
  location?: string | null
  division?: string | null
  chainage?: string | null
  endChainage?: string | null
  /** Current state of this blockage event: OPEN / PARTIAL_OPEN / CLOSED. */
  status?: string | null
  closureReason?: string | null
  repairEta?: string | null
  effortsBeingMade?: string | null
  remarks?: string | null
  images?: string[]
  dateRoadblockStart?: string | null
  dateRoadblockEndEstimated?: string | null
  /** Empty = no reopening recorded (still shut, or never reported). */
  dateRoadblockEnd?: string | null
  actualRepairTime?: string | null
  contactPerson?: string | null
  district?: number | null
  province?: number | null
  [key: string]: unknown
}

/** Department of Roads blockage log carried by BIPAD: one row per closure event on a
 *  national highway — status, closure reason, ETA, efforts, photos, lat/lon.
 *  ~405 rows (≈6 months of events, 29 highways), so pull the table in one request. */
export async function fetchBipadRoadBlocks(limit = 500) {
  const fields = 'id,title,road_refno,link_code,point,location,division,chainage,status,closure_reason,repair_eta,efforts_being_made,remarks,images,date_roadblock_start,date_roadblock_end,date_roadblock_end_estimated,actual_repair_time,contact_person,district'
  return fetchBipad<BipadRoadBlock>('/highway/', limit, `&ordering=-id&fields=${fields}`)
}

export type BipadQuakeRisk = { district: number; riskScore: number; rank: number; hdiScore: number | null }

/** Canonical district name → BIPAD district id (all 77 in one small request).
 *  District ids elsewhere in the app can come from polygon files, whose synthetic
 *  ids are NOT BIPAD ids — always join this API on the name. */
export async function fetchBipadDistrictIds(): Promise<Record<string, number>> {
  const { results } = await fetchBipad<{ id: number; title: string }>('/district/', 100, '&fields=id,title')
  return Object.fromEntries(results.filter(r => r.title).map(r => [canonDistrictKey(r.title), Number(r.id)]))
}

/** Per-district seismic risk score (77 rows, one request). */
export async function fetchBipadQuakeRisk() {
  const { results } = await fetchBipad<{ district?: number; data?: Record<string, number> }>('/earthquake-riskscore/', 100)
  return results.flatMap(r => {
    const d = r.data ?? {}
    return typeof r.district === 'number' && typeof d.riskScore === 'number'
      ? [{ district: r.district, riskScore: d.riskScore, rank: d.rank ?? 0, hdiScore: d.hdiScore ?? null }]
      : []
  })
}

/** National river/water-level network (~280 stations) with live flood telemetry. */
export function fetchBipadRiverStationsAll(): Promise<BipadStation[]> {
  return fetchBipadPages<BipadStation>('/river-stations/')
}
