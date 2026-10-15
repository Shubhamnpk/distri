'use client'

import { useMemo, useState } from 'react'
import { Search, FileText, Building2, CalendarDays } from 'lucide-react'
import { formatNpr } from '@/lib/currency'
import type { OcdsTender } from '@/lib/ocds'

const PAGE_SIZE = 60

export function ProcurementTable({ tenders }: { tenders: OcdsTender[] }) {
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q
      ? tenders.filter(t =>
          `${t.title} ${t.buyer} ${t.ocid}`.toLowerCase().includes(q)
        )
      : tenders
    return base
  }, [tenders, query])

  const shown = filtered.slice(0, visible)

  return (
    <div>
      <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '.75rem' }}>
        <label className="search" style={{ maxWidth: '320px' }}>
          <Search size={16} />
          <input
            aria-label="Search tenders"
            placeholder="Search by work, office, or OCID…"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setVisible(PAGE_SIZE)
            }}
          />
        </label>
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{ fontSize: '.72rem', fontWeight: 600, padding: '.3rem .55rem' }}
            className="text-primary bg-primary-50 rounded-[6px]"
          >
            Clear
          </button>
        )}
        <span className="muted" style={{ marginLeft: 'auto', fontSize: '.68rem' }}>
          {filtered.length.toLocaleString()} of {tenders.length.toLocaleString()} shown
        </span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ marginTop: '1.25rem', padding: '2.5rem 1.5rem', textAlign: 'center' }} className="bg-sunken rounded-lg border border-dashed border-line">
          <p style={{ margin: 0, fontWeight: 600, fontSize: '.85rem' }}>No tenders match this search.</p>
          <p className="muted" style={{ margin: '.3rem 0 0' }}>Try a road office, work type, or shorter keyword.</p>
        </div>
      ) : (
        <>
          <div className="data-table" style={{ marginTop: '.9rem' }}>
            {shown.map(t => (
              <div className="data-row" key={t.ocid} style={{ alignItems: 'start', gridTemplateColumns: '2.4fr 1fr 1.3fr .8fr' }}>
                <div className="entity">
                  <div className="entity-icon text-primary" style={{ backgroundColor: 'rgba(13,124,95,.1)' }}>
                    <FileText size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: '.78rem', lineHeight: 1.35 }}>{t.title}</strong>
                    <span className="text-tertiary" style={{ display: 'flex', alignItems: 'center', gap: '.25rem', fontSize: '.64rem', marginTop: '.2rem' }}>
                      <Building2 size={11} /> {t.buyer}
                    </span>
                  </div>
                </div>
                <div>
                  <small>Estimate</small>
                  <strong>{t.amount != null ? formatNpr(t.amount) : 'Not disclosed'}</strong>
                </div>
                <div>
                  <small>Bid window</small>
                  <strong style={{ display: 'flex', alignItems: 'center', gap: '.25rem' }}>
                    <CalendarDays size={12} className="text-tertiary" />
                    {t.tenderStart || '-'} → {t.tenderEnd || '-'}
                  </strong>
                </div>
                <div>
                  <small>Status</small>
                  <strong style={{ textTransform: 'capitalize' }}>{t.status}</strong>
                </div>
              </div>
            ))}
          </div>
          {visible < filtered.length && (
            <button
              onClick={() => setVisible(v => v + PAGE_SIZE)}
              className="outline-button"
              style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}
            >
              Show more ({(filtered.length - visible).toLocaleString()} remaining)
            </button>
          )}
        </>
      )}
    </div>
  )
}
