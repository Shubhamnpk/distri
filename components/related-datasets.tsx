'use client'

import { useEffect, useState } from 'react'
import { Database, ExternalLink, Search } from 'lucide-react'
import { searchDatasets } from '@/lib/opendatanepal'
import type { CkanDataset } from '@/lib/types'

export function RelatedDatasets({ query, title }: { query: string; title?: string }) {
  const [datasets, setDatasets] = useState<CkanDataset[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const res = await searchDatasets(query, 3)
        if (!cancelled) setDatasets(res)
      } catch {
        if (!cancelled) setDatasets([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (query) load()
    return () => { cancelled = true }
  }, [query])

  if (loading) {
    return (
      <div style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1rem' }}>
        <span style={{ fontSize: '.72rem', color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: '.3rem' }}><Search size={13} /> Finding datasets for “{query}” …</span>
      </div>
    )
  }

  if (!datasets.length) {
    return (
      <div style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1rem' }}>
        <strong style={{ display: 'block', fontSize: '.78rem' }}>{title ?? 'Open Data Nepal'}</strong>
        <p style={{ margin: '.3rem 0 0', fontSize: '.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          No direct datasets for “{query}”. Explore the portal for broader {query.toLowerCase()} data.
        </p>
        <a href={`https://opendatanepal.com/dataset?query=${encodeURIComponent(query)}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', marginTop: '.5rem', fontSize: '.68rem', fontWeight: 600, color: 'var(--primary)' }}>
          Search portal <ExternalLink size={12} />
        </a>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1rem', boxShadow: 'var(--shadow-sm)' }}>
      <strong style={{ display: 'block', fontSize: '.78rem', marginBottom: '.5rem' }}>{title ?? `Datasets: ${query}`}</strong>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        {datasets.map(d => (
          <a key={d.name} href={`https://opendatanepal.com/dataset/${d.name}`} target="_blank" rel="noreferrer" style={{ display: 'flex', gap: '.6rem', padding: '.6rem', background: 'var(--bg-sunken)', borderRadius: 8, textDecoration: 'none', color: 'inherit' }}>
            <span style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--primary-50)', color: 'var(--primary)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Database size={14} /></span>
            <span style={{ minWidth: 0 }}>
              <strong style={{ display: 'block', fontSize: '.74rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</strong>
              <span style={{ display: 'block', fontSize: '.64rem', color: 'var(--text-tertiary)', marginTop: '.1rem' }}>{d.organization?.title ?? 'Open Data Nepal'} · {d.resources?.length ?? 0} resources</span>
            </span>
            <ExternalLink size={12} style={{ marginLeft: 'auto', color: 'var(--text-tertiary)', flexShrink: 0, alignSelf: 'center' }} />
          </a>
        ))}
      </div>
      <a href={`https://opendatanepal.com/dataset?query=${encodeURIComponent(query)}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', marginTop: '.6rem', fontSize: '.68rem', fontWeight: 600, color: 'var(--primary)' }}>
        View all for “{query}” <ExternalLink size={12} />
      </a>
    </div>
  )
}
