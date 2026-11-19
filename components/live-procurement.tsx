'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Building2, CalendarDays, Check, Download, ExternalLink, FileText, Filter, LoaderCircle, MapPin, RefreshCw, Search, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { EgpAmendment, EgpDocument, EgpEvent, EgpNotice, EgpTender, EgpTenderDetail } from '@/lib/egp'
import { egpEventUrl, egpProjectUrl } from '@/lib/egp'
import { slugify } from '@/lib/data'

const PAGE_SIZE = 20

function formatNepalDate(value: string | null | undefined) {
  if (!value) return 'Date not listed'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Date not listed'
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kathmandu', day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(date)
}

function formatUpdatedAt(iso: string) {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return iso
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kathmandu', day: 'numeric', month: 'short',
    hour: 'numeric', minute: '2-digit',
  }).format(date)
}

function daysUntil(deadline: string | null | undefined): number | null {
  if (!deadline) return null
  const ms = new Date(deadline).getTime() - Date.now()
  if (!Number.isFinite(ms)) return null
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

function DeadlinePill({ deadline }: { deadline: string | null | undefined }) {
  const days = daysUntil(deadline)
  if (days === null) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '.25rem',
        padding: '.18rem .5rem', borderRadius: 99, fontSize: '.6rem', fontWeight: 600,
        background: 'var(--bg-sunken)', color: 'var(--text-tertiary)',
      }}>
        <CalendarDays size={9} /> No deadline
      </span>
    )
  }
  const urgent = days < 7
  const soon = days < 30
  const bg = urgent ? 'rgba(220,38,38,.12)' : soon ? 'rgba(217,119,6,.12)' : 'rgba(22,163,74,.12)'
  const color = urgent ? '#dc2626' : soon ? '#d97706' : '#16a34a'
  const label = urgent ? `${days}d - Urgent` : soon ? `${days}d` : `${days}d`
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '.25rem',
      padding: '.18rem .5rem', borderRadius: 99, fontSize: '.6rem', fontWeight: 600,
      background: bg, color,
    }}>
      <CalendarDays size={9} /> {label}
    </span>
  )
}

function CategoryBadge({ category }: { category: string | null | undefined }) {
  if (!category) return null
  const c = category.toLowerCase()
  const isWorks = c.includes('work')
  const isGoods = c.includes('good')
  const isConsult = c.includes('consult')
  const bg = isWorks ? 'rgba(124,58,237,.12)' : isGoods ? 'rgba(22,163,74,.12)' : isConsult ? 'rgba(217,119,6,.12)' : 'var(--bg-sunken)'
  const color = isWorks ? '#7c3aed' : isGoods ? '#16a34a' : isConsult ? '#d97706' : 'var(--text-secondary)'
  return (
    <span style={{
      display: 'inline-block', padding: '.15rem .45rem', borderRadius: 6,
      fontSize: '.58rem', fontWeight: 650, background: bg, color, whiteSpace: 'nowrap',
    }}>
      {category}
    </span>
  )
}

// Stats computed from tenders
function useStats(tenders: EgpTender[]) {
  return useMemo(() => {
    const agencyMap = new Map<string, number>()
    let works = 0, goods = 0, consultancy = 0, others = 0
    let urgent = 0, soon = 0

    for (const t of tenders) {
      const agency = t.office_name || 'Unknown'
      agencyMap.set(agency, (agencyMap.get(agency) ?? 0) + 1)

      const cat = (t.category_name || t.category || '').toLowerCase()
      if (cat.includes('work')) works++
      else if (cat.includes('good')) goods++
      else if (cat.includes('consult')) consultancy++
      else others++

      const days = daysUntil(t.deadline)
      if (days !== null && days < 7) urgent++
      else if (days !== null && days < 30) soon++
    }

    const topAgencies = Array.from(agencyMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))

    return { topAgencies, works, goods, consultancy, others, urgent, soon }
  }, [tenders])
}

