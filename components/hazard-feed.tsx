'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, Flame, TriangleAlert } from 'lucide-react'
import type { BipadIncident, BipadAlert } from '@/lib/bipad'
import { timeAgo } from '@/lib/time'

type Item = {
  key: string
  kind: 'incident' | 'alert'
  title: string
  when: string
  dist: string
  raw: BipadIncident | BipadAlert
}

function toItems(
  incidents: BipadIncident[],
  alerts: BipadAlert[],
  distances?: Record<string, number>,
): Item[] {
  const items: Item[] = []
  for (const inc of incidents) {
    const km = distances?.[`i${inc.id}`]
    items.push({
      key: `i${inc.id}`,
      kind: 'incident',
      title: inc.title,
      when: inc.createdOn ?? '',
      dist: km != null ? ` · ${Math.round(km)} km away` : '',
      raw: inc,
    })
  }
  for (const a of alerts) {
    const km = distances?.[`a${a.id}`]
    items.push({
      key: `a${a.id}`,
      kind: 'alert',
      title: a.title,
      when: a.createdOn ?? '',
      dist: km != null ? ` · ${Math.round(km)} km away` : '',
      raw: a,
    })
  }
  // Latest first — the API returns oldest-mixed order, so sort client-side.
  return items.sort((x, y) => (y.when ? Date.parse(y.when) : 0) - (x.when ? Date.parse(x.when) : 0))
}

function str(v: unknown): string {
  return typeof v === 'string' && v.trim() ? v : ''
}

/** Newest-first, expandable incident/alert feed with "show older" paging. */
export function HazardFeed({
  incidents,
  alerts,
  distances,
  initial = 5,
}: {
  incidents: BipadIncident[]
  alerts: BipadAlert[]
  distances?: Record<string, number>
  initial?: number
}) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const items = useMemo(() => toItems(incidents, alerts, distances), [incidents, alerts, distances])
  const visible = expanded ? items : items.slice(0, initial)

  if (!items.length) return null

  return (
    <div>
      {visible.map(it => {
        const open = openKey === it.key
        const r = it.raw as Record<string, unknown>
        const desc = str(r.description) || str(r.titleNe)
        const meta: [string, string][] = [
          ['Reported', it.when ? new Date(it.when).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' }) : ''],
          ['Cause', str(r.cause)],
          ['Hazard', str((r.hazard as Record<string, unknown> | null)?.title ?? r.event)],
          ['Source', str((r.source as Record<string, unknown> | null)?.title ?? r.dataSource)],
          ['Verified', r.verified === true ? 'Yes' : r.verified === false ? 'No' : ''],
          ['Wards', Array.isArray(r.wards) ? `${(r.wards as unknown[]).length} ward${(r.wards as unknown[]).length === 1 ? '' : 's'}` : ''],
        ].filter(([, v]) => v) as [string, string][]
        return (
          <div key={it.key} className="signal" style={{ cursor: 'pointer', alignItems: 'flex-start' }} onClick={() => setOpenKey(open ? null : it.key)}>
            {it.kind === 'incident'
              ? <Flame size={15} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '.15rem' }} />
              : <TriangleAlert size={15} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: '.15rem' }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>{it.title}</strong>
              <p>{it.when ? timeAgo(it.when) : ''}{it.dist}</p>
              {open && (
                <div style={{ marginTop: '.5rem', padding: '.6rem .7rem', background: 'var(--bg-sunken)', borderRadius: 8 }} onClick={e => e.stopPropagation()}>
                  {desc && <p style={{ margin: '0 0 .5rem', fontSize: '.7rem', color: 'var(--text)', lineHeight: 1.55 }}>{desc}</p>}
                  {meta.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '.2rem .8rem', fontSize: '.66rem' }}>
                      {meta.map(([k, v]) => (
                        <span key={k} style={{ display: 'contents' }}>
                          <span style={{ color: 'var(--text-tertiary)' }}>{k}</span>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{v}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {!desc && !meta.length && <p style={{ margin: 0, fontSize: '.66rem', color: 'var(--text-tertiary)' }}>No further details published for this record.</p>}
                </div>
              )}
            </div>
            <ChevronDown size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: '.2rem', transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
          </div>
        )
      })}
      {items.length > initial && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ marginTop: '.5rem', color: 'var(--accent)', fontSize: '.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '.25rem' }}
        >
          {expanded ? 'Show less' : `Show older (${items.length - initial} more)`}
          <ChevronDown size={13} style={{ transform: expanded ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
        </button>
      )}
    </div>
  )
}
