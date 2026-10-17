import Link from 'next/link'
import { ArrowUpRight, Database, Building2, CalendarDays, CircleAlert, ExternalLink, ScrollText, Banknote } from 'lucide-react'
import { ProcurementTable } from '@/components/procurement-table'
import { ProcurementYearChart } from '@/components/procurement-chart'
import { fetchOcdsTenders, summarizeOcds } from '@/lib/ocds'
import { NPR_SYMBOL } from '@/lib/currency'

export const metadata = {
  title: 'Procurement Archive - Drishti',
  description: 'Searchable archive of Nepal government tender records from the e-GP system (OCDS mirror).',
}

export default async function ProcurementPage() {
  const tenders = await fetchOcdsTenders()
  const summary = summarizeOcds(tenders)

  return (
    <div className="content-wrap">
      {/* ── Hero ── */}
      <div className="eco-hero" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #14294a 60%, #0d1c33 100%)' }}>
        <p style={{ fontSize: '.6rem', letterSpacing: '.16em', fontWeight: 700, opacity: .7, margin: 0 }}>PUBLIC PROCUREMENT · E-GP MIRROR</p>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 500, letterSpacing: '-.04em', margin: '.3rem 0 .4rem', lineHeight: 1.05 }}>
          Every rupee, tendered.
        </h1>
        <p style={{ fontSize: '.82rem', opacity: .85, margin: 0, maxWidth: 560, lineHeight: 1.6 }}>
          {summary
            ? `${summary.total.toLocaleString()} contracting processes from ${summary.buyers.toLocaleString()} public offices, searchable by work, office, or OCID.`
            : 'The tender archive could not be reached right now.'}
        </p>
        <div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(255,255,255,.14)', borderRadius: 20, padding: '.35rem .8rem', fontSize: '.68rem', fontWeight: 700 }}>
            {summary ? `Coverage ${summary.periodStart.slice(0, 4)}–${summary.periodEnd.slice(0, 4)}` : 'Archive unavailable'}
          </span>
          {summary?.stale && (
            <span style={{ background: '#fbbf24', color: '#451a03', borderRadius: 20, padding: '.35rem .8rem', fontSize: '.68rem', fontWeight: 700 }}>
              Historical snapshot · ends 2018
            </span>
          )}
        </div>
      </div>

      {!summary ? (
        <section className="panel">
          <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
            <CircleAlert size={22} style={{ color: 'var(--warning)', margin: '0 auto .5rem' }} />
            <p style={{ margin: 0, fontWeight: 600, fontSize: '.85rem' }}>Archive temporarily unreachable.</p>
            <p className="muted" style={{ margin: '.3rem 0 0' }}>
              The OCDS mirror could not be downloaded. The live e-GP portal (bolpatra.gov.np) is under maintenance.
            </p>
          </div>
        </section>
      ) : (
        <>
          {/* ── Stat cards ── */}
          <section className="grid-auto" style={{ marginBottom: '.75rem' }}>
            {[
              { icon: Database, label: 'Contracting processes', value: summary.total.toLocaleString(), color: 'var(--primary)' },
              { icon: Building2, label: 'Procuring offices', value: summary.buyers.toLocaleString(), color: '#7c3aed' },
              { icon: Banknote, label: 'With disclosed value', value: summary.withValue.toLocaleString(), color: '#16a34a' },
              { icon: CalendarDays, label: 'Coverage', value: `${summary.periodStart.slice(0, 4)}–${summary.periodEnd.slice(0, 4)}`, color: '#b87d2a' },
            ].map(c => (
              <div key={c.label} className="bg-card border border-line-light rounded-lg shadow-sm" style={{ padding: '.85rem .95rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                  <c.icon size={14} style={{ color: c.color }} />
                  <span className="text-secondary" style={{ fontSize: '.64rem', fontWeight: 500 }}>{c.label}</span>
                </div>
                <strong style={{ display: 'block', fontSize: '1.3rem', letterSpacing: '-.03em', marginTop: '.25rem' }}>{c.value}</strong>
              </div>
            ))}
          </section>

          {/* ── Honesty banner ── */}
          <div className="bg-warning-light text-secondary rounded-[10px] border border-warning" style={{ marginBottom: '.75rem', padding: '.65rem .8rem', fontSize: '.7rem', lineHeight: 1.55 }}>
            <strong>Historical snapshot, not live.</strong> This mirror ends in 2018. Live tenders will appear here automatically
            once PPMO&apos;s e-GP portal recovers from maintenance; no code change needed.
          </div>

          {/* ── Year chart + top buyers ── */}
          <div className="grid-2">
            <div className="bg-card border border-line-light rounded-lg shadow-sm" style={{ padding: '1rem 1.1rem' }}>
              <p className="eyebrow" style={{ margin: 0 }}>PROCESSES BY YEAR</p>
              <div style={{ marginTop: '.5rem' }}>
                <ProcurementYearChart years={summary.years} />
              </div>
            </div>
            <div className="bg-card border border-line-light rounded-lg shadow-sm" style={{ padding: '1rem 1.1rem' }}>
              <p className="eyebrow" style={{ margin: 0 }}>TOP PROCURING OFFICES</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', marginTop: '.6rem' }}>
                {summary.topBuyers.slice(0, 6).map((b, i) => (
                  <div key={b.buyer} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.72rem' }}>
                    <span className="bg-sunken text-tertiary rounded-[6px]" style={{ width: 20, height: 20, display: 'grid', placeItems: 'center', fontSize: '.62rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{b.buyer}</span>
                    <strong className="text-primary">{b.count.toLocaleString()}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Searchable archive ── */}
          <section className="panel" style={{ marginBottom: '.75rem' }}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">BROWSE THE ARCHIVE</p>
                <h2>Search every tender</h2>
              </div>
              <span className="muted" style={{ fontSize: '.68rem', display: 'inline-flex', alignItems: 'center', gap: '.3rem' }}>
                <ScrollText size={13} /> 60 per page
              </span>
            </div>
            <ProcurementTable tenders={tenders} />
          </section>
        </>
      )}

      <div className="bg-card border border-line-light rounded-lg shadow-sm" style={{ padding: '.9rem 1.1rem', display: 'flex', alignItems: 'center', gap: '.6rem', flexWrap: 'wrap' }}>
        <Database size={15} className="text-primary" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <strong style={{ fontSize: '.74rem' }}>Source: PPMO e-GP via Open Contracting Partnership</strong>
          <p className="text-secondary" style={{ margin: '.1rem 0 0', fontSize: '.62rem' }}>
            OCDS bulk release, refreshed daily · amounts in {NPR_SYMBOL} where disclosed
          </p>
        </div>
        <a href="https://data.open-contracting.org/en/publication/36" target="_blank" rel="noreferrer" className="text-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', fontSize: '.7rem', fontWeight: 600 }}>
          Raw downloads <ExternalLink size={12} />
        </a>
        <Link href="/sources" className="text-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', fontSize: '.7rem', fontWeight: 600 }}>
          All sources <ArrowUpRight size={12} />
        </Link>
      </div>
    </div>
  )
}
