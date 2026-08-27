import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, ExternalLink, TrendingUp, TrendingDown, FileText, Building2 } from 'lucide-react'
import { companies, slugify, findCompanyBySlug } from '@/lib/data'
import { StatusBadge } from '@/components/shared'
import { CompanyLogo } from '@/components/company-logo'
import { CompanyNepseCard } from '@/components/nepse-panel'
import { RelatedDatasets } from '@/components/related-datasets'

export function generateStaticParams() {
  return companies.map(c => ({ slug: slugify(c.name) }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = findCompanyBySlug(slug)
  if (!company) return { title: 'Company not found — Drishti' }
  return {
    title: `${company.name} — Drishti`,
    description: `${company.sector} · ${company.operatingStatus} · ${company.result} · ${company.note.slice(0, 140)}`,
  }
}

export default async function CompanyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = findCompanyBySlug(slug)
  if (!company) notFound()

  const idx = companies.findIndex(c => slugify(c.name) === slug)
  const prev = idx > 0 ? companies[idx - 1] : null
  const next = idx < companies.length - 1 ? companies[idx + 1] : null
  const isProfit = company.resultType === 'up'

  return (
    <div className="content-wrap">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
        <Link
          href="/companies"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '.4rem',
            fontSize: '.78rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          <ArrowLeft size={16} /> Back to companies
        </Link>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          {prev ? (
            <Link
              href={`/companies/${slugify(prev.name)}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '.3rem',
                fontSize: '.72rem',
                fontWeight: 600,
                padding: '.4rem .65rem',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
              }}
            >
              <ArrowLeft size={13} /> {prev.name.length > 18 ? prev.name.slice(0, 18) + '…' : prev.name}
            </Link>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: '.72rem',
                padding: '.4rem .65rem',
                borderRadius: 6,
                border: '1px solid var(--border-light)',
                color: 'var(--text-tertiary)',
                background: 'var(--bg-sunken)',
              }}
            >
              No previous
            </span>
          )}
          {next ? (
            <Link
              href={`/companies/${slugify(next.name)}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '.3rem',
                fontSize: '.72rem',
                fontWeight: 600,
                padding: '.4rem .65rem',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
              }}
            >
              {next.name.length > 18 ? next.name.slice(0, 18) + '…' : next.name} <ArrowRight size={13} />
            </Link>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: '.72rem',
                padding: '.4rem .65rem',
                borderRadius: 6,
                border: '1px solid var(--border-light)',
                color: 'var(--text-tertiary)',
                background: 'var(--bg-sunken)',
              }}
            >
              No next
            </span>
          )}
        </div>
      </div>

      {/* Hero */}
      <section
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: 'clamp(1.25rem, 3vw, 1.9rem)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '1rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: isProfit ? 'var(--primary)' : 'var(--danger)',
          }}
        />
        <p className="eyebrow" style={{ margin: 0 }}>
          {company.sector.toUpperCase()} · {company.year}
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginTop: '.35rem' }}>
          <div style={{ flex: '1 1 280px', minWidth: 0, display: 'flex', gap: '.85rem', alignItems: 'flex-start' }}>
            <CompanyLogo src={company.logo} alt={company.name} size={56} isProfit={isProfit} rounded={12} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                  fontWeight: 500,
                  letterSpacing: '-.04em',
                  lineHeight: 1.05,
                  margin: 0,
                }}
              >
                {company.name}
              </h1>
              <div style={{ display: 'flex', gap: '.4rem', marginTop: '.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <StatusBadge status={company.operatingStatus} />
                <StatusBadge status={company.coverage} />
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '.3rem',
                    fontSize: '.68rem',
                    color: 'var(--text-tertiary)',
                    background: 'var(--bg-sunken)',
                    padding: '.2rem .5rem',
                    borderRadius: 20,
                  }}
                >
                  <Building2 size={12} /> {company.sector}
                </span>
              </div>
            </div>
          </div>

          {/* Profit / Loss hero */}
          <div
            style={{
              flexShrink: 0,
              background: isProfit ? 'var(--primary-50)' : 'var(--danger-light)',
              border: `1px solid ${isProfit ? 'rgba(13,124,95,.14)' : 'rgba(196,55,58,.14)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '1rem 1.25rem',
              minWidth: 220,
              textAlign: 'left',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '.3rem',
                fontSize: '.62rem',
                fontWeight: 700,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: isProfit ? 'var(--primary)' : 'var(--danger)',
              }}
            >
              {isProfit ? <TrendingUp size={13} /> : <TrendingDown size={13} />} Net result · {company.coverage}
            </span>
            <strong
              style={{
                display: 'block',
                marginTop: '.35rem',
                fontSize: '1.65rem',
                fontWeight: 800,
                letterSpacing: '-.03em',
                lineHeight: 1,
                color: isProfit ? 'var(--primary)' : 'var(--danger)',
              }}
            >
              {company.result}
            </strong>
            <span style={{ display: 'block', marginTop: '.35rem', fontSize: '.66rem', color: isProfit ? 'var(--primary)' : 'var(--danger)', opacity: .8 }}>
              {isProfit ? 'Profitable' : company.operatingStatus === 'Closed' || company.operatingStatus === 'Not yet operational' ? 'No operations' : 'Loss-making'} · {company.coverage}
            </span>
          </div>
        </div>

        {/* Stats grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '.6rem',
            marginTop: '1.2rem',
          }}
        >
          <div style={{ background: 'var(--bg-sunken)', borderRadius: 10, padding: '.85rem .95rem' }}>
            <span style={{ fontSize: '.6rem', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-tertiary)' }}>Revenue</span>
            <strong style={{ display: 'block', fontSize: '1.05rem', marginTop: '.15rem', letterSpacing: '-.02em' }}>{company.revenue}</strong>
            <span style={{ fontSize: '.64rem', color: 'var(--text-secondary)' }}>{company.year}</span>
          </div>
          <div style={{ background: 'var(--bg-sunken)', borderRadius: 10, padding: '.85rem .95rem' }}>
            <span style={{ fontSize: '.6rem', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-tertiary)' }}>Reporting period</span>
            <strong style={{ display: 'block', fontSize: '1.05rem', marginTop: '.15rem' }}>{company.year}</strong>
            <span style={{ fontSize: '.64rem', color: 'var(--text-secondary)' }}>{company.sector} · {company.operatingStatus}</span>
          </div>
          <div style={{ background: 'var(--bg-sunken)', borderRadius: 10, padding: '.85rem .95rem' }}>
            <span style={{ fontSize: '.6rem', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-tertiary)' }}>Source</span>
            <strong
              style={{
                display: 'block',
                fontSize: '.8rem',
                marginTop: '.15rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {company.source}
            </strong>
            <a
              href={company.sourceUrl}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', fontSize: '.68rem', fontWeight: 600, color: 'var(--primary)', marginTop: '.2rem' }}
            >
              View official source <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </section>

      <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1rem', alignItems: 'start' }}>
        {/* Main column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
          {/* Quarters table */}
          <section className="panel">
            <p className="eyebrow" style={{ margin: 0 }}>
              QUARTERLY BREAKDOWN
            </p>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1.15rem', margin: '.2rem 0 0' }}>Q1–Q4 performance</h2>
            <p className="muted" style={{ marginTop: '.25rem' }}>
              Revenue and net result by quarter where disclosed. Unavailable quarters are marked Pending/Unknown.
            </p>
            <div style={{ marginTop: '.85rem', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-tertiary)', fontSize: '.68rem', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                    <th style={{ padding: '.55rem .6rem', borderBottom: '1px solid var(--border-light)', fontWeight: 600 }}>Quarter</th>
                    <th style={{ padding: '.55rem .6rem', borderBottom: '1px solid var(--border-light)', fontWeight: 600 }}>Revenue</th>
                    <th style={{ padding: '.55rem .6rem', borderBottom: '1px solid var(--border-light)', fontWeight: 600 }}>Result</th>
                    <th style={{ padding: '.55rem .6rem', borderBottom: '1px solid var(--border-light)', fontWeight: 600 }}>State</th>
                  </tr>
                </thead>
                <tbody>
                  {company.quarters.map(q => (
                    <tr key={q.label} style={{ borderTop: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '.7rem .6rem', fontWeight: 700 }}>{q.label}</td>
                      <td style={{ padding: '.7rem .6rem', color: 'var(--text-secondary)' }}>{q.revenue}</td>
                      <td style={{ padding: '.7rem .6rem' }}>
                        <span
                          style={{
                            fontWeight: 600,
                            color: q.result.startsWith('+') || q.result.toLowerCase().includes('profit') || q.result.includes('Dividend') ? 'var(--primary)' : q.result.startsWith('-') || q.result.toLowerCase().includes('loss') ? 'var(--danger)' : 'var(--text)',
                          }}
                        >
                          {q.result}
                        </span>
                      </td>
                      <td style={{ padding: '.7rem .6rem' }}>
                        <StatusBadge status={q.state} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Full note */}
          <section className="panel">
            <p className="eyebrow" style={{ margin: 0 }}>
              ABOUT THIS RECORD
            </p>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1.1rem', margin: '.2rem 0 0' }}>What we know</h2>
            <p style={{ marginTop: '.6rem', fontSize: '.84rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}>{company.note}</p>
            <div
              style={{
                marginTop: '.85rem',
                display: 'flex',
                gap: '.4rem',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: '.64rem', background: 'var(--bg-sunken)', padding: '.25rem .5rem', borderRadius: 6, color: 'var(--text-secondary)' }}>
                Sector: {company.sector}
              </span>
              <span style={{ fontSize: '.64rem', background: 'var(--bg-sunken)', padding: '.25rem .5rem', borderRadius: 6, color: 'var(--text-secondary)' }}>
                Year: {company.year}
              </span>
              <span style={{ fontSize: '.64rem', background: 'var(--bg-sunken)', padding: '.25rem .5rem', borderRadius: 6, color: 'var(--text-secondary)' }}>
                Coverage: {company.coverage}
              </span>
              <span style={{ fontSize: '.64rem', background: 'var(--bg-sunken)', padding: '.25rem .5rem', borderRadius: 6, color: 'var(--text-secondary)' }}>
                Status: {company.operatingStatus}
              </span>
            </div>
          </section>
        </div>

        {/* Sticky source evidence card */}
        <aside className="detail-aside" style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.1rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', gap: '.6rem', alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-sunken)', display: 'grid', placeItems: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                <FileText size={16} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '.82rem' }}>Source evidence</strong>
                <p style={{ margin: '.25rem 0 0', fontSize: '.72rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                  {company.note}
                </p>
                <p style={{ margin: '.6rem 0 0', fontSize: '.7rem', color: 'var(--text-secondary)' }}>
                  Reported by <strong style={{ color: 'var(--text)' }}>{company.source}</strong>
                </p>
                <a
                  href={company.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '.3rem',
                    marginTop: '.55rem',
                    fontSize: '.74rem',
                    fontWeight: 600,
                    color: 'var(--primary)',
                    background: 'var(--primary-50)',
                    padding: '.45rem .65rem',
                    borderRadius: 6,
                  }}
                >
                  View official source <ExternalLink size={13} />
                </a>
                <p style={{ margin: '.6rem 0 0', fontSize: '.62rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                  Evidence attached from the latest public record. Quarter figures are shown only where the publication provides a usable breakdown; otherwise marked Unavailable.
                </p>
              </div>
            </div>
          </div>

           <div
            style={{
              background: 'var(--bg-sunken)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              border: '1px solid var(--border-light)',
            }}
          >
            <strong style={{ display: 'block', fontSize: '.78rem' }}>Provenance</strong>
            <div style={{ marginTop: '.6rem', display: 'flex', flexDirection: 'column', gap: '.45rem', fontSize: '.72rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Coverage</span>
                <StatusBadge status={company.coverage} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Operating</span>
                <StatusBadge status={company.operatingStatus} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Result</span>
                <strong className={isProfit ? 'positive' : 'negative'} style={{ fontSize: '.78rem' }}>
                  {company.result}
                </strong>
              </div>
            </div>
          </div>
          <CompanyNepseCard companyName={company.name} />
          <RelatedDatasets query={company.sector} title={`Open data: ${company.sector}`} />
        </aside>
      </div>

      <style>{`@media (max-width: 900px) {
  .detail-grid { grid-template-columns: 1fr !important; }
  .detail-aside { position: static !important; }
}`}</style>
      {/* Bottom nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
        {prev ? (
          <Link href={`/companies/${slugify(prev.name)}`} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', color: 'var(--text-secondary)', fontSize: '.78rem', fontWeight: 600 }}>
            <ArrowLeft size={14} /> {prev.name}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/companies/${slugify(next.name)}`} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', color: 'var(--text-secondary)', fontSize: '.78rem', fontWeight: 600 }}>
            {next.name} <ArrowRight size={14} />
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  )
}
