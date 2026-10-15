'use client'

import { Building2, Check, ExternalLink, FileText, X } from 'lucide-react'
import { formatNprOrNA, formatNprText } from '@/lib/currency'
import { formatFiscalYearLabel } from '@/lib/fiscal-year'
import { StatusBadge } from './shared'
import { CompanyLogo } from './company-logo'
import type { Company, Project } from '@/lib/types'

type DetailDrawerProps = {
  selected: Company | Project
  quarter: string
  onQuarterChange: (q: string) => void
  onClose: () => void
}

export function DetailDrawer({ selected, quarter, onQuarterChange, onClose }: DetailDrawerProps) {
  const isCompany = 'sector' in selected

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="detail-drawer" onClick={e => e.stopPropagation()}>
        <button className="drawer-close" onClick={onClose} aria-label="Close details"><X /></button>

        {isCompany ? (
          <>
            <p className="eyebrow">COMPANY PROFILE</p>
            <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', marginTop: '.35rem' }}>
              <CompanyLogo src={(selected as Company).logo} alt={selected.name} size={44} rounded={10} />
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', lineHeight: 1.1 }}>{selected.name}</h2>
                <p className="drawer-subtitle" style={{ margin: 0 }}>{selected.sector}</p>
              </div>
            </div>
            <div className="drawer-stat"><span>Latest reporting year</span><strong>{formatFiscalYearLabel(selected.year)}</strong></div>
            <div className="drawer-stat"><span>Reported revenue</span><strong>{formatNprOrNA(selected.revenue)}</strong></div>
            {selected.ownership && <div className="drawer-stat"><span>Government ownership</span><strong>{selected.ownership}</strong></div>}
            <div className="drawer-stat"><span>Net result</span><strong className={selected.resultType === 'unknown' ? 'text-secondary' : selected.resultType === 'up' ? 'positive' : 'negative'}>{formatNprOrNA(selected.result)}</strong></div>
            <StatusBadge status={selected.operatingStatus} />
            <div className="quarter-tabs">
              {selected.quarters.map(item => (
                <button className={quarter === item.label ? 'selected' : ''} key={item.label} onClick={() => onQuarterChange(item.label)}>{item.label}</button>
              ))}
            </div>
            {selected.quarters.filter(item => item.label === quarter).map(item => (
              <div className="quarter-card" key={item.label}>
                <div><span>{item.label} revenue</span><strong>{formatNprOrNA(item.revenue)}</strong></div>
                <div><span>Net result</span><strong>{formatNprOrNA(item.result)}</strong></div>
                <StatusBadge status={item.state} />
              </div>
            ))}
            <div className="drawer-source">
              <FileText size={17} />
              <div>
                <strong>Evidence attached</strong>
                <p>{formatNprText(selected.note)}</p>
                <a href={selected.sourceUrl} target="_blank" rel="noreferrer">View official source <ExternalLink size={14} /></a>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="drawer-visual"><img src={selected.image} alt={selected.name} /></div>
            {Array.from(new Set([selected.image, ...(selected.gallery ?? [])])).length > 1 && (
              <div style={{ display: 'flex', gap: 5, overflowX: 'auto', marginTop: '-.5rem' }}>
                {Array.from(new Set([selected.image, ...(selected.gallery ?? [])])).slice(1).map(src => (
                  <a key={src} href={src} target="_blank" rel="noreferrer" aria-label={`Open additional photo for ${selected.name}`}>
                    <img src={src} alt="" className="rounded-[6px] border border-line-light" style={{ width: 74, height: 50, objectFit: 'cover', display: 'block' }} loading="lazy" />
                  </a>
                ))}
              </div>
            )}
            <p className="eyebrow">PROJECT PROFILE</p>
            <h2>{selected.name}</h2>
            <p className="drawer-subtitle">{selected.ministry} · {selected.location}</p>
            <div className="drawer-stat"><span>Approved budget</span><strong>{formatNprText(selected.budget)}</strong></div>
            <div className="drawer-stat"><span>Reported spending</span><strong>{formatNprText(selected.spent)}</strong></div>
            <div className="drawer-stat"><span>Physical progress</span><strong>{selected.progress}%</strong></div>
            <div className="drawer-stat"><span>Latest update</span><strong>{selected.updated}</strong></div>
            <StatusBadge status={selected.status} />
            {selected.completionNote && (
              <div className="drawer-source">
                <Check size={17} />
                <div>
                  <strong>How it got done</strong>
                  <p>{selected.completionNote}</p>
                </div>
              </div>
            )}
            <h3 className="checklist-title">Implementation checklist</h3>
            <div className="checklist">
              {selected.checklist.map(item => (
                <div className="check-row" key={item.label}>
                  <div className={`check-icon ${item.state.toLowerCase()}`}>
                    {item.state === 'Done' ? <Check size={14} /> : item.state === 'Unknown' ? '?' : '!'}
                  </div>
                  <div><strong>{item.label}</strong><p>{item.note}</p><small>{item.date}</small></div>
                  <StatusBadge status={item.state} />
                </div>
              ))}
            </div>
            <div className="drawer-source">
              <FileText size={17} />
              <div>
                <strong>Evidence attached</strong>
                <p>Progress reported by {selected.source}. Spending is shown only where the published record provides a usable figure.</p>
                <a href={selected.sourceUrl} target="_blank" rel="noreferrer">View official source <ExternalLink size={14} /></a>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
