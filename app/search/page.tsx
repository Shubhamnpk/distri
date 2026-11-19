'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { Building2, Compass, Database, FileText, Landmark, MapPin, Search, TrendingUp, X } from 'lucide-react'
import { companies, projects, companySlug, projectSlug, sources } from '@/lib/data'
import { DISTRICTS, LOCAL_UNITS, PROVINCES } from '@/lib/geo-constants'

type Kind = 'company' | 'project' | 'province' | 'district' | 'palika' | 'stock' | 'dataset' | 'source'
type FilterKind = Kind | 'all'

type Hit = {
  id: string
  kind: Kind
  label: string
  sub: string
  href: string
  terms?: string
  external?: boolean
  stock?: { price: string; change: string; turnover: string; positive: boolean }
}

const KIND_ICON: Record<Kind, React.ReactNode> = {
  company: <Building2 size={14} />,
  project: <Compass size={14} />,
  province: <Landmark size={14} />,
  district: <MapPin size={14} />,
  palika: <MapPin size={14} />,
  stock: <TrendingUp size={14} />,
  dataset: <Database size={14} />,
  source: <FileText size={14} />,
}

const KIND_LABEL: Record<Kind, string> = {
  company: 'Company',
  project: 'Project',
  province: 'Province',
  district: 'District',
  palika: 'Local unit',
  stock: 'NEPSE security',
  dataset: 'Dataset',
  source: 'Source',
}

const TABS: { key: FilterKind; label: string }[] = [
  { key: 'all', label: 'Everything' },
  { key: 'province', label: 'Provinces' },
  { key: 'district', label: 'Districts' },
  { key: 'palika', label: 'Palikas' },
  { key: 'stock', label: 'Stocks' },
  { key: 'company', label: 'Companies' },
  { key: 'project', label: 'Projects' },
  { key: 'dataset', label: 'Datasets' },
  { key: 'source', label: 'Sources' },
]

