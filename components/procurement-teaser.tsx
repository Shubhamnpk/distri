'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, ScrollText } from 'lucide-react'
import type { OcdsSummary } from '@/lib/ocds'

export function ProcurementTeaser() {
  const [summary, setSummary] = useState<OcdsSummary | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/procurement-summary')
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (!cancelled && j?.ok) setSummary(j.summary as OcdsSummary)
      })
      .catch(() => {
        // silent - teaser is supplemental
      })
    return () => { cancelled = true }
  }, [])

  return (
    <section className="panel" style={{ marginBottom: '.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.9rem', flexWrap: 'wrap' }}>
        <div className="bg-primary-50 rounded-[12px]" style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <ScrollText size={20} className="text-primary" />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <p className="eyebrow" style={{ margin: 0 }}>PUBLIC PROCUREMENT · ARCHIVE</p>
          <strong style={{ fontSize: '.95rem', letterSpacing: '-.02em' }}>
            {summary ? `${summary.total.toLocaleString()} tenders from ${summary.buyers.toLocaleString()} offices` : 'Tender archive'}
          </strong>
          <p className="text-secondary" style={{ margin: '.15rem 0 0', fontSize: '.68rem' }}>
            {summary
              ? `${summary.periodStart.slice(0, 4)}-${summary.periodEnd.slice(0, 4)} e-GP mirror · busiest: ${summary.topBuyers[0]?.buyer ?? '-'} · searchable by work, office, OCID`
              : 'Loading the e-GP mirror…'}
          </p>
        </div>
        <Link href="/procurement" className="outline-button" style={{ textDecoration: 'none' }}>
          Explore archive <ArrowUpRight size={14} />
        </Link>
      </div>
    </section>
  )
}
