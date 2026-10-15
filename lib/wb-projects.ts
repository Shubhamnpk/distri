// World Bank Projects API - every WB-financed project in Nepal, keyless.
// https://search.worldbank.org/api/v3/projects?format=json&countrycode_exact=NP
// Verified live 2026-10-13: total "281". NOTE: must use countrycode_exact=NP -
// bare countrycode=NP silently returns global results. projects is a keyed object.

const WB_PROJECTS_BASE = 'https://search.worldbank.org/api/v3/projects'

export type WbProject = {
  id: string
  project_name: string
  countryshortname?: string
  boardapprovaldate?: string
  closingdate?: string
  totalamt?: string
  lendprojectcost?: string
  idacommamt?: string
  borrower?: string
  impagency?: string
  regionname?: string
  [key: string]: unknown
}

type WbProjectsResponse = {
  total?: string | number
  page?: string
  rows?: number
  projects?: Record<string, WbProject>
}

async function fetchWbProjectsPage(page: number, rows: number): Promise<WbProjectsResponse | null> {
  try {
    const res = await fetch(
      `${WB_PROJECTS_BASE}?format=json&countrycode_exact=NP&rows=${rows}&page=${page}`,
      {
        headers: { 'User-Agent': 'Drishti-Nepal-Accountability-Dashboard/1.0', Accept: 'application/json' },
        next: { revalidate: 86400 },
      },
    )
    if (!res.ok) return null
    return (await res.json()) as WbProjectsResponse
  } catch {
    return null
  }
}

/** Total WB project count for Nepal (for header strips / coverage stats). */
export async function fetchWbProjectCount(): Promise<number> {
  const data = await fetchWbProjectsPage(1, 1)
  const total = Number(data?.total ?? 0)
  return Number.isFinite(total) ? total : 0
}

/** Latest WB-financed Nepal projects (commitments, agencies, approval/closing dates). */
export async function fetchWbProjects(rows = 20): Promise<WbProject[]> {
  const data = await fetchWbProjectsPage(1, rows)
  if (!data?.projects) return []
  return Object.values(data.projects)
}

export function wbProjectCommitment(p: WbProject): number {
  return Number(p.totalamt ?? p.lendprojectcost ?? p.idacommamt ?? 0) || 0
}