function normalize(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function scoreHit(hit: Hit, query: string): number {
  const label = normalize(hit.label)
  const terms = normalize(`${hit.terms ?? ''} ${hit.sub}`)
  const searchable = `${label} ${terms}`
  if (label === query) return 130
  if (label.startsWith(query)) return 115
  if (label.split(' ').some(word => word.startsWith(query))) return 100
  if (label.includes(query)) return 90
  const words = query.split(' ').filter(Boolean)
  if (words.length > 1 && words.every(word => searchable.includes(word))) return 75
  if (terms.includes(query)) return 65
  return 0
}

export default function SearchPage() {
  return (
    <Suspense fallback={<main className="content-wrap"><p className="muted">Loading search…</p></main>}>
      <SearchInner />
    </Suspense>
  )
}

function SearchInner() {
  const sp = useSearchParams()
  const [q, setQ] = useState(sp.get('q') ?? '')
  const [tab, setTab] = useState<FilterKind>('all')
  const [remoteHits, setRemoteHits] = useState<Hit[]>([])
  const [searching, setSearching] = useState(false)

  const index = useMemo(() => {
    const districtByName = new Map(DISTRICTS.map(d => [d.name, d]))
    const out: Hit[] = []
    for (const p of PROVINCES) {
      out.push({ id: `province:${p.slug}`, kind: 'province', label: p.name, sub: 'Federal province of Nepal', href: `/provinces/${p.slug}` })
    }
    for (const d of DISTRICTS) {
      out.push({ id: `district:${d.slug}`, kind: 'district', label: d.name, sub: `${d.province} Province · District`, href: `/districts/${d.slug}` })
    }
    for (const u of LOCAL_UNITS) {
      const district = districtByName.get(u.district)
      if (!district) continue
      out.push({
        id: `palika:${district.slug}:${u.slug}`,
        kind: 'palika',
        label: u.name,
        sub: `${u.district} · ${u.province} · ${u.kind.replace(/_/g, ' ')}`,
        terms: `${u.slug.replace(/-/g, ' ')} local unit municipality rural municipality palika`,
        href: `/districts/${district.slug}/${u.slug}`,
      })
    }
    for (const c of companies) {
      out.push({
        id: `company:${companySlug(c)}`,
        kind: 'company',
        label: c.name,
        sub: c.sector,
        terms: `${c.ownership ?? ''} ${c.operatingStatus} ${c.note}`,
        href: `/companies/${companySlug(c)}`,
      })
    }
    for (const p of projects) {
      out.push({
        id: `project:${projectSlug(p)}`,
        kind: 'project',
        label: p.name,
        sub: `${p.location} · ${p.category} · ${p.status}`,
        terms: `${p.ministry} ${p.description ?? ''} ${p.source}`,
        href: `/projects/${projectSlug(p)}`,
      })
    }
    for (const source of sources) {
      out.push({
        id: `source:${source.title}:${source.url}`,
        kind: 'source',
        label: source.title,
        sub: `${source.publisher} · ${source.type} · ${source.date}`,
        href: source.url,
        terms: `${source.publisher} ${source.type} ${source.url}`,
        external: true,
      })
    }
    return out
  }, [])

  useEffect(() => {
    const query = q.trim()
    if (normalize(query).length < 2) {
      setRemoteHits([])
      setSearching(false)
      return
    }

    const controller = new AbortController()
    setSearching(true)
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        if (!response.ok) throw new Error('Search service unavailable')
        const data = await response.json() as { hits?: Hit[] }
        setRemoteHits(data.hits ?? [])
      } catch {
        if (!controller.signal.aborted) setRemoteHits([])
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [q])

  const results = useMemo(() => {
    const query = normalize(q)
    if (!query) return []
    const combined = new Map<string, Hit>()
    for (const hit of [...index, ...remoteHits]) {
      if (tab !== 'all' && hit.kind !== tab) continue
      const score = scoreHit(hit, query)
      if (score > 0) combined.set(hit.id, hit)
    }
    return [...combined.values()]
      .sort((a, b) => scoreHit(b, query) - scoreHit(a, query) || a.label.localeCompare(b.label))
      .slice(0, 80)
  }, [index, q, remoteHits, tab])

  const query = q.trim()

  return (
    <main className="content-wrap">
      <section className="search-hero">
        <p className="eyebrow">Nepal data search</p>
        <h1>Find anything</h1>
        <p className="lede">Search all provinces, districts, palikas, NEPSE securities, companies, projects, datasets and source records.</p>
        <label className="search search-page-input">
          <Search size={18} />
          <input
            autoFocus
            aria-label="Search Nepal data"
            placeholder="Try Kathmandu, NABIL, hydropower, census…"
            value={q}
            onChange={event => setQ(event.target.value)}
          />
          {q && (
            <button type="button" className="search-clear" onClick={() => setQ('')} aria-label="Clear search">
              <X size={15} />
            </button>
          )}
        </label>
        <div className="districts-chips search-tabs">
          {TABS.map(item => (
            <button key={item.key} type="button" className={tab === item.key ? 'is-active' : ''} onClick={() => setTab(item.key)}>
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {!query ? (
        <section className="search-empty">
          <h2 className="eyebrow">Try a search</h2>
          <div className="districts-chips">
            {['Kathmandu', 'Pokhara', 'NABIL', 'NEA', 'hydropower', 'census'].map(name => (
              <button key={name} type="button" onClick={() => setQ(name)}>{name}</button>
            ))}
          </div>
        </section>
      ) : (
        <section className="search-results">
          <p className="muted search-count">
            {results.length} result{results.length === 1 ? '' : 's'}{searching ? ' · checking live stocks and datasets…' : ''}
          </p>
          {results.length === 0 ? (
            <p className="muted" style={{ padding: '1.5rem 0' }}>
              {searching ? 'Searching Nepal data…' : `Nothing matches “${query}”. Try a company symbol, district, palika or project keyword.`}
            </p>
          ) : (
            <ul>
              {results.map(hit => {
                const resultClassName = `search-result${hit.stock ? ' has-stock' : ''}`
                const content = (
                  <>
                    <span className={`search-kind kind-${hit.kind}`}>{KIND_ICON[hit.kind]}{KIND_LABEL[hit.kind]}</span>
                    <span className="search-result-main">
                      <strong>{hit.label}</strong>
                      <small>{hit.sub}</small>
                    </span>
                    {hit.stock && (
                      <span className="search-result-stock" aria-label={`Latest price ${hit.stock.price}, daily change ${hit.stock.change}, turnover ${hit.stock.turnover}`}>
                        <strong>{hit.stock.price}</strong>
                        <span className={hit.stock.positive ? 'is-positive' : 'is-negative'}>{hit.stock.change} today</span>
                        <small>Turnover {hit.stock.turnover}</small>
                      </span>
                    )}
                  </>
                )
                return (
                  <li key={hit.id}>
                    {hit.external
                      ? <a href={hit.href} target="_blank" rel="noreferrer" className={resultClassName}>{content}</a>
                      : <Link href={hit.href} className={resultClassName}>{content}</Link>}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
    </main>
  )
}
