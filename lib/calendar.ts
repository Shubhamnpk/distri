// Bikram Sambat calendar engine (via nepali-date-converter, same lib as MyWallet).
// Month grids are derived day-by-day from real conversions — no hardcoded
// month lengths (BS months are 29–32 days and shift yearly).

import NepaliDate from 'nepali-date-converter'

export const BS_MONTHS_EN = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
]

export const BS_MONTHS_NE = [
  'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज',
  'कात्तिक', 'मंसिर', 'पुस', 'माघ', 'फागुन', 'चैत',
]

export const BS_WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export type BsDate = { y: number; m: number; d: number } // m: 0-indexed

export function bsToday(): BsDate {
  const n = new NepaliDate(new Date())
  return { y: n.getYear(), m: n.getMonth(), d: n.getDate() }
}

export type CalDay = {
  ad: Date
  bsD: number
  inMonth: boolean
  /** Saturday + Sunday — two-day weekend since April 2026 */
  weekend: boolean
  /** NEPSE trades Monday–Friday since April 2026 */
  nepseOpen: boolean
  isToday: boolean
}

/** 6×7 grid for a BS month (Nepali weeks start Sunday). */
export function bsMonthGrid(bsY: number, bsM: number): CalDay[][] {
  const firstAd = new NepaliDate(bsY, bsM, 1).toJsDate()
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
  const cursor = new Date(firstAd)
  cursor.setDate(cursor.getDate() - cursor.getDay()) // back to Sunday
  const weeks: CalDay[][] = []
  for (let w = 0; w < 6; w++) {
    const week: CalDay[] = []
    for (let i = 0; i < 7; i++) {
      const ad = new Date(cursor)
      let bsD = 0
      try {
        const n = new NepaliDate(ad)
        bsD = n.getYear() === bsY && n.getMonth() === bsM ? n.getDate() : 0
      } catch {
        bsD = 0
      }
      week.push({
        ad,
        bsD,
        inMonth: bsD > 0,
        weekend: ad.getDay() === 6 || ad.getDay() === 0,
        nepseOpen: ad.getDay() >= 1 && ad.getDay() <= 5,
        isToday: `${ad.getFullYear()}-${ad.getMonth()}-${ad.getDate()}` === todayKey,
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
    if (w >= 3) {
      const lastWeek = weeks[w]
      const following = new Date(cursor)
      let fn: { getYear(): number; getMonth(): number } | null = null
      try {
        fn = new NepaliDate(following)
      } catch {
        fn = null
      }
      if (lastWeek.every(d => !d.inMonth) && fn && (fn.getYear() !== bsY || fn.getMonth() !== bsM)) break
    }
  }
  return weeks.filter((week, wi) => wi === 0 || week.some(d => d.inMonth))
}

/** AD range subtitle for a BS month view, e.g. "Apr 14 – May 14, 2026". */
export function bsMonthAdRange(bsY: number, bsM: number): string {
  try {
    const start = new NepaliDate(bsY, bsM, 1).toJsDate()
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const end = new Date(start)
    for (let d = 2; d <= 33; d++) {
      try {
        const n = new NepaliDate(bsY, bsM, d)
        end.setTime(n.toJsDate().getTime())
      } catch {
        break
      }
    }
    return `${fmt(start)} – ${fmt(end)}, ${start.getFullYear()}`
  } catch {
    return ''
  }
}

/** Nepal time right now, 12-hour clock: "2:45 PM". */export function nptTime12(now = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kathmandu',
  }).format(now)
}

/** Nepal date line: "Tuesday, Kartik 28, 2083 BS". */
export function nptDateLine(now = new Date()): string {
  try {
    const n = new NepaliDate(now)
    const wd = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kathmandu' })
    return `${wd}, ${BS_MONTHS_EN[n.getMonth()]} ${n.getDate()}, ${n.getYear()} BS`
  } catch {
    return ''
  }
}

/** Last day-of-month for a BS month (months run 29–32 days). */
export function bsMonthLastDay(bsY: number, bsM: number): number {
  for (let d = 32; d >= 28; d--) {
    try {
      const n = new NepaliDate(bsY, bsM, d)
      if (n.getYear() === bsY && n.getMonth() === bsM) return d
    } catch {
      // out of range — try shorter
    }
  }
  return 30
}

export type FiscalMilestone = {
  label: string
  detail: string
  bsY: number
  bsM: number
  bsD: number
  ad: Date | null
  daysUntil: number | null
}

const QUARTERS: { month: number; label: string; detail: string }[] = [
  { month: 5, label: 'Q1 ends', detail: 'First quarter closes (Shrawan–Ashwin)' },
  { month: 8, label: 'Q2 ends', detail: 'Half-year mark (Kartik–Poush)' },
  { month: 11, label: 'Q3 ends', detail: 'Nine months in (Magh–Chaitra)' },
  { month: 2, label: 'Q4 ends · fiscal year closes', detail: 'Full year wraps (Baisakh–Ashadh)' },
  { month: 3, label: 'New fiscal year begins', detail: 'Shrawan 1 — budgets take effect' },
]

/** Next fiscal milestones from today (quarter ends + year bounds), soonest first. */
export function nextFiscalMilestones(count = 4): FiscalMilestone[] {
  const t = bsToday()
  const out: FiscalMilestone[] = []
  for (let step = 0; step < 24 && out.length < count; step++) {
    const m = (t.m + step) % 12
    const y = t.y + Math.floor((t.m + step) / 12)
    const q = QUARTERS.find(q => q.month === m)
    if (!q) continue
    const d = q.month === 3 ? 1 : bsMonthLastDay(y, m)
    if (step === 0 && d <= t.d) continue
    let ad: Date | null = null
    try {
      ad = new NepaliDate(y, m, d).toJsDate()
    } catch {
      ad = null
    }
    const daysUntil = ad ? Math.round((new Date(ad.getFullYear(), ad.getMonth(), ad.getDate()).getTime() - new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime()) / 86400000) : null
    out.push({ label: q.label, detail: q.detail, bsY: y, bsM: m, bsD: d, ad, daysUntil })
  }
  return out
}

/** "Q1 ends" style label when a BS month closes a quarter, else null. */
export function quarterEndLabel(bsM: number): string | null {
  if (bsM === 5) return 'Q1 ends'
  if (bsM === 8) return 'Q2 ends'
  if (bsM === 11) return 'Q3 ends'
  if (bsM === 2) return 'Q4 ends'
  return null
}
