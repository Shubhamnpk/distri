// Adaptive relative time: minutes → hours → days → months → years.
// Shared by environment surfaces so "141 days ago" reads as "4 months ago".

export function timeAgo(iso: string | number): string {
  const t = typeof iso === 'number' ? iso : Date.parse(iso)
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
