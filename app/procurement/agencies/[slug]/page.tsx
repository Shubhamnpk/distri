import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileArchive,
  FileText,
  Landmark,
  Layers,
  MapPin,
  PieChart,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import { LiveProcurementTable } from '@/components/live-procurement'
import { fetchEgpFeed, type EgpTender } from '@/lib/egp'
import { fetchOcdsTenders, type OcdsTender } from '@/lib/ocds'
import { slugify } from '@/lib/data'

type Props = {
  params: Promise<{ slug: string }>
}

function formatNepalDate(value: string | null | undefined) {
  if (!value) return 'Date not listed'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Date not listed'
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kathmandu',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function daysUntil(deadline: string | null | undefined): number | null {
  if (!deadline) return null
  const ms = new Date(deadline).getTime() - Date.now()
  if (!Number.isFinite(ms)) return null
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const feed = await fetchEgpFeed()
  const match = feed.tenders.find(t => slugify(t.office_name) === slug)
  const name = match ? match.office_name : 'Procuring Agency'
  return {
    title: `${name} · Public Procurement & Tenders`,
    description: `Current procurement notices, tenders, and contracts published by ${name} on Nepal's e-GP portal.`,
    alternates: { canonical: `/procurement/agencies/${slug}` },
  }
}

export default async function AgencyProcurementPage({ params }: Props) {
  const { slug } = await params
  const [feed, historicalTenders] = await Promise.all([
    fetchEgpFeed(),
    fetchOcdsTenders().catch(() => [] as OcdsTender[]),
  ])

  // Group all tenders matching this agency slug
  const agencyTenders = feed.tenders.filter(t => slugify(t.office_name) === slug)

  // Also check historical OCDS for buyer matches
  const ocdsMatches = historicalTenders.filter(t => {
    const buyer = t.buyer?.toLowerCase() ?? ''
    const targetSlug = slug.replace(/-/g, ' ')
    return buyer.includes(targetSlug)
  })

  if (agencyTenders.length === 0 && ocdsMatches.length === 0) {
    notFound()
  }

  const agencyName = agencyTenders[0]?.office_name || ocdsMatches[0]?.buyer || 'Procuring Agency'

  // Statistics calculation
  let works = 0, goods = 0, consult = 0, others = 0, urgent = 0, soon = 0
  const locationMap = new Map<string, number>()
  const methodMap = new Map<string, number>()
  const statusMap = new Map<string, number>()
  const now = Date.now()

  for (const t of agencyTenders) {
    const cat = (t.category_name || t.category || '').toLowerCase()
    if (cat.includes('work')) works++
    else if (cat.includes('good')) goods++
    else if (cat.includes('consult')) consult++
    else others++

    if (t.location) {
      locationMap.set(t.location, (locationMap.get(t.location) ?? 0) + 1)
    }
    if (t.method) {
      methodMap.set(t.method, (methodMap.get(t.method) ?? 0) + 1)
    }
    if (t.status) {
      statusMap.set(t.status, (statusMap.get(t.status) ?? 0) + 1)
    }

    if (t.deadline) {
      const ms = new Date(t.deadline).getTime() - now
      const days = Math.ceil(ms / (1000 * 60 * 60 * 24))
      if (days > 0 && days < 7) urgent++
      else if (days >= 7 && days < 30) soon++
    }
  }

  const totalNotices = agencyTenders.length
  const worksPct = totalNotices > 0 ? Math.round((works / totalNotices) * 100) : 0
  const goodsPct = totalNotices > 0 ? Math.round((goods / totalNotices) * 100) : 0
  const consultPct = totalNotices > 0 ? Math.round((consult / totalNotices) * 100) : 0
  const othersPct = Math.max(0, 100 - worksPct - goodsPct - consultPct)

  const sortedLocations = Array.from(locationMap.entries())
    .sort((a, b) => b[1] - a[1])

  const sortedMethods = Array.from(methodMap.entries())
    .sort((a, b) => b[1] - a[1])

  // Upcoming deadlines sorted by closest
  const upcomingDeadlines = agencyTenders
    .filter(t => t.deadline && new Date(t.deadline).getTime() > now)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 4)

  // Rank among all agencies in feed
  const allAgencyCounts = new Map<string, number>()
  for (const t of feed.tenders) {
    allAgencyCounts.set(t.office_name, (allAgencyCounts.get(t.office_name) ?? 0) + 1)
  }
  const rankedAgencies = Array.from(allAgencyCounts.entries()).sort((a, b) => b[1] - a[1])
  const agencyRankIndex = rankedAgencies.findIndex(([name]) => name === agencyName)
  const agencyRank = agencyRankIndex >= 0 ? agencyRankIndex + 1 : null

  return (
    <div className="content-wrap">
      {/* Breadcrumb Navigation */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.68rem', margin: '.6rem 0 .75rem', flexWrap: 'wrap' }}>
        <Link href="/procurement" className="text-secondary hover:text-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', textDecoration: 'none' }}>
          <ArrowLeft size={12} /> All procurement
        </Link>
        <span className="text-tertiary">/</span>
        <span className="text-secondary">Agencies</span>
        <span className="text-tertiary">/</span>
        <span className="text-primary font-semibold" style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {agencyName}
        </span>
      </nav>

      {/* Hero Header */}
      <div
        className="eco-hero"
        style={{
          background: 'linear-gradient(135deg, #162f4d 0%, #0f2238 60%, #0a1727 100%)',
          borderRadius: 16,
          padding: 'clamp(1.2rem, 3.5vw, 2.2rem)',
          boxShadow: 'var(--shadow-md)',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '.3rem',
              background: 'rgba(255,255,255,.12)',
              borderRadius: 20,
              padding: '.25rem .65rem',
              fontSize: '.62rem',
              fontWeight: 700,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              color: '#ffffff',
            }}
          >
            <ShieldCheck size={12} style={{ color: '#38bdf8' }} /> Verified e-GP Procuring Entity
          </span>
          {agencyRank && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '.3rem',
                background: 'rgba(255,255,255,.12)',
                borderRadius: 20,
                padding: '.25rem .65rem',
                fontSize: '.62rem',
                fontWeight: 700,
                color: '#facc15',
              }}
            >
              <TrendingUp size={12} /> #{agencyRank} Procuring Volume Nationwide
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginTop: '.75rem', flexWrap: 'wrap' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'rgba(255,255,255,.12)',
              border: '1px solid rgba(255,255,255,.18)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              color: '#ffffff',
            }}
          >
            <Landmark size={26} />
          </div>

          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(1.6rem, 3.2vw, 2.4rem)',
                fontWeight: 500,
                letterSpacing: '-.03em',
                lineHeight: 1.15,
                margin: 0,
                color: '#ffffff',
              }}
            >
              {agencyName}
            </h1>

            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '.65rem' }}>
              {sortedLocations.slice(0, 3).map(([loc]) => (
                <span
                  key={loc}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '.25rem',
                    background: 'rgba(255,255,255,.1)',
                    borderRadius: 20,
                    padding: '.25rem .6rem',
                    fontSize: '.65rem',
                    fontWeight: 600,
                    color: '#ffffff',
                  }}
                >
                  <MapPin size={11} style={{ opacity: 0.8 }} /> {loc}
                </span>
              ))}
              <span
                style={{
                  background: 'rgba(255,255,255,.1)',
                  borderRadius: 20,
                  padding: '.25rem .6rem',
                  fontSize: '.65rem',
                  fontWeight: 600,
                  color: '#ffffff',
                }}
              >
                {totalNotices.toLocaleString()} active {totalNotices === 1 ? 'notice' : 'notices'}
              </span>
              <a
                href="https://bolpatra.gov.np/projects"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '.25rem',
                  background: 'rgba(255,255,255,.16)',
                  borderRadius: 20,
                  padding: '.25rem .65rem',
                  fontSize: '.65rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  textDecoration: 'none',
                }}
              >
                Official e-GP Portal <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Main Content + Sticky Detail Aside */}
      <div className="agency-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '1.1rem', alignItems: 'start' }}>
        {/* Main Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
          {/* Quick Metrics Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '.6rem',
            }}
          >
            <div className="bg-card border border-line-light rounded-lg shadow-sm" style={{ padding: '.8rem .9rem' }}>
              <span className="text-secondary" style={{ display: 'block', fontSize: '.62rem', fontWeight: 650 }}>
                Active tenders
              </span>
              <strong style={{ display: 'block', fontSize: '1.35rem', letterSpacing: '-.02em', marginTop: '.2rem', color: 'var(--text)' }}>
                {totalNotices.toLocaleString()}
              </strong>
              <span className="text-tertiary" style={{ fontSize: '.58rem', marginTop: '.15rem', display: 'block' }}>
                Open on e-GP
              </span>
            </div>

            <div className="bg-card border border-line-light rounded-lg shadow-sm" style={{ padding: '.8rem .9rem' }}>
              <span className="text-secondary" style={{ display: 'block', fontSize: '.62rem', fontWeight: 650 }}>
                Civil works share
              </span>
              <strong style={{ display: 'block', fontSize: '1.35rem', letterSpacing: '-.02em', marginTop: '.2rem', color: '#7c3aed' }}>
                {worksPct}%
              </strong>
              <span className="text-tertiary" style={{ fontSize: '.58rem', marginTop: '.15rem', display: 'block' }}>
                {works} works notices
              </span>
            </div>

            <div className="bg-card border border-line-light rounded-lg shadow-sm" style={{ padding: '.8rem .9rem' }}>
              <span className="text-secondary" style={{ display: 'block', fontSize: '.62rem', fontWeight: 650 }}>
                Urgent deadlines
              </span>
              <strong style={{ display: 'block', fontSize: '1.35rem', letterSpacing: '-.02em', marginTop: '.2rem', color: urgent > 0 ? '#dc2626' : '#d97706' }}>
                {urgent}
              </strong>
              <span className="text-tertiary" style={{ fontSize: '.58rem', marginTop: '.15rem', display: 'block' }}>
                Closing in &lt;7 days
              </span>
            </div>

            <div className="bg-card border border-line-light rounded-lg shadow-sm" style={{ padding: '.8rem .9rem' }}>
              <span className="text-secondary" style={{ display: 'block', fontSize: '.62rem', fontWeight: 650 }}>
                Lead procedure
              </span>
              <strong style={{ display: 'block', fontSize: '1.05rem', letterSpacing: '-.02em', marginTop: '.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#2563eb' }}>
                {sortedMethods[0]?.[0] || 'NCB'}
              </strong>
              <span className="text-tertiary" style={{ fontSize: '.58rem', marginTop: '.2rem', display: 'block' }}>
                {sortedMethods[0]?.[1] || totalNotices} notices
              </span>
            </div>
          </div>

          {/* Imminent Deadlines Timeline Banner */}
          {upcomingDeadlines.length > 0 && (
            <div className="bg-card border border-line-light rounded-lg shadow-sm" style={{ padding: '1rem 1.1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                  <Clock size={15} className="text-primary" />
                  <strong style={{ fontSize: '.82rem' }}>Imminent Bid Submissions</strong>
                </div>
                <span className="text-tertiary" style={{ fontSize: '.62rem' }}>Closing soonest</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.45rem' }}>
                {upcomingDeadlines.map(t => {
                  const days = daysUntil(t.deadline)
                  const isUrgent = days !== null && days < 7
                  return (
                    <div
                      key={t.id}
                      className="bg-sunken rounded-lg"
                      style={{
                        padding: '.6rem .75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '.75rem',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: 'block', fontSize: '.72rem', fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                          {t.title}
                        </span>
                        <span className="text-tertiary" style={{ display: 'block', fontSize: '.6rem', marginTop: '.15rem' }}>
                          Ref: {t.reference} · {t.location || 'Location unlisted'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '.25rem',
                            padding: '.2rem .55rem',
                            borderRadius: 99,
                            fontSize: '.6rem',
                            fontWeight: 700,
                            background: isUrgent ? 'rgba(220,38,38,.12)' : 'rgba(217,119,6,.12)',
                            color: isUrgent ? '#dc2626' : '#d97706',
                          }}
                        >
                          <CalendarDays size={10} /> {days} days left
                        </span>
                        <span className="text-tertiary" style={{ fontSize: '.56rem', marginTop: '.2rem' }}>
                          {formatNepalDate(t.deadline)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Live Procurement Tenders Table */}
          <section className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">TENDER DIRECTORY</p>
                <h2>All notices by {agencyName}</h2>
              </div>
              <span className="muted" style={{ fontSize: '.68rem' }}>
                {totalNotices.toLocaleString()} total loaded
              </span>
            </div>

            <LiveProcurementTable
              tenders={agencyTenders}
              total={totalNotices}
              updatedAt={feed.updatedAt}
              initialAgency={agencyName}
              hideTopAgencies={true}
            />
          </section>

          {/* Historical OCDS record if any exist for this entity */}
          {ocdsMatches.length > 0 && (
            <details className="panel">
              <summary style={{ cursor: 'pointer', padding: '1rem 1.1rem', display: 'flex', alignItems: 'center', gap: '.55rem', fontWeight: 650, fontSize: '.85rem' }}>
                <FileArchive size={16} className="text-primary" /> Historical OCDS records ({ocdsMatches.length})
                <span className="muted" style={{ fontWeight: 400, fontSize: '.68rem', marginLeft: 'auto' }}>Archived 2016-2018</span>
              </summary>
              <div style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.1rem' }}>
                <p className="muted" style={{ margin: '0 0 .75rem', fontSize: '.7rem', lineHeight: 1.55 }}>
                  Archived procurement records matched from the Open Contracting Partnership dataset.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.45rem' }}>
                  {ocdsMatches.slice(0, 10).map((t, index) => (
                    <div key={t.ocid || index} className="bg-sunken rounded-lg" style={{ padding: '.65rem .8rem' }}>
                      <strong style={{ fontSize: '.74rem', display: 'block' }}>{t.title || 'Untitled contract'}</strong>
                      <span className="text-tertiary" style={{ display: 'block', fontSize: '.62rem', marginTop: '.15rem' }}>
                        {t.date ? `Date: ${t.date.slice(0, 10)}` : ''} · Buyer: {t.buyer}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          )}
        </div>

        {/* Sticky Detail Side Panel */}
        <aside className="agency-detail-aside" style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
          {/* Entity Profile Snapshot Card */}
          <div className="bg-card border border-line-light rounded-lg shadow-sm" style={{ padding: '1rem 1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem', marginBottom: '.65rem' }}>
              <div className="rounded-[8px] bg-sunken text-primary" style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Building2 size={16} />
              </div>
              <strong style={{ fontSize: '.82rem' }}>Procuring Entity Profile</strong>
            </div>

            <dl style={{ margin: 0, display: 'grid', gap: '.55rem', fontSize: '.72rem' }}>
              <div>
                <dt className="text-tertiary" style={{ fontSize: '.58rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.05em' }}>Official Name</dt>
                <dd style={{ margin: '.15rem 0 0', fontWeight: 650, color: 'var(--text)', lineHeight: 1.35 }}>{agencyName}</dd>
              </div>

              <div>
                <dt className="text-tertiary" style={{ fontSize: '.58rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.05em' }}>Portal Status</dt>
                <dd style={{ margin: '.15rem 0 0', display: 'flex', alignItems: 'center', gap: '.3rem', color: '#16a34a', fontWeight: 650 }}>
                  <CheckCircle2 size={12} /> Active Publisher on e-GP
                </dd>
              </div>

              <div>
                <dt className="text-tertiary" style={{ fontSize: '.58rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.05em' }}>Oversight Authority</dt>
                <dd style={{ margin: '.15rem 0 0', color: 'var(--text-secondary)' }}>Public Procurement Monitoring Office (PPMO)</dd>
              </div>

              <div>
                <dt className="text-tertiary" style={{ fontSize: '.58rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.05em' }}>Official Portal Source</dt>
                <dd style={{ margin: '.25rem 0 0' }}>
                  <a
                    href="https://bolpatra.gov.np/"
                    target="_blank"
                    rel="noreferrer"
                    className="outline-button"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      fontSize: '.68rem',
                      padding: '.4rem',
                      textDecoration: 'none',
                    }}
                  >
                    Open bolpatra.gov.np <ExternalLink size={11} />
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          {/* Portfolio Category Mix Card */}
          <div className="bg-card border border-line-light rounded-lg shadow-sm" style={{ padding: '1rem 1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                <PieChart size={15} className="text-primary" />
                <strong style={{ fontSize: '.82rem' }}>Procurement Portfolio Mix</strong>
              </div>
              <span className="text-tertiary" style={{ fontSize: '.6rem' }}>{totalNotices} notices</span>
            </div>

            {/* Segmented bar */}
            <div style={{ height: 8, background: 'var(--bg-sunken)', borderRadius: 99, overflow: 'hidden', display: 'flex', marginBottom: '.75rem' }}>
              {worksPct > 0 && <div title={`Works: ${worksPct}%`} style={{ width: `${worksPct}%`, background: '#7c3aed' }} />}
              {goodsPct > 0 && <div title={`Goods: ${goodsPct}%`} style={{ width: `${goodsPct}%`, background: '#16a34a' }} />}
              {consultPct > 0 && <div title={`Consultancy: ${consultPct}%`} style={{ width: `${consultPct}%`, background: '#d97706' }} />}
              {othersPct > 0 && <div title={`Others: ${othersPct}%`} style={{ width: `${othersPct}%`, background: 'var(--text-tertiary)' }} />}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.45rem' }}>
              <div className="bg-sunken rounded-lg" style={{ padding: '.5rem .6rem' }}>
                <span style={{ display: 'block', fontSize: '.58rem', fontWeight: 700, color: '#7c3aed' }}>Works</span>
                <strong style={{ fontSize: '.9rem', color: 'var(--text)' }}>{works}</strong>
                <span className="text-tertiary" style={{ fontSize: '.56rem', marginLeft: '.25rem' }}>({worksPct}%)</span>
              </div>
              <div className="bg-sunken rounded-lg" style={{ padding: '.5rem .6rem' }}>
                <span style={{ display: 'block', fontSize: '.58rem', fontWeight: 700, color: '#16a34a' }}>Goods</span>
                <strong style={{ fontSize: '.9rem', color: 'var(--text)' }}>{goods}</strong>
                <span className="text-tertiary" style={{ fontSize: '.56rem', marginLeft: '.25rem' }}>({goodsPct}%)</span>
              </div>
              <div className="bg-sunken rounded-lg" style={{ padding: '.5rem .6rem' }}>
                <span style={{ display: 'block', fontSize: '.58rem', fontWeight: 700, color: '#d97706' }}>Consultancy</span>
                <strong style={{ fontSize: '.9rem', color: 'var(--text)' }}>{consult}</strong>
                <span className="text-tertiary" style={{ fontSize: '.56rem', marginLeft: '.25rem' }}>({consultPct}%)</span>
              </div>
              <div className="bg-sunken rounded-lg" style={{ padding: '.5rem .6rem' }}>
                <span style={{ display: 'block', fontSize: '.58rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Others</span>
                <strong style={{ fontSize: '.9rem', color: 'var(--text)' }}>{others}</strong>
                <span className="text-tertiary" style={{ fontSize: '.56rem', marginLeft: '.25rem' }}>({othersPct}%)</span>
              </div>
            </div>
          </div>

          {/* Project Locations Card */}
          {sortedLocations.length > 0 && (
            <div className="bg-card border border-line-light rounded-lg shadow-sm" style={{ padding: '1rem 1.1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.65rem' }}>
                <MapPin size={15} className="text-primary" />
                <strong style={{ fontSize: '.82rem' }}>Operational Locations</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                {sortedLocations.slice(0, 6).map(([loc, count]) => (
                  <div key={loc} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '.7rem' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220, color: 'var(--text-secondary)' }}>
                      {loc}
                    </span>
                    <strong style={{ fontSize: '.72rem', color: 'var(--text)' }}>{count} {count === 1 ? 'notice' : 'notices'}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bidding Methods Card */}
          {sortedMethods.length > 0 && (
            <div className="bg-card border border-line-light rounded-lg shadow-sm" style={{ padding: '1rem 1.1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.65rem' }}>
                <Layers size={15} className="text-primary" />
                <strong style={{ fontSize: '.82rem' }}>Procurement Methods</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                {sortedMethods.map(([method, count]) => (
                  <div key={method} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '.7rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{method}</span>
                    <span className="bg-sunken text-tertiary rounded-[6px]" style={{ padding: '.15rem .45rem', fontSize: '.62rem', fontWeight: 650 }}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regulatory Note Card */}
          <div className="bg-card border border-line-light rounded-lg shadow-sm" style={{ padding: '.85rem 1rem' }}>
            <strong style={{ display: 'block', fontSize: '.74rem', color: 'var(--text)' }}>Legal Framework</strong>
            <p className="text-secondary" style={{ margin: '.3rem 0 0', fontSize: '.64rem', lineHeight: 1.55 }}>
              All notices published under the Public Procurement Act, 2063 (2007) and Public Procurement Rules, 2064. Bid submission and tender document access remain strictly with the official PPMO portal.
            </p>
          </div>
        </aside>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .agency-detail-grid { grid-template-columns: 1fr !important; }
          .agency-detail-aside { position: static !important; }
        }
      `}</style>

      {/* Bottom Navigation */}
      <div className="border-t border-line-light" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1rem', flexWrap: 'wrap', gap: '.5rem' }}>
        <Link href="/procurement" className="outline-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', textDecoration: 'none', fontSize: '.7rem' }}>
          <ArrowLeft size={13} /> Back to all procurement notices
        </Link>
        <Link href="/sources" className="text-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', fontSize: '.7rem', fontWeight: 600 }}>
          Official sources <ArrowUpRight size={12} />
        </Link>
      </div>
    </div>
  )
}
