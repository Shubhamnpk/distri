import { formatNpr } from '@/lib/currency'
import type { ProjectNepalProvince, ProjectNepalDistrict, ProjectNepalProject, ProjectNepalBudget } from './types'

const BASE_URL = 'https://raw.githubusercontent.com/EverestValley/project-nepal/main/data'

const COMMON_HEADERS = {
  'User-Agent': 'Drishti-Nepal-Accountability-Dashboard/1.0',
  'Accept': 'application/json',
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: COMMON_HEADERS,
      next: { revalidate: 86400 }, // Daily revalidation for project data
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function fetchProjectNepalProvinces(): Promise<ProjectNepalProvince[]> {
  const data = await fetchJson<{ provinces: { id: number; name: string; nepali_name: string }[] }>(
    `${BASE_URL}/hierarchy/provinces.json`
  )
  if (!data?.provinces) return []
  return data.provinces.map(p => ({ ...p, districts: [] }))
}

export async function fetchProjectNepalDistricts(): Promise<ProjectNepalDistrict[]> {
  const data = await fetchJson<{ districts: { id: number; province_id: number; name: string; nepali_name: string }[] }>(
    `${BASE_URL}/hierarchy/districts.json`
  )
  return data?.districts ?? []
}

export async function fetchProjectNepalProjects(provinceId: number, districtId: number): Promise<ProjectNepalProject[]> {
  const slug = await getDistrictSlugResolved(districtId)
  const provinceDir = `${provinceId}-${getProvinceSlug(provinceId)}`
  const districtDir = `${String(districtId).padStart(2, '0')}-${slug}`
  const url = `${BASE_URL}/content/${provinceDir}/districts/${districtDir}/projects/2082-83.json`
  
  const data = await fetchJson<{ projects: ProjectNepalProject[] }>(url)
  return data?.projects ?? []
}

export async function fetchProjectNepalBudgets(provinceId: number, districtId: number): Promise<ProjectNepalBudget | null> {
  const slug = await getDistrictSlugResolved(districtId)
  const provinceDir = `${provinceId}-${getProvinceSlug(provinceId)}`
  const districtDir = `${String(districtId).padStart(2, '0')}-${slug}`
  const url = `${BASE_URL}/content/${provinceDir}/districts/${districtDir}/budgets/2082-83.json`
  
  return fetchJson<ProjectNepalBudget>(url)
}

// Direct fetch by slugs (faster, no extra lookup)
export async function fetchProjectNepalProjectsBySlug(provinceId: number, district: ProjectNepalDistrict): Promise<ProjectNepalProject[]> {
  const provinceDir = `${provinceId}-${getProvinceSlug(provinceId)}`
  const districtDir = `${String(district.id).padStart(2, '0')}-${slugifyDistrict(district.name)}`
  const url = `${BASE_URL}/content/${provinceDir}/districts/${districtDir}/projects/2082-83.json`
  const data = await fetchJson<{ projects: ProjectNepalProject[] }>(url)
  return data?.projects ?? []
}

export async function fetchDistrictProblems(provinceId: number, district: ProjectNepalDistrict): Promise<import('./types').ProjectNepalProblem[]> {
  const provinceDir = `${provinceId}-${getProvinceSlug(provinceId)}`
  const districtDir = `${String(district.id).padStart(2, '0')}-${slugifyDistrict(district.name)}`
  const url = `${BASE_URL}/content/${provinceDir}/districts/${districtDir}/problems/2082-severe-air-pollution.json`
  // Generic: list problems directory via GitHub API is not via raw; we fetch the known file as example and fallback to empty
  // Instead, try to fetch the problems folder listing via raw is not supported - return empty and let caller fetch via GitHub API if needed
  return []
}

// Helper functions for directory slugs
function getProvinceSlug(id: number): string {
  const slugs: Record<number, string> = {
    1: 'koshi-pradesh',
    2: 'madhesh-pradesh',
    3: 'bagmati-pradesh',
    4: 'gandaki-pradesh',
    5: 'lumbini-pradesh',
    6: 'karnali-pradesh',
    7: 'sudurpashchim-pradesh',
  }
  return slugs[id] ?? 'unknown'
}

export function slugifyDistrict(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// Resolve district slug from id via hierarchy (cached)
let _districtCache: Map<number, string> | null = null
async function getDistrictSlugResolved(id: number): Promise<string> {
  if (_districtCache?.has(id)) return _districtCache.get(id)!
  try {
    const districts = await fetchProjectNepalDistricts()
    _districtCache = new Map(districts.map(d => [d.id, slugifyDistrict(d.name)]))
    return _districtCache.get(id) ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

// Convert ProjectNepal status to our status type
export function mapProjectStatus(
  status: 'Reported' | 'In Progress' | 'Delayed' | 'Completed'
): 'On track' | 'At risk' | 'Delayed' | 'Completed' {
  const statusMap = {
    'Reported': 'At risk' as const,
    'In Progress': 'On track' as const,
    'Delayed': 'Delayed' as const,
    'Completed': 'Completed' as const,
  }
  return statusMap[status]
}

// Calculate progress from status
export function calculateProgress(status: 'Reported' | 'In Progress' | 'Delayed' | 'Completed'): number {
  switch (status) {
    case 'Reported': return 5
    case 'In Progress': return 45
    case 'Delayed': return 25
    case 'Completed': return 100
  }
}

// Format budget in NPR
export function formatBudget(amount: number): string {
  return formatNpr(amount)
}
