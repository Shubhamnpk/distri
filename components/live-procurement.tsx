'use client'

import { useEffect, useMemo, useState } from 'react'
import { Building2, CalendarDays, Download, ExternalLink, FileText, LoaderCircle, MapPin, Search, X } from 'lucide-react'
import type { EgpAmendment, EgpDocument, EgpEvent, EgpNotice, EgpTender, EgpTenderDetail } from '@/lib/egp'
import { egpEventUrl, egpProjectUrl } from '@/lib/egp'

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

export function LiveProcurementTable({ tenders, total }: { tenders: EgpTender[]; total: number }) {
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tenders
    return tenders.filter(t =>
      `${t.title} ${t.office_name} ${t.reference} ${t.location} ${t.category_name} ${t.method}`.toLowerCase().includes(q),
    )
  }, [tenders, query])
  const shown = filtered.slice(0, visible)

  return (
    <div>
      <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '.75rem' }}>
        <label className="search" style={{ maxWidth: 360 }}>
          <Search size={16} />
          <input
            aria-label="Search live procurement notices"
            placeholder="Search work, office, location, or reference…"
            value={query}
            onChange={event => { setQuery(event.target.value); setVisible(PAGE_SIZE) }}
          />
        </label>
        <span className="muted" style={{ marginLeft: 'auto', fontSize: '.68rem' }}>
          Showing {shown.length.toLocaleString()} of {filtered.length.toLocaleString()} loaded · {total.toLocaleString()} at e-GP
        </span>
      </div>
      {!shown.length ? (
        <div className="bg-sunken rounded-lg border border-dashed border-line" style={{ marginTop: '.9rem', padding: '2rem', textAlign: 'center' }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '.85rem' }}>No live notices match this search.</p>
          <p className="muted" style={{ margin: '.3rem 0 0' }}>Try a shorter keyword or procuring office name.</p>
        </div>
      ) : (
        <div className="data-table" style={{ marginTop: '.9rem' }}>
          {shown.map(tender => (
            <article className="data-row" key={tender.id} style={{ alignItems: 'start', gridTemplateColumns: '2.3fr 1fr 1fr .85fr' }}>
              <div className="entity">
                <div className="entity-icon text-primary" style={{ backgroundColor: 'rgba(13,124,95,.1)' }}><FileText size={18} /></div>
                <div style={{ minWidth: 0 }}>
                  <button type="button" onClick={() => setSelectedId(tender.id)} className="text-primary" style={{ padding: 0, textAlign: 'left', fontSize: '.78rem', lineHeight: 1.4, fontWeight: 650 }}>
                    {tender.title} <span style={{ fontSize: '.63rem', fontWeight: 500 }}>View details</span>
                  </button>
                  <span className="text-tertiary" style={{ display: 'flex', alignItems: 'center', gap: '.25rem', fontSize: '.64rem', marginTop: '.2rem' }}>
                    <Building2 size={11} /> {tender.office_name}
                  </span>
                  <span className="text-tertiary" style={{ display: 'block', fontSize: '.6rem', marginTop: '.15rem' }}>{tender.reference}</span>
                </div>
              </div>
              <div><small>Type · method</small><strong>{tender.category_name || tender.category} · {tender.method || '—'}</strong></div>
              <div><small>Location</small><strong>{tender.location || 'Not listed'}</strong></div>
              <div>
                <small>Bid deadline</small>
                <strong style={{ display: 'flex', gap: '.25rem', alignItems: 'center' }}>
                  <CalendarDays size={12} className="text-tertiary" />{formatNepalDate(tender.deadline)}
                </strong>
              </div>
            </article>
          ))}
          {visible < filtered.length && (
            <button onClick={() => setVisible(count => count + PAGE_SIZE)} className="outline-button" style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}>
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
        {loading && <div style={{ minHeight: '55vh', display: 'grid', placeContent: 'center', textAlign: 'center', gap: '.75rem' }}><LoaderCircle size={25} className="text-primary" style={{ margin: 'auto', animation: 'spin 1s linear infinite' }} /><p className="muted" style={{ margin: 0 }}>Loading the full tender record…</p></div>}
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
    ['Contract type', detail.contract_type_name || detail.contract_type],
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
                <td style={{ padding: '.55rem', verticalAlign: 'top', borderBottom: '1px solid var(--border-light)', whiteSpace: 'nowrap' }}>{item.quantity || '—'}</td>
                <td style={{ padding: '.55rem', verticalAlign: 'top', borderBottom: '1px solid var(--border-light)' }}>{item.unit || '—'}</td>
                <td style={{ padding: '.55rem', verticalAlign: 'top', borderBottom: '1px solid var(--border-light)', whiteSpace: 'nowrap' }}>{item.fixed_rate || '—'}</td>
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
  return <a href={href} target="_blank" rel="noreferrer" className="bg-sunken rounded-lg" style={{ display: 'flex', alignItems: 'center', gap: '.55rem', padding: '.65rem .75rem', textDecoration: 'none' }}>
    <Download size={15} className="text-primary" />
    <span style={{ minWidth: 0, flex: 1 }}><strong className="text-primary" style={{ display: 'block', fontSize: '.7rem' }}>{document.title || document.kind}</strong><small className="text-tertiary">{document.kind}{document.size ? ` · ${(document.size / 1024 / 1024).toFixed(1)} MB` : ''}</small></span>
    <ExternalLink size={12} className="text-tertiary" />
  </a>
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
      <EventList title="UPCOMING DEADLINES & OPENINGS" items={events} empty="No upcoming dates were returned by e-GP." />
      <EventList title="RECENT ADDENDA & NOTICES" items={notices} empty="No recent notices were returned by e-GP." notices />
    </div>
  )
}
