// Adaptive relative time: minutes → hours → days → months → years.
// Shared by environment surfaces so "141 days ago" reads as "4 months ago".

export function timeAgo(iso: string | number): string {  const t = typeof iso === 'number' ? iso : Date.parse(iso)
  if (!t || Number.isNaN(t)) return ''
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.round(days / 30.44)
  if (months < 12) return `${months}mo ago`
  const years = Math.round(days / 365.25)
  return `${years}y ago`
}

/** Weekday label for a DHM forecast day number (1-based, day 1 = base date). *  Base defaults to today; pass the forecast issue datetime when known.
 *  Returns e.g. "Tue 14". Falls back to `Day N` on bad input. */
export function forecastDayLabel(dayNum: number, baseIso?: string): string {
  const base = baseIso ? Date.parse(baseIso) : Date.now()
  if (Number.isNaN(base)) return `Day ${dayNum}`
  const t = new Date(base + (Math.max(1, dayNum) - 1) * 86400000)
  const wd = t.toLocaleDateString('en-NP', { weekday: 'short' })
  return `${wd} ${t.getDate()}`
}

/** Daytime in Kathmandu (approx 6:00–18:00 NPT). */export function isNptDay(now = new Date()): boolean {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kathmandu' }).format(now),
  )
  return hour >= 6 && hour < 18
}

/** Precise day/night from a station's "5:58:16 AM" / "5:39:37 PM" NPT strings.
 *  Falls back to the 6–18 approximation on unparseable input. */
export function isDayBySun(sunrise: string | undefined, sunset: string | undefined, now = new Date()): boolean {
  const toMin = (s: string): number | null => {
    const m = s.match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)/i)
    if (!m) return null
    let h = Number(m[1]) % 12
    if (/pm/i.test(m[4])) h += 12
    return h * 60 + Number(m[2])
  }
  if (!sunrise || !sunset) return isNptDay(now)
  const rise = toMin(sunrise)
  const set = toMin(sunset)
  if (rise == null || set == null) return isNptDay(now)
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', minute: 'numeric', hour12: false, timeZone: 'Asia/Kathmandu',
  }).formatToParts(now)
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value ?? 0)
  const mins = (get('hour') % 24) * 60 + get('minute')
  return mins >= rise && mins < set
}

/** "5:58:16 AM" → "5:58 AM" for display. */
export function shortClock(s: string | undefined): string {
  if (!s) return ''
  const m = s.match(/(\d+):(\d+)(?::\d+)?\s*(AM|PM)/i)
  return m ? `${m[1]}:${m[2]} ${m[3].toUpperCase()}` : s
}
