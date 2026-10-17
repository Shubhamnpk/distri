import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, ExternalLink, FileText, Check, Clock, AlertTriangle, HelpCircle, MapPin, Megaphone, Bell } from 'lucide-react'
import { projects, slugify, findProjectBySlug, parseBudgetCr, utilizationPct, PROJECT_FX_NOTE, PROJECT_FX_SOURCE } from '@/lib/data'
import { StatusBadge } from '@/components/shared'
import { RelatedDatasets } from '@/components/related-datasets'
import { ProjectGallery } from '@/components/project-gallery'
import type { ProjectUpdate } from '@/lib/types'
import { formatNpr, formatNprText } from '@/lib/currency'

export function generateStaticParams() {
  return projects.map(p => ({ slug: slugify(p.name) }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = findProjectBySlug(slug)
  if (!project) return { title: 'Project not found - Drishti' }
  return {
    title: `${project.name} - Drishti`,
    description: project.description?.slice(0, 150),
  }
}

function statusColor(status: string) {
  if (status === 'On track' || status === 'Completed') return 'var(--primary)'
  if (status === 'At risk') return 'var(--warning)'
  return 'var(--danger)'
}

function ChecklistIcon({ state }: { state: string }) {
  if (state === 'Done')
    return (
      <span className="check-icon done">
        <Check size={12} />
      </span>
    )
  if (state === 'Active')
    return (
      <span className="check-icon active">
        <Clock size={12} />
      </span>
    )
  if (state === 'Blocked')
    return (
      <span className="check-icon blocked">
        <AlertTriangle size={12} />
      </span>
    )
  return (
    <span className="check-icon">
      <HelpCircle size={12} />
    </span>
  )
}

function updateMeta(type: ProjectUpdate['type']) {
  if (type === 'Milestone') return { bg: 'var(--accent-light)', color: 'var(--accent)', Icon: Check }
  if (type === 'Alert') return { bg: 'var(--danger-light)', color: 'var(--danger)', Icon: AlertTriangle }
  if (type === 'News') return { bg: 'var(--warning-light)', color: 'var(--warning)', Icon: Megaphone }
  return { bg: '#eff4ff', color: '#3b82f6', Icon: Bell } // Update
}

function getTimeline(project: import('@/lib/types').Project): ProjectUpdate[] {
  if (project.updates && project.updates.length) return project.updates
  // Fallback: derive single update from current record (so every project has a timeline like GovTrack)
  const type = project.status === 'Delayed' ? 'Alert' : project.status === 'Completed' ? 'Milestone' : 'Update'
  return [
    {
      date: project.updated,
      title: `${project.progress}% - ${project.status}`,
      text: `${project.category} · ${project.ministry}. Budget ${formatNprText(project.budget)}, spent ${formatNprText(project.spent)}. Target ${formatNprText(project.target)}. Source: ${project.source}.`,
      type: type as ProjectUpdate['type'],
    },
  ]
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = findProjectBySlug(slug)
  if (!project) notFound()
  const projectImages = Array.from(new Set([project.image, ...(project.gallery ?? [])]))

  const idx = projects.findIndex(p => slugify(p.name) === slug)
  const prev = idx > 0 ? projects[idx - 1] : null
  const next = idx < projects.length - 1 ? projects[idx + 1] : null

  return (
    <div className="content-wrap">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <Link
          href="/projects"
          className="text-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontSize: '.78rem', fontWeight: 600 }}
        >
          <ArrowLeft size={16} /> Back to projects
        </Link>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          {prev ? (
            <Link
              href={`/projects/${slugify(prev.name)}`}
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
              <ArrowLeft size={13} /> {prev.name.length > 20 ? prev.name.slice(0, 20) + '…' : prev.name}
            </Link>
          ) : (
            <span className="border border-line-light text-tertiary bg-sunken rounded-[6px]" style={{ fontSize: '.72rem', padding: '.4rem .65rem' }}>
              No previous
            </span>
          )}
          {next ? (
            <Link
              href={`/projects/${slugify(next.name)}`}
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
              {next.name.length > 20 ? next.name.slice(0, 20) + '…' : next.name} <ArrowRight size={13} />
            </Link>
          ) : (
            <span className="border border-line-light text-tertiary bg-sunken rounded-[6px]" style={{ fontSize: '.72rem', padding: '.4rem .65rem' }}>
              No next
            </span>
          )}
        </div>
      </div>

      {/* Hero image */}
      <section
        className="bg-card border border-line-light rounded-lg shadow-sm"
        style={{
          overflow: 'hidden',
          marginBottom: '1rem',
        }}
      >
        <div className="bg-sunken" style={{ position: 'relative', height: 'clamp(200px, 32vw, 320px)', overflow: 'hidden' }}>
          <img
            src={project.image}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,.55) 0%, rgba(0,0,0,.08) 55%, transparent 100%)',
            }}
          />
          <div className="text-white" style={{ position: 'absolute', left: 'clamp(1rem, 3vw, 1.6rem)', right: 'clamp(1rem, 3vw, 1.6rem)', bottom: 'clamp(1rem, 2.5vw, 1.4rem)' }}>
            <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '.5rem' }}>
              <span
                className="text-ink rounded-[20px]"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '.3rem',
                  fontSize: '.62rem',
                  fontWeight: 700,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  background: 'rgba(255,255,255,.9)',
                  padding: '.25rem .5rem',
                }}
              >
                {project.category}
              </span>
              <span
                className="text-white rounded-[20px]"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '.3rem',
                  fontSize: '.62rem',
                  fontWeight: 700,
                  padding: '.25rem .55rem',
                  background: statusColor(project.status),
                }}
              >
                <span className="rounded-full bg-white" style={{ width: 6, height: 6, display: 'inline-block' }} />
                {project.status} · {project.progress}%
              </span>
            </div>
            <h1
              className="font-serif"
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2.1rem)',
                fontWeight: 500,
                letterSpacing: '-.03em',
                lineHeight: 1.05,
                margin: 0,
                textShadow: '0 1px 10px rgba(0,0,0,.35)',
              }}
            >
              {project.name}
            </h1>
            <p style={{ margin: '.35rem 0 0', fontSize: '.78rem', opacity: .88, display: 'flex', alignItems: 'center', gap: '.35rem', flexWrap: 'wrap' }}>
              <MapPin size={13} /> {project.ministry} · {project.location}
            </p>
          </div>
        </div>

        {/* Hero stats */}
        <div style={{ padding: '1.1rem clamp(1rem, 3vw, 1.5rem)', display: 'grid', gap: '.85rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '.6rem' }}>
            {[
              { label: 'Budget', value: formatNprText(project.budget), extra: project.budgetNote ? null : parseBudgetCr(project.budget) != null ? formatNpr(parseBudgetCr(project.budget)! * 1e7) : null, note: project.budgetNote },
              { label: 'Spent', value: formatNprText(project.spent), extra: utilizationPct(project.spent, project.budget) != null ? `${utilizationPct(project.spent, project.budget)}% utilized` : parseBudgetCr(project.spent) != null ? formatNpr(parseBudgetCr(project.spent)! * 1e7) : null, note: project.spentNote },
              { label: 'Target', value: formatNprText(project.target), extra: null },
              { label: 'Updated', value: project.updated, extra: null },
              { label: 'Progress', value: `${project.progress}%`, extra: null },
            ].map(s => (
              <div key={s.label} className="bg-sunken rounded-[10px]" style={{ padding: '.75rem .85rem' }}>
                <span className="text-tertiary" style={{ fontSize: '.6rem', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700 }}>{s.label}</span>
                <strong style={{ display: 'block', fontSize: '.92rem', marginTop: '.15rem', letterSpacing: '-.01em' }}>{s.value}</strong>
                {s.extra && <span className="text-tertiary bg-card border border-line-light rounded-[20px]" style={{ fontSize: '.64rem', padding: '.1rem .35rem', display: 'inline-block', marginTop: '.25rem' }}>{s.extra}</span>}
                {s.note && <span className="text-tertiary" style={{ display: 'block', fontSize: '.64rem', lineHeight: 1.4, marginTop: '.25rem' }}>{s.note}</span>}
              </div>
            ))}
          </div>
          <div>
            <div className="text-tertiary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.66rem', marginBottom: '.3rem' }}>
              <span>Physical progress</span>
              <strong className="text-ink" style={{ fontSize: '.78rem' }}>{project.progress}%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.45rem' }}>
              <StatusBadge status={project.status} />
              <span className="text-tertiary" style={{ fontSize: '.64rem' }}>{project.category} · {project.ministry}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1rem', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
          {/* Description */}
          <section className="panel">
            <p className="eyebrow" style={{ margin: 0 }}>
              OVERVIEW
            </p>
            <h2 className="font-serif" style={{ fontWeight: 500, fontSize: '1.15rem', margin: '.2rem 0 0' }}>About this project</h2>
            <p className="text-secondary" style={{ marginTop: '.6rem', fontSize: '.84rem', lineHeight: 1.7 }}>
              {project.description || 'No description available for this project.'}
            </p>
          </section>

          {projectImages.length > 0 && (
            <section className="panel">
              <p className="eyebrow" style={{ margin: 0 }}>GALLERY</p>
              <h2 className="font-serif" style={{ fontWeight: 500, fontSize: '1.1rem', margin: '.2rem 0 0' }}>Project gallery</h2>
              <p className="muted" style={{ marginTop: '.25rem' }}>Browse {projectImages.length} public project {projectImages.length === 1 ? 'photo' : 'photos'}.</p>
              <ProjectGallery images={projectImages} projectName={project.name} />
            </section>
          )}

          {/* Updates & Timeline - like GovTrack */}
          <section className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>UPDATES & TIMELINE</p>
                <h2 className="font-serif" style={{ fontWeight: 500, fontSize: '1.1rem', margin: '.2rem 0 0' }}>Updates & timeline</h2>
                <p className="muted" style={{ marginTop: '.25rem' }}>Milestones, alerts, and news from the project timeline.</p>
              </div>
              <span className="bg-sunken border border-line-light rounded-[20px] text-tertiary" style={{ fontSize: '.62rem', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', padding: '.25rem .5rem', whiteSpace: 'nowrap' }}>
                {getTimeline(project).length} updates
              </span>
            </div>
            <div style={{ position: 'relative', marginTop: '.85rem', paddingLeft: 28 }}>
              <div className="rounded-[1px]" style={{ position: 'absolute', left: 13, top: 6, bottom: 6, width: 2, background: 'var(--border-light)' }} />
              {getTimeline(project).map(u => {
                const meta = updateMeta(u.type)
                const Icon = meta.Icon
                return (
                  <div key={`${u.date}-${u.title}`} style={{ display: 'flex', gap: '.75rem', position: 'relative', marginBottom: '.85rem' }}>
                    <span
                      className="rounded-full"
                      style={{
                        width: 28,
                        height: 28,
                        background: meta.bg,
                        color: meta.color,
                        display: 'grid',
                        placeItems: 'center',
                        border: `1px solid ${meta.color}14`,
                        flexShrink: 0,
                        zIndex: 1,
                      }}
                    >
                      <Icon size={13} />
                    </span>
                    <div className="bg-sunken border border-line-light rounded-[10px]" style={{ flex: 1, padding: '.65rem .75rem' }}>
                      <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className="rounded-[20px]" style={{ fontSize: '.6rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', padding: '.15rem .4rem', background: meta.bg, color: meta.color, border: `1px solid ${meta.color}14` }}>
                          {u.type}
                        </span>
                        <span className="text-tertiary" style={{ fontSize: '.64rem' }}>{u.date}</span>
                        <span className="text-tertiary" style={{ marginLeft: 'auto', fontSize: '.6rem', display: 'inline-flex', alignItems: 'center', gap: '.25rem' }}>
                          {project.source} <ExternalLink size={10} />
                        </span>
                      </div>
                      <strong style={{ display: 'block', fontSize: '.8rem', marginTop: '.3rem', lineHeight: 1.3 }}>{u.title}</strong>
                      <p className="text-secondary" style={{ margin: '.25rem 0 0', fontSize: '.72rem', lineHeight: 1.55 }}>{u.text}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>


          {/* Completion note if present */}
          {project.completionNote && (
            <section
              className="bg-primary-50 rounded-lg"
              style={{
                border: '1px solid rgba(13,124,95,.14)',
                padding: '1.1rem 1.2rem',
                display: 'flex',
                gap: '.7rem',
              }}
            >
              <div className="rounded-[8px] bg-primary text-white" style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Check size={16} />
              </div>
              <div>
                <strong className="text-primary" style={{ display: 'block', fontSize: '.82rem' }}>How it got done</strong>
                <p className="text-secondary" style={{ margin: '.3rem 0 0', fontSize: '.78rem', lineHeight: 1.6 }}>{project.completionNote}</p>
              </div>
            </section>
          )}

          {/* Management & contractors roster if present */}
          {(project.management || (project.contractors && project.contractors.length > 0)) && (
            <section className="panel">
              <p className="eyebrow" style={{ margin: 0 }}>ACCOUNTABILITY</p>
              <h2 className="font-serif" style={{ fontWeight: 500, fontSize: '1.15rem', margin: '.2rem 0 0' }}>Management &amp; contractors</h2>
              <p className="muted" style={{ marginTop: '.25rem' }}>Who runs this project and who holds the contracts, with official websites listed only where they could be verified.</p>
              {project.management && (
                <div className="bg-sunken border border-line-light rounded-[10px]" style={{ marginTop: '.75rem', padding: '.7rem .8rem', display: 'flex', flexDirection: 'column', gap: '.3rem', borderColor: 'rgba(13,124,95,.25)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', flexWrap: 'wrap' }}>
                    <small className="text-tertiary" style={{ fontSize: '.64rem', letterSpacing: '.04em' }}>MANAGED BY</small>
                    {project.management.website && (
                      <a href={project.management.website} target="_blank" rel="noreferrer" className="text-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', fontSize: '.68rem' }}>
                        Official website <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                  <strong style={{ fontSize: '.82rem' }}>{project.management.agency}</strong>
                  {project.management.person && (
                    <span className="text-secondary" style={{ fontSize: '.72rem' }}>{project.management.person}</span>
                  )}
                  {project.management.note && (
                    <p className="muted" style={{ margin: 0, fontSize: '.67rem', lineHeight: 1.5 }}>{project.management.note}</p>
                  )}
                </div>
              )}
              {project.contractors && project.contractors.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginTop: '.6rem' }}>
                  {project.contractors.map((c, i) => (
                    <div key={`${c.name}-${i}`} className="bg-sunken border border-line-light rounded-[10px]" style={{ padding: '.7rem .8rem', display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '.78rem' }}>{c.name}</strong>
                        <span className="text-tertiary bg-card border border-line-light rounded-[4px]" style={{ fontSize: '.64rem', padding: '.1rem .4rem' }}>{c.origin}</span>
                      </div>
                      <span className="text-secondary" style={{ fontSize: '.72rem' }}>{c.packages}</span>
                      {c.website && (
                        <a href={c.website} target="_blank" rel="noreferrer" className="text-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', fontSize: '.68rem' }}>
                          Official website <ExternalLink size={11} />
                        </a>
                      )}
                      {c.note && <p className="muted" style={{ margin: 0, fontSize: '.67rem', lineHeight: 1.5 }}>{c.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Checklist */}
          <section className="panel">
            <p className="eyebrow" style={{ margin: 0 }}>
              IMPLEMENTATION
            </p>
            <h2 className="font-serif" style={{ fontWeight: 500, fontSize: '1.15rem', margin: '.2rem 0 0' }}>Implementation checklist</h2>
            <p className="muted" style={{ marginTop: '.25rem' }}>Milestones mapped from the latest published progress record.</p>
            <div className="checklist" style={{ marginTop: '.75rem' }}>
              {project.checklist.map(item => (
                <div className="check-row" key={item.label}>
                  <ChecklistIcon state={item.state} />
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: '.8rem' }}>{item.label}</strong>
                    <p className="text-secondary" style={{ margin: '.15rem 0', fontSize: '.7rem', lineHeight: 1.5 }}>{item.note}</p>
                    <small className="text-tertiary bg-sunken rounded-[4px]" style={{ fontSize: '.64rem', padding: '.12rem .4rem' }}>{item.date}</small>
                  </div>
                  <StatusBadge status={item.state} />
                </div>
              ))}
            </div>
          </section>
          <section className="panel">
            <p className="eyebrow" style={{ margin: 0 }}>RECORD HISTORY</p>
            <h2 className="font-serif" style={{ fontWeight: 500, fontSize: '1.1rem', margin: '.2rem 0 0' }}>Project change log</h2>
            <p className="muted" style={{ marginTop: '.25rem' }}>Recorded changes to published project data, with the previous and updated values.</p>
            {project.changeLog?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', marginTop: '.75rem' }}>
                {project.changeLog.map((change, i) => (
                  <div key={`${change.date}-${change.field}-${i}`} className="bg-sunken border border-line-light rounded-[10px]" style={{ padding: '.7rem .8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '.78rem' }}>{change.field}</strong>
                      <span className="text-tertiary" style={{ fontSize: '.66rem' }}>{change.date}</span>
                    </div>
                    <p className="text-secondary" style={{ margin: '.4rem 0', fontSize: '.75rem', lineHeight: 1.5 }}>
                      <span className="text-tertiary">{change.from}</span> <ArrowRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong className="text-ink">{change.to}</strong>
                    </p>
                    <span className="text-tertiary" style={{ fontSize: '.66rem' }}>{change.source}</span>
                    <a href={change.sourceUrl} target="_blank" rel="noreferrer" className="text-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', fontSize: '.68rem', marginLeft: '.5rem' }}>Source <ExternalLink size={11} /></a>
                    {change.note && <p className="muted" style={{ margin: '.35rem 0 0', fontSize: '.67rem' }}>{change.note}</p>}
                  </div>
                ))}
              </div>
            ) : <p className="text-tertiary" style={{ margin: '.65rem 0 0', fontSize: '.74rem' }}>No value changes have been recorded for this project yet.</p>}
          </section>
        </div>

        {/* Sticky source card */}
        <aside className="detail-aside" style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="bg-card border border-line-light rounded-lg shadow-sm" style={{ padding: '1.1rem' }}>
            <div style={{ display: 'flex', gap: '.6rem' }}>
              <div className="rounded-[8px] bg-sunken text-primary" style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <FileText size={16} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '.82rem' }}>Source evidence</strong>
                <p className="text-secondary" style={{ margin: '.25rem 0 0', fontSize: '.72rem', lineHeight: 1.55 }}>
                  Progress reported by {project.source}. Spending and budget figures are shown only where the published record provides a usable figure. {PROJECT_FX_NOTE} <a href={PROJECT_FX_SOURCE} target="_blank" rel="noreferrer" className="text-primary">NRB rate source</a>
                </p>
                <p style={{ margin: '.6rem 0 0', fontSize: '.7rem' }}>
                  <span className="text-tertiary">Source:</span> <strong className="text-ink">{project.source}</strong>
                </p>
                <a
                  href={project.sourceUrl}
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
                <div style={{ marginTop: '.75rem', display: 'flex', flexDirection: 'column', gap: '.4rem', fontSize: '.72rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-tertiary">Budget</span>
                    <strong>{formatNprText(project.budget)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-tertiary">Spent</span>
                    <strong>{formatNprText(project.spent)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-tertiary">Status</span>
                    <StatusBadge status={project.status} />
                  </div>
                </div>
              </div>
            </div>
          </div>

           <div className="bg-sunken rounded-lg border border-line-light" style={{ padding: '1rem' }}>
            <strong style={{ display: 'block', fontSize: '.78rem' }}>Provenance</strong>
            <p className="text-secondary" style={{ margin: '.35rem 0 0', fontSize: '.68rem', lineHeight: 1.5 }}>
              Physical progress is based on the latest published progress report ({project.updated}). Dates in the checklist reflect the most recent indexed update; earlier milestones should be verified against primary documents.
            </p>
          </div>
          <RelatedDatasets query={project.category} title={`Open data: ${project.category}`} />
        </aside>
      </div>

      <style>{`@media (max-width: 900px) {
  .detail-grid { grid-template-columns: 1fr !important; }
  .detail-aside { position: static !important; }
}`}</style>
      <div className="border-t border-line-light" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1rem' }}>
        {prev ? (
          <Link href={`/projects/${slugify(prev.name)}`} className="text-secondary" style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.78rem', fontWeight: 600 }}>
            <ArrowLeft size={14} /> {prev.name}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/projects/${slugify(next.name)}`} className="text-secondary" style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.78rem', fontWeight: 600 }}>
            {next.name} <ArrowRight size={14} />
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  )
}
