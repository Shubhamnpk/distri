// PPMO e-GP procurement mirror - Open Contracting Data Standard (OCDS) bulk files.
// No key, direct CDN download. SERVER-ONLY (uses node:zlib) - never import from client components.
// Verified live: 4,872 contracting processes as gzipped JSONL.
// NOTE: snapshot covers 2016-2018 (e-GP mirror, not live). Label honestly in UI.
// Live tenders resume when bolpatra.gov.np (currently under maintenance) returns.

import { gunzipSync } from 'node:zlib'

const OCDS_FULL_URL =
  'https://data.open-contracting.org/en/publication/36/download?name=full.jsonl.gz'

export type OcdsTender = {
  ocid: string
  title: string
  buyer: string
  date: string // ISO date of compiled release
  status: string
  amount: number | null
  currency: string
  tenderStart: string
  tenderEnd: string
}

export type OcdsSummary = {
  total: number
  buyers: number
  withValue: number
  years: { year: string; value: number }[]
  topBuyers: { buyer: string; count: number }[]
  periodStart: string
  periodEnd: string
  stale: boolean
}

type OcdsRecord = {
  ocid?: string
  date?: string
  buyer?: { name?: string }
  tender?: {
    title?: string
    status?: string
    value?: { amount?: number; currency?: string }
    tenderPeriod?: { startDate?: string; endDate?: string }
  }
}

function toTender(r: OcdsRecord): OcdsTender | null {
  const title = r?.tender?.title?.trim()
  if (!title) return null
  const amount = Number(r?.tender?.value?.amount)
  return {
    ocid: String(r.ocid ?? ''),
    title,
    buyer: String(r?.buyer?.name ?? 'Unknown buyer'),
    date: String(r.date ?? '').slice(0, 10),
    status: String(r?.tender?.status ?? 'unknown'),
    amount: Number.isFinite(amount) && amount > 0 ? amount : null,
    currency: String(r?.tender?.value?.currency ?? 'NPR'),
    tenderStart: String(r?.tender?.tenderPeriod?.startDate ?? '').slice(0, 10),
    tenderEnd: String(r?.tender?.tenderPeriod?.endDate ?? '').slice(0, 10),
  }
}

/** Downloads + parses the full OCDS JSONL archive (cached 24h). Returns [] on any failure. */
export async function fetchOcdsTenders(): Promise<OcdsTender[]> {
  try {
    const res = await fetch(OCDS_FULL_URL, {
      headers: { 'User-Agent': 'Drishti-Nepal-Accountability-Dashboard/1.0' },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return []
    const buf = Buffer.from(await res.arrayBuffer())
    // Fastly serves the .gz as a file download (no content-encoding), so gunzip manually.
    const text =
      buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b
        ? gunzipSync(buf).toString('utf-8')
        : buf.toString('utf-8')
    const out: OcdsTender[] = []
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const t = toTender(JSON.parse(trimmed) as OcdsRecord)
        if (t) out.push(t)
      } catch {
        // skip malformed lines - archive is append-only third-party data
      }
    }
    return out
  } catch {
    return []
  }
}

/** Aggregate stats for hero cards + charts. */
export function summarizeOcds(tenders: OcdsTender[]): OcdsSummary | null {
  if (!tenders.length) return null
  const buyerCounts = new Map<string, number>()
  const yearCounts = new Map<string, number>()
  let withValue = 0
  let min = ''
  let max = ''
  for (const t of tenders) {
    buyerCounts.set(t.buyer, (buyerCounts.get(t.buyer) ?? 0) + 1)
    const y = t.date.slice(0, 4)
    if (/^\d{4}$/.test(y)) yearCounts.set(y, (yearCounts.get(y) ?? 0) + 1)
    if (t.amount != null) withValue++
    if (t.date) {
      if (!min || t.date < min) min = t.date
      if (!max || t.date > max) max = t.date
    }
  }
  return {
    total: tenders.length,
    buyers: buyerCounts.size,
    withValue,
    years: [...yearCounts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, value]) => ({ year, value })),
    topBuyers: [...buyerCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([buyer, count]) => ({ buyer, count })),
    periodStart: min,
    periodEnd: max,
    stale: true, // e-GP mirror ends 2018; live feed pending bolpatra recovery
  }
}