export function LiveProcurementTable({
  tenders,
  total,
  updatedAt,
  initialAgency,
  hideTopAgencies = false,
}: {
  tenders: EgpTender[]
  total: number
  updatedAt: string
  initialAgency?: string
  hideTopAgencies?: boolean
}) {
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'works' | 'goods' | 'consultancy' | 'others'>('all')
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'urgent' | 'soon'>('all')
  const [agencyFilter, setAgencyFilter] = useState<string | null>(initialAgency ?? null)
  const router = useRouter()

  const stats = useStats(tenders)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tenders.filter(t => {
      // Category filter
      if (categoryFilter !== 'all') {
        const cat = (t.category_name || t.category || '').toLowerCase()
        if (categoryFilter === 'works' && !cat.includes('work')) return false
        if (categoryFilter === 'goods' && !cat.includes('good')) return false
        if (categoryFilter === 'consultancy' && !cat.includes('consult')) return false
        if (categoryFilter === 'others' && (cat.includes('work') || cat.includes('good') || cat.includes('consult'))) return false
      }

      // Urgency filter
      if (urgencyFilter !== 'all') {
        const days = daysUntil(t.deadline)
        if (days === null) return false
        if (urgencyFilter === 'urgent' && days >= 7) return false
        if (urgencyFilter === 'soon' && days >= 30) return false
      }

      // Agency filter
      if (agencyFilter && t.office_name !== agencyFilter) {
        return false
      }

      // Text query
      if (q) {
        const match = `${t.title} ${t.office_name} ${t.reference} ${t.location} ${t.category_name} ${t.method}`.toLowerCase().includes(q)
        if (!match) return false
      }

      return true
    })
  }, [tenders, query, categoryFilter, urgencyFilter, agencyFilter])

  const shown = filtered.slice(0, visible)

  function handleRefresh() {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 1500)
  }

  function clearAllFilters() {
    setCategoryFilter('all')
    setUrgencyFilter('all')
    setAgencyFilter(null)
    setQuery('')
    setVisible(PAGE_SIZE)
  }

  const hasActiveFilters = categoryFilter !== 'all' || urgencyFilter !== 'all' || Boolean(agencyFilter) || Boolean(query)
  const maxCount = stats.topAgencies[0]?.count ?? 1

  return (
    <div>
      {/* Stats and Filter Bar */}
      <div style={{ marginTop: '.75rem', display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
        {/* Category + Urgency row */}
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { id: 'works' as const, label: 'Works', value: stats.works, color: '#7c3aed', bg: 'rgba(124,58,237,.1)' },
            { id: 'goods' as const, label: 'Goods', value: stats.goods, color: '#16a34a', bg: 'rgba(22,163,74,.1)' },
            { id: 'consultancy' as const, label: 'Consultancy', value: stats.consultancy, color: '#d97706', bg: 'rgba(217,119,6,.1)' },
            { id: 'others' as const, label: 'Others', value: stats.others, color: 'var(--text-secondary)', bg: 'var(--bg-sunken)' },
          ].map(stat => {
            const isActive = categoryFilter === stat.id
            return (
              <button
                key={stat.id}
                type="button"
                onClick={() => {
                  setCategoryFilter(cur => (cur === stat.id ? 'all' : stat.id))
                  setVisible(PAGE_SIZE)
                }}
                title={`Filter by ${stat.label} (click to toggle)`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '.35rem',
                  background: isActive ? stat.color : stat.bg,
                  color: isActive ? '#ffffff' : stat.color,
                  border: isActive ? `2px solid ${stat.color}` : '2px solid transparent',
                  borderRadius: 8, padding: '.3rem .65rem', cursor: 'pointer',
                  transition: 'all .15s ease',
                  boxShadow: isActive ? '0 2px 6px rgba(0,0,0,.15)' : 'none',
                }}
              >
                <span style={{ fontSize: '.6rem', fontWeight: 700 }}>{stat.label}</span>
                <strong style={{ fontSize: '.8rem', fontWeight: 750 }}>{stat.value.toLocaleString()}</strong>
                {isActive && <Check size={11} strokeWidth={3} />}
              </button>
            )
          })}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {stats.urgent > 0 && (
              <button
                type="button"
                onClick={() => {
                  setUrgencyFilter(cur => (cur === 'urgent' ? 'all' : 'urgent'))
                  setVisible(PAGE_SIZE)
                }}
                title="Filter closing in <7 days (click to toggle)"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '.25rem',
                  background: urgencyFilter === 'urgent' ? '#dc2626' : 'rgba(220,38,38,.12)',
                  color: urgencyFilter === 'urgent' ? '#ffffff' : '#dc2626',
                  border: urgencyFilter === 'urgent' ? '1px solid #dc2626' : '1px solid transparent',
                  borderRadius: 8, padding: '.28rem .6rem', fontSize: '.6rem', fontWeight: 650,
                  cursor: 'pointer', transition: 'all .15s ease',
                }}
              >
                <CalendarDays size={10} /> {stats.urgent} closing in &lt;7 days
                {urgencyFilter === 'urgent' && <Check size={10} strokeWidth={3} />}
              </button>
            )}
            {stats.soon > 0 && (
              <button
                type="button"
                onClick={() => {
                  setUrgencyFilter(cur => (cur === 'soon' ? 'all' : 'soon'))
                  setVisible(PAGE_SIZE)
                }}
                title="Filter closing in <30 days (click to toggle)"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '.25rem',
                  background: urgencyFilter === 'soon' ? '#d97706' : 'rgba(217,119,6,.12)',
                  color: urgencyFilter === 'soon' ? '#ffffff' : '#d97706',
                  border: urgencyFilter === 'soon' ? '1px solid #d97706' : '1px solid transparent',
                  borderRadius: 8, padding: '.28rem .6rem', fontSize: '.6rem', fontWeight: 650,
                  cursor: 'pointer', transition: 'all .15s ease',
                }}
              >
                <CalendarDays size={10} /> {stats.soon} closing in &lt;30 days
                {urgencyFilter === 'soon' && <Check size={10} strokeWidth={3} />}
              </button>
            )}
          </div>
        </div>

        {/* Top agencies leaderboard strip */}
        {!hideTopAgencies && stats.topAgencies.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 .4rem' }}>
              <p className="eyebrow" style={{ margin: 0, fontSize: '.58rem' }}>TOP PROCURING AGENCIES · CLICK TO FILTER OR VISIT PROFILE</p>
              {agencyFilter && (
                <button
                  type="button"
                  onClick={() => setAgencyFilter(null)}
                  style={{
                    fontSize: '.58rem', fontWeight: 700, color: 'var(--primary)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  }}
                >
                  Clear agency filter
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '.5rem', overflowX: 'auto', paddingBottom: '.4rem' }}>
              {stats.topAgencies.map((agency, i) => {
                const isSelected = agencyFilter === agency.name
                const agencySlug = slugify(agency.name)
                return (
                  <div
                    key={agency.name}
                    className="bg-card rounded-lg shadow-sm"
                    style={{
                      minWidth: 185, maxWidth: 220, padding: '.65rem .75rem', flexShrink: 0,
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                      background: isSelected ? 'rgba(13,124,95,.04)' : 'var(--bg-card)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      transition: 'border-color .15s ease',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.35rem' }}>
                        <span style={{
                          width: 20, height: 20, borderRadius: '50%', display: 'grid', placeItems: 'center',
                          fontSize: '.6rem', fontWeight: 700, flexShrink: 0,
                          background: isSelected || i === 0 ? 'rgba(13,124,95,.15)' : 'var(--bg-sunken)',
                          color: isSelected || i === 0 ? 'var(--primary)' : 'var(--text-tertiary)',
                        }}>
                          {i + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setAgencyFilter(cur => (cur === agency.name ? null : agency.name))
                            setVisible(PAGE_SIZE)
                          }}
                          title={`Filter by ${agency.name}`}
                          style={{
                            fontSize: '.63rem', fontWeight: isSelected ? 700 : 600, lineHeight: 1.3,
                            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                            color: isSelected ? 'var(--primary)' : 'var(--text)',
                            background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', flex: 1,
                          }}
                        >
                          {agency.name}
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-.02em', color: 'var(--text)' }}>
                          {agency.count.toLocaleString()}
                          <span className="text-tertiary" style={{ fontSize: '.6rem', fontWeight: 400, marginLeft: '.25rem' }}>notices</span>
                        </strong>
                        <Link
                          href={`/procurement/agencies/${agencySlug}`}
                          title={`Open ${agency.name} dedicated page`}
                          className="text-primary"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '.15rem',
                            fontSize: '.58rem', fontWeight: 700, textDecoration: 'none',
                          }}
                        >
                          Profile <ExternalLink size={9} />
                        </Link>
                      </div>
                    </div>

                    <div style={{ marginTop: '.45rem' }}>
                      <div style={{ height: 4, background: 'var(--bg-sunken)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 99,
                          width: `${Math.round((agency.count / maxCount) * 100)}%`,
                          background: isSelected || i === 0 ? 'var(--primary)' : i === 1 ? 'var(--accent)' : 'var(--text-tertiary)',
                        }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Active filters pill bar */}
      {hasActiveFilters && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap',
          marginTop: '.75rem', padding: '.45rem .65rem', borderRadius: 8,
          background: 'var(--bg-sunken)', border: '1px solid var(--border-light)',
        }}>
          <Filter size={12} className="text-primary" />
          <span style={{ fontSize: '.62rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Filtered by:</span>
          {categoryFilter !== 'all' && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '.25rem',
              padding: '.15rem .45rem', borderRadius: 6, fontSize: '.58rem', fontWeight: 650,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
            }}>
              Category: {categoryFilter}
              <button type="button" onClick={() => setCategoryFilter('all')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}><X size={10} /></button>
            </span>
          )}
          {urgencyFilter !== 'all' && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '.25rem',
              padding: '.15rem .45rem', borderRadius: 6, fontSize: '.58rem', fontWeight: 650,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
            }}>
              Deadline: {urgencyFilter === 'urgent' ? '<7 days' : '<30 days'}
              <button type="button" onClick={() => setUrgencyFilter('all')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}><X size={10} /></button>
            </span>
          )}
          {agencyFilter && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '.25rem',
              padding: '.15rem .45rem', borderRadius: 6, fontSize: '.58rem', fontWeight: 650,
              background: 'var(--bg-card)', border: '1px solid var(--border)', maxWidth: 260,
            }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Agency: {agencyFilter}</span>
              <button type="button" onClick={() => setAgencyFilter(null)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexShrink: 0 }}><X size={10} /></button>
            </span>
          )}
          {query && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '.25rem',
              padding: '.15rem .45rem', borderRadius: 6, fontSize: '.58rem', fontWeight: 650,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
            }}>
              Query: &quot;{query}&quot;
              <button type="button" onClick={() => setQuery('')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}><X size={10} /></button>
            </span>
          )}
          <button
            type="button"
            onClick={clearAllFilters}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none', padding: '0 .2rem',
              fontSize: '.6rem', fontWeight: 700, color: 'var(--primary)', cursor: 'pointer',
            }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Search + refresh row */}
      <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '.75rem' }}>
        <label className="search" style={{ maxWidth: 360, flex: 1 }}>
          <Search size={16} />
          <input
            aria-label="Search live procurement notices"
            placeholder="Search work, office, location, or reference..."
            value={query}
            onChange={event => { setQuery(event.target.value); setVisible(PAGE_SIZE) }}
          />
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem', marginLeft: 'auto' }}>
          <span className="text-tertiary" style={{ fontSize: '.63rem' }}>
            Last refreshed: {formatUpdatedAt(updatedAt)}
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            aria-label="Refresh procurement data"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '.3rem',
              padding: '.3rem .65rem', borderRadius: 8, fontSize: '.63rem', fontWeight: 600,
              background: 'var(--bg-sunken)', border: '1px solid var(--border-light)',
              color: 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            <RefreshCw size={12} style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
            Refresh
          </button>
        </div>
        <span className="muted" style={{ fontSize: '.63rem', width: '100%' }}>
          Showing {shown.length.toLocaleString()} of {filtered.length.toLocaleString()} matches · {total.toLocaleString()} total at e-GP
        </span>
      </div>

      {/* Tender list */}
      {!shown.length ? (
        <div className="bg-sunken rounded-lg border border-dashed border-line" style={{ marginTop: '.9rem', padding: '2rem', textAlign: 'center' }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '.85rem' }}>No live notices match your current filters.</p>
          <p className="muted" style={{ margin: '.3rem 0 0' }}>Try clearing filters or using a broader keyword.</p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="outline-button"
              style={{ marginTop: '.75rem', fontSize: '.68rem' }}
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginTop: '.9rem' }}>
          {shown.map(tender => {
            const days = daysUntil(tender.deadline)
            const urgent = days !== null && days < 7
            const soon = days !== null && days < 30
            const borderColor = urgent ? 'rgba(220,38,38,.35)' : soon ? 'rgba(217,119,6,.3)' : 'var(--border-light)'
            const agencySlug = slugify(tender.office_name)
            return (
              <article
                key={tender.id}
                className="bg-card rounded-lg shadow-sm"
                style={{
                  border: `1px solid ${borderColor}`,
                  padding: '.75rem .9rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '.5rem .75rem',
                  alignItems: 'start',
                }}
              >
                {/* Left: title + meta */}
                <div style={{ minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(tender.id)}
                    className="text-primary"
                    style={{ padding: 0, textAlign: 'left', fontSize: '.78rem', lineHeight: 1.4, fontWeight: 650, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {tender.title}
                    <span className="text-tertiary" style={{ fontSize: '.6rem', fontWeight: 400, marginLeft: '.35rem' }}>View details</span>
                  </button>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem .6rem', marginTop: '.35rem', alignItems: 'center' }}>
                    <Link
                      href={`/procurement/agencies/${agencySlug}`}
                      title={`View ${tender.office_name} profile`}
                      className="text-secondary"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '.25rem', fontSize: '.63rem',
                        textDecoration: 'none', fontWeight: 550,
                      }}
                    >
                      <Building2 size={10} className="text-primary" />
                      <span className="hover:underline">{tender.office_name}</span>
                    </Link>
                    {tender.location && (
                      <span className="text-tertiary" style={{ display: 'flex', alignItems: 'center', gap: '.2rem', fontSize: '.63rem' }}>
                        <MapPin size={10} /> {tender.location}
                      </span>
                    )}
                    <span className="text-tertiary" style={{ fontSize: '.6rem' }}>{tender.reference}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem', marginTop: '.4rem', alignItems: 'center' }}>
                    <CategoryBadge category={tender.category_name || tender.category} />
                    {tender.method && (
                      <span style={{
                        display: 'inline-block', padding: '.15rem .45rem', borderRadius: 6,
                        fontSize: '.58rem', fontWeight: 600,
                        background: 'var(--bg-sunken)', color: 'var(--text-secondary)',
                      }}>
                        {tender.method}
                      </span>
                    )}
                  </div>
                </div>
                {/* Right: deadline pill */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.3rem', paddingTop: '.1rem' }}>
                  <DeadlinePill deadline={tender.deadline} />
                  {tender.deadline && (
                    <span className="text-tertiary" style={{ fontSize: '.58rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {formatNepalDate(tender.deadline)}
                    </span>
                  )}
                </div>
              </article>
            )
          })}
          {visible < filtered.length && (
            <button onClick={() => setVisible(count => count + PAGE_SIZE)} className="outline-button" style={{ marginTop: '.5rem', width: '100%', justifyContent: 'center' }}>
              Show more ({(filtered.length - visible).toLocaleString()} remaining)
            </button>
          )}
        </div>
      )}
      {selectedId && <TenderDetailsDialog id={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}

function TenderDetailsDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const [detail, setDetail] = useState<EgpTenderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    setDetail(null)
    fetch(`/api/egp/tenders/${encodeURIComponent(id)}`)
      .then(response => {
        if (!response.ok) throw new Error('Tender detail request failed')
        return response.json() as Promise<EgpTenderDetail>
      })
      .then(data => { if (active) setDetail(data) })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const sourceUrl = egpProjectUrl(id)

  return (
    <div onMouseDown={event => { if (event.target === event.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(8, 15, 25, .58)', display: 'flex', justifyContent: 'flex-end', backdropFilter: 'blur(3px)' }}>
      <aside role="dialog" aria-modal="true" aria-labelledby="egp-detail-title" style={{ width: 'min(760px, 100%)', height: '100%', overflowY: 'auto', background: 'var(--bg-elevated)', color: 'var(--text-primary)', padding: 'clamp(1.1rem, 4vw, 2rem)', boxShadow: 'var(--shadow-lg)' }}>
        <button type="button" onClick={onClose} aria-label="Close tender details" className="drawer-close" style={{ position: 'sticky', float: 'right', top: '.25rem', zIndex: 2 }}><X size={19} /></button>
        {loading && <div style={{ minHeight: '55vh', display: 'grid', placeContent: 'center', textAlign: 'center', gap: '.75rem' }}><LoaderCircle size={25} className="text-primary" style={{ margin: 'auto', animation: 'spin 1s linear infinite' }} /><p className="muted" style={{ margin: 0 }}>Loading the full tender record...</p></div>}
        {error && !loading && <div style={{ paddingTop: '3rem' }}><p className="eyebrow">E-GP RECORD</p><h2 id="egp-detail-title">Tender details unavailable</h2><p className="muted">The detail service did not return a record. You can still open the official e-GP page.</p><a className="text-primary" href={sourceUrl} target="_blank" rel="noreferrer">Open official record <ExternalLink size={13} /></a></div>}
        {detail && !loading && <TenderDetailContent detail={detail} sourceUrl={sourceUrl} />}
      </aside>
    </div>
  )
}

function TenderDetailContent({ detail, sourceUrl }: { detail: EgpTenderDetail; sourceUrl: string }) {
  const fields = [
    ['Procuring entity', detail.office_name],
    ['Entity address', detail.office_address],
    ['Reference number', detail.reference],
    ['Category', detail.category_name || detail.category],
    ['Procurement method', detail.method],
    ['Contract type', detail.contract_type_name],
    ['Fiscal year', detail.fiscal_year],
    ['Project type', detail.project_type],
    ['Submission format', detail.envelope_mode],
    ['Current status', detail.status],
    ['Opening stage', detail.opening_stage],
  ].filter(([, value]) => Boolean(value)) as [string, string][]

  return (
    <>
      <p className="eyebrow" style={{ marginTop: '.5rem' }}>LIVE E-GP TENDER RECORD</p>
      <h2 id="egp-detail-title" style={{ clear: 'both', fontFamily: 'var(--font-serif)', fontSize: '1.55rem', lineHeight: 1.2, fontWeight: 500, margin: '.35rem 0 .55rem' }}>{detail.title}</h2>
      {detail.location && <p className="drawer-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}><MapPin size={14} />{detail.location}</p>}
      <a href={sourceUrl} target="_blank" rel="noreferrer" className="outline-button" style={{ textDecoration: 'none', fontSize: '.7rem', margin: '.2rem 0 1rem' }}>
        Open official e-GP record <ExternalLink size={12} />
      </a>

      <section style={{ marginTop: '.75rem' }}>
        <h3 className="checklist-title">Tender information</h3>
        <div className="grid-2" style={{ gap: '.3rem .9rem' }}>
          {fields.map(([label, value]) => <DetailValue key={label} label={label} value={value} />)}
          <DetailValue label="Published" value={formatNepalDate(detail.publish_at)} />
          <DetailValue label="Pre-bid meeting" value={detail.prebid_at ? formatNepalDate(detail.prebid_at) : null} />
          <DetailValue label="Bid submission deadline" value={formatNepalDate(detail.deadline)} />
          <DetailValue label="Bid opening" value={formatNepalDate(detail.opens_at)} />
          <DetailValue label="Financial opening" value={detail.financial_opens_at ? formatNepalDate(detail.financial_opens_at) : null} />
        </div>
      </section>

      {detail.description && <section style={{ marginTop: '1.1rem' }}><h3 className="checklist-title">Description</h3><p className="muted" style={{ fontSize: '.76rem', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{detail.description}</p></section>}

      {detail.price_schedule?.items?.length ? (
        <section style={{ marginTop: '1.1rem' }}>
          <h3 className="checklist-title">Price schedule / bill of quantities</h3>
          <p className="muted" style={{ fontSize: '.66rem', margin: '.2rem 0 .6rem' }}>
            {detail.price_schedule.kind || 'Schedule'}{detail.price_schedule.currency ? ` · ${detail.price_schedule.currency}` : ''}{detail.price_schedule.vat_percent ? ` · VAT ${detail.price_schedule.vat_percent}%` : ''}
          </p>
          <div style={{ overflowX: 'auto', border: '1px solid var(--border-light)', borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.68rem', minWidth: 540 }}>
              <thead><tr style={{ background: 'var(--bg-sunken)', textAlign: 'left' }}>{['Item', 'Description', 'Quantity', 'Unit', 'Rate'].map(label => <th key={label} style={{ padding: '.55rem', borderBottom: '1px solid var(--border-light)' }}>{label}</th>)}</tr></thead>
              <tbody>{detail.price_schedule.items.map(item => <tr key={item.id}>
                <td style={{ padding: '.55rem', verticalAlign: 'top', borderBottom: '1px solid var(--border-light)', whiteSpace: 'nowrap' }}>{item.number}</td>
                <td style={{ padding: '.55rem', verticalAlign: 'top', borderBottom: '1px solid var(--border-light)', minWidth: 220 }}>{item.description}{item.section && <span className="text-tertiary" style={{ display: 'block', marginTop: '.15rem' }}>{item.section}</span>}</td>
                <td style={{ padding: '.55rem', verticalAlign: 'top', borderBottom: '1px solid var(--border-light)', whiteSpace: 'nowrap' }}>{item.quantity || '-'}</td>
                <td style={{ padding: '.55rem', verticalAlign: 'top', borderBottom: '1px solid var(--border-light)' }}>{item.unit || '-'}</td>
                <td style={{ padding: '.55rem', verticalAlign: 'top', borderBottom: '1px solid var(--border-light)', whiteSpace: 'nowrap' }}>{item.fixed_rate || '-'}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </section>
      ) : null}

      {detail.amendments?.length ? <section style={{ marginTop: '1.1rem' }}><h3 className="checklist-title">Amendments ({detail.amendments.length})</h3><div style={{ display: 'grid', gap: '.5rem' }}>{detail.amendments.map((amendment, index) => <AmendmentCard key={amendment.id || index} amendment={amendment} index={index} />)}</div></section> : null}

      {detail.cancellation_note && <section style={{ marginTop: '1rem' }}><h3 className="checklist-title">Cancellation notice</h3><p className="muted" style={{ fontSize: '.74rem', lineHeight: 1.6 }}>{detail.cancellation_note}</p></section>}

      <section style={{ marginTop: '1.1rem' }}>
        <h3 className="checklist-title">Documents ({detail.documents?.length || 0})</h3>
        {detail.documents?.length ? <div style={{ display: 'grid', gap: '.45rem' }}>{detail.documents.map(document => <DocumentLink key={document.id} document={document} tenderId={detail.id} />)}</div> : <p className="muted" style={{ fontSize: '.7rem' }}>No public documents were listed in the detail record.</p>}
      </section>
      <p className="text-tertiary" style={{ marginTop: '1rem', fontSize: '.6rem' }}>Official e-GP data. Dates are displayed in Nepal time (NPT); the e-GP record is authoritative.</p>
    </>
  )
}

function DetailValue({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return <div className="drawer-stat" style={{ display: 'block', padding: '.55rem 0' }}><span style={{ display: 'block', fontSize: '.63rem' }}>{label}</span><strong style={{ display: 'block', fontSize: '.74rem', marginTop: '.16rem', overflowWrap: 'anywhere' }}>{value}</strong></div>
}

function AmendmentCard({ amendment, index }: { amendment: EgpAmendment; index: number }) {
  const label = amendment.amendment_number ? `Amendment ${amendment.amendment_number}` : `Amendment ${index + 1}`
  return <div className="bg-sunken rounded-lg" style={{ padding: '.7rem .8rem' }}><strong style={{ fontSize: '.72rem' }}>{amendment.title || label}</strong>{amendment.description && <p className="muted" style={{ fontSize: '.67rem', margin: '.25rem 0 0', lineHeight: 1.5 }}>{amendment.description}</p>}{amendment.reason && <p className="muted" style={{ fontSize: '.67rem', margin: '.25rem 0 0' }}>Reason: {amendment.reason}</p>}<p className="text-tertiary" style={{ fontSize: '.61rem', margin: '.25rem 0 0' }}>{formatNepalDate(amendment.publish_at || amendment.created_at)}</p></div>
}

function DocumentLink({ document, tenderId }: { document: EgpDocument; tenderId: string }) {
  const href = document.url.startsWith('http') ? document.url : `https://bolpatra.gov.np${document.url.startsWith('/') ? '' : '/'}${document.url}`
  const docTitle = document.title || document.kind || 'Procurement document'
  return (
    <a
      href={href}
      data-doc="true"
      data-title={docTitle}
      target="_blank"
      rel="noreferrer"
      className="bg-sunken rounded-lg"
      style={{ display: 'flex', alignItems: 'center', gap: '.55rem', padding: '.65rem .75rem', textDecoration: 'none' }}
    >
      <FileText size={15} className="text-primary" />
      <span style={{ minWidth: 0, flex: 1 }}>
        <strong className="text-primary" style={{ display: 'block', fontSize: '.7rem' }}>{document.title || document.kind}</strong>
        <small className="text-tertiary">{document.kind}{document.size ? ` · ${(document.size / 1024 / 1024).toFixed(1)} MB` : ''}</small>
      </span>
      <ExternalLink size={12} className="text-tertiary" />
    </a>
  )
}

function EventList({ title, items, empty, notices = false }: { title: string; items: (EgpEvent | EgpNotice)[]; empty: string; notices?: boolean }) {
  return (
    <section className="bg-card border border-line-light rounded-lg shadow-sm" style={{ padding: '1rem 1.1rem' }}>
      <p className="eyebrow" style={{ margin: 0 }}>{title}</p>
      {items.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem', marginTop: '.7rem' }}>
          {items.slice(0, 5).map(item => (
            <div key={item.id} style={{ borderTop: '1px solid var(--border)', paddingTop: '.55rem' }}>
              <a href={egpEventUrl(item.href)} target="_blank" rel="noreferrer" className="text-primary" style={{ fontSize: '.72rem', fontWeight: 650, lineHeight: 1.45 }}>
                {item.title} <ExternalLink size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />
              </a>
              <p className="text-secondary" style={{ fontSize: '.63rem', margin: '.2rem 0 0' }}>
                {notices ? (item as EgpNotice).kind : (item as EgpEvent).kind} · {formatNepalDate(item.at)} · {item.office_name}
              </p>
            </div>
          ))}
        </div>
      ) : <p className="muted" style={{ fontSize: '.7rem', margin: '.7rem 0 0' }}>{empty}</p>}
    </section>
  )
}

export function ProcurementHighlights({ events, notices }: { events: EgpEvent[]; notices: EgpNotice[] }) {
  return (
    <div className="grid-2" style={{ marginTop: '.75rem', marginBottom: '.75rem' }}>
      <EventList title="UPCOMING DEADLINES AND OPENINGS" items={events} empty="No upcoming dates were returned by e-GP." />
      <EventList title="RECENT ADDENDA AND NOTICES" items={notices} empty="No recent notices were returned by e-GP." notices />
    </div>
  )
}
