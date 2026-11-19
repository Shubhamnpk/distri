// IMF World Economic Outlook (Nepal) via the IMF SDMX API, server-side.
// Used by the Economy page to fill IMF series when the direct DataMapper call
// is blocked (Akamai 403 / browser CORS). DBnomics is the fallback. Cached 24h.

import { NextResponse } from 'next/server'
import { cdnCache } from '@/lib/cache'
import { fetchImfSeries } from '@/lib/imf'

export const revalidate = 86400

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET() {
  try {
    const { version, vintage, series } = await fetchImfSeries()
    if (!Object.keys(series).length) return NextResponse.json({ ok: false }, { status: 502, headers: NO_STORE })
    return NextResponse.json({ ok: true, version, vintage, series }, { headers: cdnCache(86400) })
  } catch {
    return NextResponse.json({ ok: false }, { status: 502, headers: NO_STORE })
  }
}
