import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, ExternalLink, TrendingUp, TrendingDown, FileText, Building2 } from 'lucide-react'
import { companies, slugify, findCompanyBySlug } from '@/lib/data'
import { StatusBadge } from '@/components/shared'
import { CompanyLogo } from '@/components/company-logo'
import { CompanyMarketSections } from '@/components/company-market'
import { RelatedDatasets } from '@/components/related-datasets'

export function generateStaticParams() {
  return companies.map(c => ({ slug: slugify(c.name) }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = findCompanyBySlug(slug)
  if (!company) return { title: 'Company not found - Drishti' }
  return {
    title: `${company.name} - Drishti`,
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
          className="text-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '.4rem',
            fontSize: '.78rem',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} /> Back to companies
        </Link>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          {prev ? (
            <Link
              href={`/companies/${slugify(prev.name)}`}
              className="border border-line bg-card text-secondary rounded-[6px]"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '.3rem',
                fontSize: '.72rem',
                fontWeight: 600,
                padding: '.4rem .65rem',
              }}
            >
              <ArrowLeft size={13} /> {prev.name.length > 18 ? prev.name.slice(0, 18) + '…' : prev.name}
            </Link>
          ) : (
            <span
              className="border border-line-light text-tertiary bg-sunken rounded-[6px]"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: '.72rem',
                padding: '.4rem .65rem',
              }}
            >
              No previous
            </span>
          )}
          {next ? (
            <Link
              href={`/companies/${slugify(next.name)}`}
              className="border border-line bg-card text-secondary rounded-[6px]"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '.3rem',
                fontSize: '.72rem',
                fontWeight: 600,
                padding: '.4rem .65rem',
              }}
            >
              {next.name.length > 18 ? next.name.slice(0, 18) + '…' : next.name} <ArrowRight size={13} />
            </Link>
          ) : (
            <span
              className="border border-line-light text-tertiary bg-sunken rounded-[6px]"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: '.72rem',
                padding: '.4rem .65rem',
              }}
            >
              No next
            </span>
          )}
        </div>
      </div>

      {/* Hero */}
      <section
        className="bg-card border border-line-light rounded-lg shadow-sm"
        style={{
          padding: 'clamp(1.25rem, 3vw, 1.9rem)',
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
                className="font-serif"
                style={{
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
                  className="text-tertiary bg-sunken rounded-[20px]"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '.3rem',
                    fontSize: '.68rem',
                    padding: '.2rem .5rem',
                  }}
                >
                  <Building2 size={12} /> {company.sector}
                </span>
              </div>
            </div>
          </div>

          {/* Profit / Loss hero */}
          <div
            className="rounded-lg"
            style={{
              flexShrink: 0,
              background: isProfit ? 'var(--primary-50)' : 'var(--danger-light)',
              border: `1px solid ${isProfit ? 'rgba(13,124,95,.14)' : 'rgba(196,55,58,.14)'}`,
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
              {isProfit ? <TrendingUp size={13} /> : <TrendingDown size={13} />} Net result · {company.year}
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
              {isProfit ? 'Profitable' : company.operatingStatus === 'Closed' || company.operatingStatus === 'Not yet operational' ? 'No operations' : 'Loss-making'}
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
          <div className="bg-sunken rounded-[10px]" style={{ padding: '.85rem .95rem' }}>
            <span className="text-tertiary" style={{ fontSize: '.6rem', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700 }}>Revenue</span>
            <strong style={{ display: 'block', fontSize: '1.05rem', marginTop: '.15rem', letterSpacing: '-.02em' }}>{company.revenue}</strong>
            <span className="text-secondary" style={{ fontSize: '.64rem' }}>{company.year}</span>
          </div>
          <div className="bg-sunken rounded-[10px]" style={{ padding: '.85rem .95rem' }}>
            <span className="text-tertiary" style={{ fontSize: '.6rem', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700 }}>Fiscal year</span>
            <strong style={{ display: 'block', fontSize: '1.05rem', marginTop: '.15rem' }}>{company.year}</strong>
            <span className="text-secondary" style={{ fontSize: '.64rem' }}>{company.operatingStatus}</span>
          </div>
        </div>
      </section>

      <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1rem', alignItems: 'start' }}>
        {/* Main column: market first, filings second, facts third */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
          <CompanyMarketSections company={company} />
        </div>

        {/* Sticky rail: single source of truth for provenance + market */}
        <aside className="detail-aside" style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            className="bg-card border border-line-light rounded-lg shadow-sm"
            style={{
              padding: '1.1rem',
            }}
          >
            <div style={{ display: 'flex', gap: '.6rem', alignItems: 'flex-start' }}>
              <div className="rounded-[8px] bg-sunken text-primary" style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <FileText size={16} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '.82rem' }}>Source evidence</strong>
                <p className="text-secondary" style={{ margin: '.25rem 0 0', fontSize: '.72rem', lineHeight: 1.55 }}>
                  {company.note}
                </p>
                <p className="text-secondary" style={{ margin: '.6rem 0 0', fontSize: '.7rem' }}>
                  Reported by <strong className="text-ink">{company.source}</strong>
                </p>
                <a
                  href={company.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary bg-primary-50 rounded-[6px]"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '.3rem',
                    marginTop: '.55rem',
                    fontSize: '.74rem',
                    fontWeight: 600,
                    padding: '.45rem .65rem',
                  }}
                >
                  View official source <ExternalLink size={13} />
                </a>
                <p className="text-tertiary" style={{ margin: '.6rem 0 0', fontSize: '.62rem', lineHeight: 1.5 }}>
                  Evidence attached from the latest public record. Quarter figures are shown only where the publication provides a usable breakdown; otherwise marked Unavailable.
                </p>
              </div>
            </div>
          </div>

          <RelatedDatasets query={company.sector} title={`Open data: ${company.sector}`} />
        </aside>
      </div>

      <style>{`@media (max-width: 900px) {
  .detail-grid { grid-template-columns: 1fr !important; }
  .detail-aside { position: static !important; }
}`}</style>
      {/* Bottom nav */}
      <div className="border-t border-line-light" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1rem' }}>
        {prev ? (
          <Link href={`/companies/${slugify(prev.name)}`} className="text-secondary" style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.78rem', fontWeight: 600 }}>
            <ArrowLeft size={14} /> {prev.name}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/companies/${slugify(next.name)}`} className="text-secondary" style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.78rem', fontWeight: 600 }}>
            {next.name} <ArrowRight size={14} />
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  )
}
