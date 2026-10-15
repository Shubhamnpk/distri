// IPO pipeline → calendar events (open/close dates from yonepse date ranges
// like "11th - 25th Kartik, 2083"). Unparseable rows are skipped, never guessed.

import NepaliDate from 'nepali-date-converter'
import type { NepseUpcomingIpo } from './nepse'

const BS_MONTH_INDEX: Record<string, number> = {
  baisakh: 0, jestha: 1, jeth: 1, ashadh: 2, asar: 2, shrawan: 3, sawan: 3,
  bhadra: 4, bhadau: 4, ashwin: 5, aswin: 5, kartik: 6, katik: 6,
  mangsir: 7, mansir: 7, poush: 8, push: 8, magh: 9,
  falgun: 10, fagun: 10, chaitra: 11, chait: 11,
}

export type IpoEvent = {
  company: string
  units: string
  /** 'Locals' (project-affected) vs 'General' (public) tranche — same company,
   *  same window, two distinct offers. Detected from the announcement text. */
  tranche: string
  open: { y: number; m: number; d: number }
  close: { y: number; m: number; d: number }
  announcement: string
}

function bsYearOfAnnouncement(announcement: string): number | null {
  const t = Date.parse(announcement)
  if (Number.isNaN(t)) return null
  try {
    return new NepaliDate(new Date(t)).getYear()
  } catch {
    return null
  }
}

export function parseIpoEvents(ipos: NepseUpcomingIpo[]): IpoEvent[] {
  const out: IpoEvent[] = []
  for (const ipo of ipos) {
    const m = (ipo.date_range ?? '').match(/(\d+)\w*\s*-\s*(\d+)\w*\s+([A-Za-z]+)(?:,?\s*(\d{4}))?/)
    if (!m) continue
    const mi = BS_MONTH_INDEX[m[3].toLowerCase().replace(/[^a-z]/g, '')]
    if (mi == null) continue
    const year = m[4] ? Number(m[4]) : bsYearOfAnnouncement(ipo.announcement_date ?? '')
    const from = Number(m[1])
    const to = Number(m[2])
    if (!year || from < 1 || to < 1 || to > 32) continue
    const text = String((ipo as Record<string, unknown>).full_text ?? '')
    const tranche = /general\s*public/i.test(text)
      ? 'General'
      : /local|affected|resident|project/i.test(text)
        ? 'Locals'
        : ''
    out.push({
      company: ipo.company,
      units: ipo.units,
      tranche,
      open: { y: year, m: mi, d: from },
      close: { y: year, m: mi, d: to },
      announcement: ipo.announcement_date,
    })
  }
  return out
}

/** BS date → AD Date (for countdowns + calendar keys), null when out of range. */
export function bsToAd(y: number, m: number, d: number): Date | null {
  try {
    return new NepaliDate(y, m, d).toJsDate()
  } catch {
    return null
  }
}

/** Days from today to an AD date (negative = past). */
export function daysUntil(ad: Date | null): number | null {
  if (!ad) return null
  const now = new Date()
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const b = new Date(ad.getFullYear(), ad.getMonth(), ad.getDate()).getTime()
  return Math.round((b - a) / 86400000)
}
