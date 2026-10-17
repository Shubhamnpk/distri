// IMF World Economic Outlook (Nepal) via the DBnomics mirror, server-side.
// Used by the Economy page to fill IMF series when the direct DataMapper call
// is blocked (Akamai 403 / browser CORS). Cached 24h.

import { NextResponse } from 'next/server'
import { fetchImfSeries } from '@/lib/imf'

export const revalidate = 86400

export async function GET() {
  try {
    const { version, series } = await fetchImfSeries()
    if (!Object.keys(series).length) return NextResponse.json({ ok: false }, { status: 502 })
    return NextResponse.json({ ok: true, version, series })
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 })
  }
}
