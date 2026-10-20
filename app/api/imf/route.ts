// IMF World Economic Outlook (Nepal) via the IMF SDMX API, server-side.
// Used by the Economy page to fill IMF series when the direct DataMapper call
// is blocked (Akamai 403 / browser CORS). DBnomics is the fallback. Cached 24h.

import { NextResponse } from 'next/server'
import { fetchImfSeries } from '@/lib/imf'

export const revalidate = 86400

export async function GET() {
  try {
    const { version, vintage, series } = await fetchImfSeries()
    if (!Object.keys(series).length) return NextResponse.json({ ok: false }, { status: 502 })
    return NextResponse.json({ ok: true, version, vintage, series })
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 })
  }
}
