import { ArrowUpRight } from 'lucide-react'

export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'On track' ||
    status === 'Done' ||
    status === 'Completed' ||
    status === 'Operating'
      ? 'status-good'
      : status === 'At risk' ||
          status === 'Active' ||
            status === 'Closed'
        ? 'status-warn'
        : 'status-bad'

  return (
    <span className={`status-badge ${cls}`}>
      <span className="status-dot" />
      {status}
    </span>
  )
}

export function SectionHeading({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="section-heading">
      <div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>
      {action && <button className="text-button" onClick={onAction}>{action}<ArrowUpRight size={14} /></button>}
    </div>
  )
}
