import type { CkanDataset } from './types'

const BASE_URL = 'https://api.opendatanepal.com/api/3'

const COMMON_HEADERS = {
  'User-Agent': 'Drishti-Nepal-Accountability-Dashboard/1.0',
  'Accept': 'application/json',
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: COMMON_HEADERS,
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.success ? json.result : null
  } catch {
    return null
  }
}

export async function searchDatasets(query: string, rows = 20): Promise<CkanDataset[]> {
  const data = await fetchJson<{ results: CkanDataset[] }>(
    `${BASE_URL}/action/package_search?q=${encodeURIComponent(query)}&rows=${rows}`
  )
  return data?.results ?? []
}

export async function getDatasetByName(name: string): Promise<CkanDataset | null> {
  return fetchJson<CkanDataset>(`${BASE_URL}/action/package_show?id=${encodeURIComponent(name)}`)
}

export async function getDatastoreData(resourceId: string, limit = 100): Promise<unknown[]> {
  const data = await fetchJson<{ records: unknown[] }>(
    `${BASE_URL}/action/datastore_search?resource_id=${resourceId}&limit=${limit}`
  )
  return data?.records ?? []
}

export async function searchOrganization(orgName: string, rows = 50): Promise<CkanDataset[]> {
  const data = await fetchJson<{ results: CkanDataset[] }>(
    `${BASE_URL}/action/package_search?fq=organization:${orgName}&rows=${rows}`
  )
  return data?.results ?? []
}

export async function getTaggedDatasets(tag: string, rows = 20): Promise<CkanDataset[]> {
  const data = await fetchJson<{ results: CkanDataset[] }>(
    `${BASE_URL}/action/package_search?fq=tags:${tag}&rows=${rows}`
  )
  return data?.results ?? []
}

// Pre-built queries for common datasets
export const NEPAL_DATA_QUERIES = {
  // Company & industry data
  INDUSTRIES: 'industry',
  REGISTERED_COMPANIES: 'registered companies',
  FDI: 'foreign direct investment',
  JOINT_VENTURES: 'joint venture',
  
  // Project & aid data
  HYDROPOWER: 'hydropower',
  PROJECTS: 'project',
  FOREIGN_AID: 'foreign aid',
  
  // Economic data
  GDP: 'GDP',
  BUDGET: 'budget',
  TRADE: 'trade',
  INFLATION: 'inflation',
  
  // Government data
  PUBLIC_ENTERPRISE: 'public enterprise',
  COMPANY_REGISTRAR: 'company registrar',
  PROCUREMENT: 'procurement',

  // Social & environment data
  HEALTH: 'health',
  EDUCATION: 'education',
  AGRICULTURE: 'agriculture',
  CLIMATE: 'climate',
  WATER: 'water sanitation',
}

// Get relevant datasets for our dashboard
export async function getRelevantDatasets(): Promise<{
  companies: CkanDataset[]
  projects: CkanDataset[]
  economy: CkanDataset[]
  social: CkanDataset[]
}> {
  const [companies, projects, economy, social] = await Promise.all([
    searchOrganization('department-of-industry', 20),
    searchOrganization('ministry-of-finance', 20),
    getTaggedDatasets('hydropower', 10),
    searchDatasets('health education agriculture', 20),
  ])

  return { companies, projects, economy, social }
}
