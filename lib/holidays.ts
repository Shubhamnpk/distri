// Public holidays + observances from the official MOHA Rajpatra notice,
// via @lacspace/nepal-holidays (transcribed, weekday-verified).
// Only BS years the package covers yield data (currently [2083]) —
// other years simply show no holiday dots, never guessed ones.

import { holidays, upcoming, adToBS } from '@lacspace/nepal-holidays'

export type DayHoliday = {
  bsY: number
  bsM: number // 0-indexed
  bsD: number
  ad: Date
  nameEn: string
  kind: 'public-holiday' | 'observance'
  scope: string
}

function splitBs(bs: string): { y: number; m: number; d: number } | null {
  const m = bs.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!m) return null
  return { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) }
}

function atMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Every dated holiday/observance of a BS year, multi-day blocks expanded per day. */
export function yearHolidays(bsY: number): DayHoliday[] {
  let rows: ReturnType<typeof holidays> = []
  try {
    rows = holidays(bsY)
  } catch {
    return []
  }
  const out: DayHoliday[] = []
  for (const h of rows) {
    if (!h.dateAD) continue
    const start = new Date(`${h.dateAD}T00:00:00`)
    if (Number.isNaN(start.getTime())) continue
    const days = Math.max(1, h.days || 1)
    for (let i = 0; i < days; i++) {
      const ad = new Date(start)
      ad.setDate(ad.getDate() + i)
      const bs = adToBS(ad)
      const parts = typeof bs === 'string' ? splitBs(bs) : null
      if (!parts) continue
      out.push({
        bsY: parts.y, bsM: parts.m, bsD: parts.d,
        ad: atMidnight(ad),
        nameEn: h.name.en,
        kind: h.kind,
        scope: h.scope,
      })
    }
  }
  return out.sort((a, b) => a.ad.getTime() - b.ad.getTime())
}

/** Next dated holidays on/after today (any scope), soonest first. */
export function upcomingHolidays(n = 6): DayHoliday[] {
  let rows: ReturnType<typeof upcoming> = []
  try {
    rows = upcoming(undefined, 60)
  } catch {
    return []
  }
  const out: DayHoliday[] = []
  for (const h of rows) {
    if (!h.dateAD) continue
    const ad = atMidnight(new Date(`${h.dateAD}T00:00:00`))
    if (Number.isNaN(ad.getTime())) continue
    const bs = adToBS(ad)
    const parts = typeof bs === 'string' ? splitBs(bs) : null
    if (!parts) continue
    out.push({ bsY: parts.y, bsM: parts.m, bsD: parts.d, ad, nameEn: h.name.en, kind: h.kind, scope: h.scope })
    if (out.length >= n) break
  }
  return out
}
