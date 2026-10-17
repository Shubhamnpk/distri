// Full Nepal hydropower licence register (572 projects) from the Niti/NAXA
// Hydropower Portal. The portal's map ships only 10 points (hydro.js); the
// complete register is server-rendered as ONE HTML table on /core/datasets/.
// We parse that table here (server-side, cached 24h) so the client gets clean
// JSON with coordinates. Columns: Project | Province | District | Municipality
// | Capacity (MW) | River | Lic No | Issue Date | Validity | Promoter | Address
// | Longitude | Latitude | License Type.

import { NextResponse } from 'next/server'

export const revalidate = 86400

const URL = 'https://hydro.naxa.com.np/core/datasets/'

const HEADERS = {
  'User-Agent': 'Drishti-Nepal-Accountability-Dashboard/1.0',
  Accept: 'text/html',
}

function strip(s: string): string {
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

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

export async function GET() {
  try {
    const res = await fetch(URL, { headers: HEADERS, next: { revalidate: 86400 } })
    if (!res.ok) return NextResponse.json({ projects: [] }, { status: 200 })
    const html = await res.text()

    const rows = [...html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
      .map(m => m[1])
      .filter(tr => tr.includes('<td'))

    const projects: HydroProject[] = []
    for (const tr of rows) {
      const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => strip(m[1]))
      if (cells.length < 14) continue
      const lat = Number(cells[12])
      const lng = Number(cells[11])
      const mw = Number(cells[4])
      if (!cells[0] || !Number.isFinite(lat) || !Number.isFinite(lng)) continue
      // Keep only Nepal-range coordinates (drops blank/0/0 rows).
      if (lng < 80 || lng > 89 || lat < 26 || lat > 31) continue
      projects.push({
        name: cells[0],
        province: cells[1],
        district: cells[2],
        municipality: cells[3],
        mw: Number.isFinite(mw) ? mw : 0,
        river: cells[5],
        licNo: cells[6],
        issueDate: cells[7],
        validity: cells[8],
        promoter: cells[9],
        address: cells[10],
        lng,
        lat,
        licenseType: cells[13] || 'Unknown',
      })
    }

    return NextResponse.json({ projects, count: projects.length })
  } catch {
    return NextResponse.json({ projects: [] }, { status: 200 })
  }
}
