// Light summary endpoint for client-side teasers (homepage). Cached 24h.
// Full archive parsing stays in lib/ocds.ts for the server-rendered /procurement page.

import { NextResponse } from 'next/server'
import { fetchOcdsTenders, summarizeOcds } from '@/lib/ocds'

export const revalidate = 86400

export async function GET() {
  try {
    const tenders = await fetchOcdsTenders()
    const summary = summarizeOcds(tenders)
    if (!summary) return NextResponse.json({ ok: false }, { status: 502 })
    return NextResponse.json({ ok: true, summary })
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 })
  }
}
