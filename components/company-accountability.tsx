import { ExternalLink, Landmark, PieChart, Wallet } from 'lucide-react'
import { companyProfiles } from '@/lib/company-profiles'
import { symbolForCompany } from '@/lib/company-symbols'
import { formatNprText } from '@/lib/currency'
import type { Company } from '@/lib/types'

const colorByKind = { government: '#0d7c5f', public: '#4387d8', other: '#a7b0bd' }

export function CompanyAccountability({ company }: { company: Company }) {
  const profile = companyProfiles[company.name]
  const isFund = company.entityType === 'Statutory public fund'
  const isRegulator = company.entityType === 'Statutory public regulator'
  const declaredGovernmentShare = company.ownership?.match(/(\d+(?:\.\d+)?)%\s*Government of Nepal/i)
  const declaredPercent = declaredGovernmentShare ? Number(declaredGovernmentShare[1]) : null
  const profileGovernmentShare = profile?.ownershipSlices?.find(item => item.kind === 'government')?.percent
  const profileHasPublishedPercentages = /\d+(?:\.\d+)?%/.test(profile?.ownershipContext ?? '')
  const profileMatchesDeclared = declaredPercent != null && profileGovernmentShare != null && Math.abs(declaredPercent - profileGovernmentShare) < 0.01
  const slices = declaredPercent != null && !profileMatchesDeclared
    ? [
      { label: 'Government of Nepal', percent: declaredPercent, kind: 'government' as const },
      ...(declaredPercent < 100 ? [{ label: 'Other shareholders', percent: Number((100 - declaredPercent).toFixed(2)), kind: 'other' as const }] : []),
    ]
    : profile?.ownershipSlices
  const hasCompleteSplit = !!slices?.length
    && (declaredPercent != null || profileHasPublishedPercentages)
    && Math.abs(slices.reduce((sum, item) => sum + item.percent, 0) - 100) < 0.01
  const symbol = symbolForCompany(company.name)
  const stops: string[] = []
  let start = 0
  if (hasCompleteSplit) {
    for (const slice of slices!) {
      const end = start + slice.percent
      stops.push(`${colorByKind[slice.kind]} ${start}% ${end}%`)
      start = end
    }
  }

  return (
    <section className="bg-card border border-line-light rounded-lg shadow-sm" style={{ padding: 'clamp(1rem, 2vw, 1.4rem)', marginTop: '1rem' }}>
      <p className="eyebrow" style={{ margin: 0 }}>{company.entityType ? 'PUBLIC STATUS & FUNDING' : 'BUSINESS MODEL & OWNERSHIP'}</p>
      <h2 className="font-serif" style={{ fontWeight: 500, fontSize: '1.25rem', margin: '.2rem 0 0' }}>{isFund ? 'How the fund works and who it serves' : isRegulator ? 'How the regulator is funded and governed' : 'Where the money comes from, and who owns it'}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '.8rem', marginTop: '.8rem' }}>
        <article className="bg-sunken rounded-[10px]" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem' }} className="text-primary"><Wallet size={16} /><h3 style={{ margin: 0, fontSize: '.85rem' }}>How it earns</h3></div>
          <p className="text-secondary" style={{ fontSize: '.77rem', lineHeight: 1.65, margin: '.55rem 0 0' }}>{formatNprText(profile?.earnsFrom ?? 'The company’s revenue source has not yet been summarized from a company-specific source.')}</p>
          {profile?.earningsCaveat && <p className="text-tertiary" style={{ fontSize: '.69rem', lineHeight: 1.55, margin: '.55rem 0 0' }}>{formatNprText(profile.earningsCaveat)}</p>}
        </article>
        <article className="bg-sunken rounded-[10px]" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem' }} className="text-primary"><Landmark size={16} /><h3 style={{ margin: 0, fontSize: '.85rem' }}>{company.entityType ? 'Legal status & stewardship' : 'Ownership structure'}</h3></div>
          <p className="text-secondary" style={{ fontSize: '.77rem', lineHeight: 1.6, margin: '.55rem 0 0' }}>{profile?.ownershipContext ?? company.ownership ?? 'Government participation is recorded in the public-enterprise inventory; a verified shareholder split is not attached.'}</p>
          {hasCompleteSplit ? (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '.85rem' }}>
              <div role="img" aria-label={`Ownership pie chart: ${slices!.map(s => `${s.label} ${s.percent}%`).join(', ')}`} style={{ width: 112, height: 112, borderRadius: '50%', background: `conic-gradient(${stops.join(', ')})`, position: 'relative', flexShrink: 0 }}>
                <div style={{ position: 'absolute', inset: 24, borderRadius: '50%' }} className="bg-sunken" />
              </div>
              <div style={{ display: 'grid', gap: '.42rem' }}>
                {slices!.map(slice => <div key={slice.label} style={{ display: 'flex', gap: '.45rem', alignItems: 'center', fontSize: '.7rem' }}><span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 99, background: colorByKind[slice.kind] }} /><span className="text-secondary">{slice.label}</span><strong style={{ marginLeft: 'auto' }}>{slice.percent}%</strong></div>)}
              </div>
            </div>
          ) : <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginTop: '.75rem', fontSize: '.68rem' }} className="text-tertiary"><PieChart size={14} /> Pie chart omitted because the complete shareholder percentages are not verified.</div>}
        </article>
      </div>
      <div className="border-t border-line-light" style={{ display: 'flex', gap: '.6rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '.85rem', paddingTop: '.7rem' }}>
        <span className="text-tertiary" style={{ fontSize: '.65rem', fontWeight: 700, letterSpacing: '.06em' }}>NEPSE CONNECTION</span>
        {symbol ? <><span className="bg-primary-50 text-primary rounded-[20px]" style={{ padding: '.25rem .55rem', fontSize: '.68rem', fontWeight: 700 }}>Listed · {symbol}</span><a href="#market-performance" className="text-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', fontSize: '.68rem', fontWeight: 600 }}>View live market and filings <ExternalLink size={12} /></a></> : profile?.nepseContext ? <span className="text-secondary" style={{ fontSize: '.68rem', lineHeight: 1.55 }}>{profile.nepseContext} {profile.nepseUrl && <a href={profile.nepseUrl} target="_blank" rel="noreferrer" className="text-primary" style={{ whiteSpace: 'nowrap' }}>NEPSE source <ExternalLink size={11} /></a>} {profile.nepseDirectoryUrl && <a href={profile.nepseDirectoryUrl} target="_blank" rel="noreferrer" className="text-primary" style={{ whiteSpace: 'nowrap', marginLeft: '.35rem' }}>EPF directory entry <ExternalLink size={11} /></a>}</span> : <span className="text-secondary" style={{ fontSize: '.68rem' }}>No exact NEPSE ticker is currently mapped for this company. No ticker was inferred from similar names.</span>}
      </div>
      <p className="text-tertiary" style={{ fontSize: '.62rem', lineHeight: 1.5, margin: '.55rem 0 0' }}>Revenue descriptions summarize the enterprise’s main activity; they are not a breakdown of the latest reported revenue. Ownership charts appear only when disclosed shares add to 100%. Check linked evidence and company filings for reporting details.</p>
    </section>
  )
}
