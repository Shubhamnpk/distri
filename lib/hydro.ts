// Client helper for the full hydropower register (572 projects).
// Data comes from our own /api/hydro route, which parses the NAXA portal table
// server-side (see app/api/hydro/route.ts). Client-only (relative URL).

export type HydroProject = {
  name: string
  province: string
  district: string
  municipality: string
  mw: number
  river: string
  licNo: string
  issueDate: string
  validity: string
  promoter: string
  address: string
  lng: number
  lat: number
  licenseType: string
}

let cache: Promise<HydroProject[]> | null = null

export function fetchHydroProjects(): Promise<HydroProject[]> {
  if (!cache) {
    cache = (async () => {
      try {
        const res = await fetch('/api/hydro')
        if (!res.ok) return []
        const json = await res.json()
        return Array.isArray(json?.projects) ? (json.projects as HydroProject[]) : []
      } catch {
        return []
      }
    })()
  }
  return cache
}

/** Three licence kinds in the register: 'Operation' = operational,
 *  'Generation' = licensed to generate (construction/commissioning),
 *  'Survey' = exploration only. */
export type HydroKind = 'operation' | 'generation' | 'survey'

export function hydroKind(licenseType: string): HydroKind {
  const t = licenseType.toLowerCase()
  if (t.includes('operation')) return 'operation'
  if (t.includes('survey')) return 'survey'
  return 'generation'
}

export const HYDRO_KIND_LABEL: Record<HydroKind, string> = {
  operation: 'Operational',
  generation: 'Generation licence',
  survey: 'Survey licence',
}

export const HYDRO_KIND_COLOR: Record<HydroKind, string> = {
  operation: '#16a34a',
  generation: '#2563eb',
  survey: '#d97706',
}
