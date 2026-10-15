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
      <div style={{ padding: '1rem' }} className="bg-sunken border border-line-light rounded-lg">
        <span style={{ fontSize: '.72rem', display: 'inline-flex', alignItems: 'center', gap: '.3rem' }} className="text-tertiary"><Search size={13} /> Finding datasets for “{query}” …</span>
      </div>
    )
  }

  if (!datasets.length) {
    return (
      <div style={{ padding: '1rem' }} className="bg-sunken border border-line-light rounded-lg">
        <strong style={{ display: 'block', fontSize: '.78rem' }}>{title ?? 'Open Data Nepal'}</strong>
        <p style={{ margin: '.3rem 0 0', fontSize: '.72rem', lineHeight: 1.5 }} className="text-secondary">
          No direct datasets for “{query}”. Explore the portal for broader {query.toLowerCase()} data.
        </p>
        <a href={`https://opendatanepal.com/dataset?query=${encodeURIComponent(query)}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', marginTop: '.5rem', fontSize: '.68rem', fontWeight: 600 }} className="text-primary">
          Search portal <ExternalLink size={12} />
        </a>
      </div>
    )
  }

  return (
    <div style={{ padding: '1rem' }} className="bg-card border border-line-light rounded-lg shadow-sm">
      <strong style={{ display: 'block', fontSize: '.78rem', marginBottom: '.5rem' }}>{title ?? `Datasets: ${query}`}</strong>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        {datasets.map(d => (
          <a key={d.name} href={`https://opendatanepal.com/dataset/${d.name}`} target="_blank" rel="noreferrer" style={{ display: 'flex', gap: '.6rem', padding: '.6rem', textDecoration: 'none', color: 'inherit' }} className="bg-sunken rounded-[8px]">
            <span style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', flexShrink: 0 }} className="bg-primary-50 text-primary rounded-[7px]"><Database size={14} /></span>
            <span style={{ minWidth: 0 }}>
              <strong style={{ display: 'block', fontSize: '.74rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</strong>
              <span style={{ display: 'block', fontSize: '.64rem', marginTop: '.1rem' }} className="text-tertiary">{d.organization?.title ?? 'Open Data Nepal'} · {d.resources?.length ?? 0} resources</span>
            </span>
            <ExternalLink size={12} className="text-tertiary" style={{ marginLeft: 'auto', flexShrink: 0, alignSelf: 'center' }} />
          </a>
        ))}
      </div>
      <a href={`https://opendatanepal.com/dataset?query=${encodeURIComponent(query)}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', marginTop: '.6rem', fontSize: '.68rem', fontWeight: 600 }} className="text-primary">
        View all for “{query}” <ExternalLink size={12} />
      </a>
    </div>
  )
}
