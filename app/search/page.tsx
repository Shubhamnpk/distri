'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useMemo, useState } from 'react'
import { Building2, Compass, Landmark, MapPin, Search, X } from 'lucide-react'
import { companies, projects, companySlug, projectSlug } from '@/lib/data'
import { DISTRICTS, LOCAL_UNITS, PROVINCES } from '@/lib/geo-constants'

type Kind = 'company' | 'project' | 'province' | 'district' | 'palika'

type Hit = { id: string; kind: Kind; label: string; sub: string; href: string }

const KIND_ICON: Record<Kind, React.ReactNode> = {
  company: <Building2 size={14} />,
  project: <Compass size={14} />,
  province: <Landmark size={14} />,
  district: <MapPin size={14} />,
  palika: <MapPin size={14} />,
}

const KIND_LABEL: Record<Kind, string> = {
  company: 'Company',
  project: 'Project',
  province: 'Province',
  district: 'District',
  palika: 'Local unit',
}

const TABS: { key: Kind | 'all'; label: string }[] = [
  { key: 'all', label: 'Everything' },
  { key: 'province', label: 'Provinces' },
  { key: 'district', label: 'Districts' },
  { key: 'palika', label: 'Local units' },
  { key: 'company', label: 'Companies' },
  { key: 'project', label: 'Projects' },
]

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
  const [tab, setTab] = useState<Kind | 'all'>('all')

  const index = useMemo(() => {
    const districtSlugByName = new Map(DISTRICTS.map(d => [d.name, d.slug]))
    const out: Hit[] = []
    for (const p of PROVINCES) out.push({ id: `pr:${p.slug}`, kind: 'province', label: p.name, sub: 'Province · Federal Nepal', href: `/provinces/${p.slug}` })
    for (const d of DISTRICTS) out.push({ id: `d:${d.slug}`, kind: 'district', label: d.name, sub: `${d.province} Province · District`, href: `/districts/${d.slug}` })
    for (const u of LOCAL_UNITS) {
      const ds = districtSlugByName.get(u.district)
      if (!ds) continue
      out.push({ id: `p:${u.slug}`, kind: 'palika', label: u.name, sub: `${u.district} · ${u.kind.replace(/_/g, ' ')}`, href: `/districts/${ds}/${u.slug}` })
    }
    for (const c of companies) out.push({ id: `c:${companySlug(c)}`, kind: 'company', label: c.name, sub: c.sector, href: `/companies/${companySlug(c)}` })
    for (const p of projects) out.push({ id: `j:${projectSlug(p)}`, kind: 'project', label: p.name, sub: p.location, href: `/projects/${projectSlug(p)}` })
    return out
  }, [])

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return []
    const scored: { hit: Hit; score: number }[] = []
    for (const hit of index) {
      if (tab !== 'all' && hit.kind !== tab) continue
      const label = hit.label.toLowerCase()
      const sub = hit.sub.toLowerCase()
      let score = 0
      if (label === needle) score = 100
      else if (label.startsWith(needle)) score = 80
      else if (label.includes(needle)) score = 60
      else if (sub.includes(needle)) score = 30
      if (score) scored.push({ hit, score })
    }
    scored.sort((a, b) => b.score - a.score || a.hit.label.localeCompare(b.hit.label))
    return scored.slice(0, 60).map(s => s.hit)
  }, [q, tab, index])

  const suggestions = q.trim() ? results : []

  return (
    <main className="content-wrap">
      <section className="search-hero">
        <p className="eyebrow">Search</p>
        <h1>Find anything</h1>
        <p className="lede">Provinces, districts, local units, listed companies and public projects - all in one place.</p>
        <label className="search search-page-input">
          <Search size={18} />
          <input
            autoFocus
            aria-label="Search"
            placeholder="Try “Kathmandu”, “hydropower”, “Nepal Telecom”…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          {q && (
            <button type="button" className="search-clear" onClick={() => setQ('')} aria-label="Clear search">
              <X size={15} />
            </button>
          )}
        </label>
        <div className="districts-chips">
          {TABS.map(t => (
            <button key={t.key} type="button" className={tab === t.key ? 'is-active' : ''} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {!q.trim() ? (
        <section className="search-empty">
          <h2 className="eyebrow">Popular</h2>
          <div className="districts-chips">
            {['Kathmandu', 'Pokhara', 'Chitwan', 'Solukhumbu', 'Mustang', 'Banke'].map(name => (
              <button key={name} type="button" onClick={() => setQ(name)}>{name}</button>
            ))}
          </div>
        </section>
      ) : suggestions.length === 0 ? (
        <p className="muted" style={{ padding: '2rem 0' }}>
          Nothing matches “{q}”. Try a shorter word or a district name.
        </p>
      ) : (
        <section className="search-results">
          <p className="muted search-count">{suggestions.length} result{suggestions.length === 1 ? '' : 's'}</p>
          <ul>
            {suggestions.map(hit => (
              <li key={hit.id}>
                <Link href={hit.href} className="search-result">
                  <span className={`search-kind kind-${hit.kind}`}>{KIND_ICON[hit.kind]}{KIND_LABEL[hit.kind]}</span>
                  <span className="search-result-main">
                    <strong>{hit.label}</strong>
                    <small>{hit.sub}</small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
