import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, ExternalLink, FileText, Check, Clock, AlertTriangle, HelpCircle, MapPin, Megaphone, Bell } from 'lucide-react'
import { projects, slugify, findProjectBySlug, parseBudgetCr, utilizationPct } from '@/lib/data'
import { StatusBadge } from '@/components/shared'
import { ProjectCommunityContext } from '@/components/community-panel'
import { RelatedDatasets } from '@/components/related-datasets'
import type { ProjectUpdate } from '@/lib/types'

export function generateStaticParams() {
  return projects.map(p => ({ slug: slugify(p.name) }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = findProjectBySlug(slug)
  if (!project) return { title: 'Project not found — Drishti' }
  return {
    title: `${project.name} — Drishti`,
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
      title: `${project.progress}% — ${project.status}`,
      text: `${project.category} · ${project.ministry}. Budget ${project.budget}, spent ${project.spent}. Target ${project.target}. Source: ${project.source}.`,
      type: type as ProjectUpdate['type'],
    },
  ]
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = findProjectBySlug(slug)
  if (!project) notFound()

  const idx = projects.findIndex(p => slugify(p.name) === slug)
  const prev = idx > 0 ? projects[idx - 1] : null
  const next = idx < projects.length - 1 ? projects[idx + 1] : null

  return (
    <div className="content-wrap">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <Link
          href="/projects"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontSize: '.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={16} /> Back to projects
        </Link>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          {prev ? (
            <Link
              href={`/projects/${slugify(prev.name)}`}
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
              <ArrowLeft size={13} /> {prev.name.length > 20 ? prev.name.slice(0, 20) + '…' : prev.name}
            </Link>
          ) : (
            <span style={{ fontSize: '.72rem', padding: '.4rem .65rem', borderRadius: 6, border: '1px solid var(--border-light)', color: 'var(--text-tertiary)', background: 'var(--bg-sunken)' }}>
              No previous
            </span>
          )}
          {next ? (
            <Link
              href={`/projects/${slugify(next.name)}`}
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
              {next.name.length > 20 ? next.name.slice(0, 20) + '…' : next.name} <ArrowRight size={13} />
            </Link>
          ) : (
            <span style={{ fontSize: '.72rem', padding: '.4rem .65rem', borderRadius: 6, border: '1px solid var(--border-light)', color: 'var(--text-tertiary)', background: 'var(--bg-sunken)' }}>
              No next
            </span>
          )}
        </div>
      </div>

      {/* Hero image */}
      <section
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '1rem',
        }}
      >
        <div style={{ position: 'relative', height: 'clamp(200px, 32vw, 320px)', overflow: 'hidden', background: 'var(--bg-sunken)' }}>
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
          <div style={{ position: 'absolute', left: 'clamp(1rem, 3vw, 1.6rem)', right: 'clamp(1rem, 3vw, 1.6rem)', bottom: 'clamp(1rem, 2.5vw, 1.4rem)', color: '#fff' }}>
            <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '.5rem' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '.3rem',
                  fontSize: '.62rem',
                  fontWeight: 700,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  background: 'rgba(255,255,255,.9)',
                  color: 'var(--text)',
                  padding: '.25rem .5rem',
                  borderRadius: 20,
                }}
              >
                {project.category}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '.3rem',
                  fontSize: '.62rem',
                  fontWeight: 700,
                  padding: '.25rem .55rem',
                  borderRadius: 20,
                  background: statusColor(project.status),
                  color: '#fff',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                {project.status} · {project.progress}%
              </span>
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
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
              { label: 'Budget', value: project.budget, extra: parseBudgetCr(project.budget) != null ? `${parseBudgetCr(project.budget)!.toLocaleString()} Cr` : null },
              { label: 'Spent', value: project.spent, extra: utilizationPct(project.spent, project.budget) != null ? `${utilizationPct(project.spent, project.budget)}% utilized` : parseBudgetCr(project.spent) != null ? `${parseBudgetCr(project.spent)!.toLocaleString()} Cr` : null },
              { label: 'Target', value: project.target, extra: null },
              { label: 'Updated', value: project.updated, extra: null },
              { label: 'Progress', value: `${project.progress}%`, extra: null },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg-sunken)', borderRadius: 10, padding: '.75rem .85rem' }}>
                <span style={{ fontSize: '.6rem', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-tertiary)' }}>{s.label}</span>
                <strong style={{ display: 'block', fontSize: '.92rem', marginTop: '.15rem', letterSpacing: '-.01em' }}>{s.value}</strong>
                {s.extra && <span style={{ fontSize: '.64rem', color: 'var(--text-tertiary)', background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', padding: '.1rem .35rem', borderRadius: 20, display: 'inline-block', marginTop: '.25rem' }}>{s.extra}</span>}
              </div>
            ))}
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.66rem', color: 'var(--text-tertiary)', marginBottom: '.3rem' }}>
              <span>Physical progress</span>
              <strong style={{ color: 'var(--text)', fontSize: '.78rem' }}>{project.progress}%</strong>
            </div>
            <div className="progress-track" style={{ height: 8, borderRadius: 20 }}>
              <span style={{ width: `${project.progress}%`, background: statusColor(project.status), borderRadius: 20 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.45rem' }}>
              <StatusBadge status={project.status} />
              <span style={{ fontSize: '.64rem', color: 'var(--text-tertiary)' }}>{project.category} · {project.ministry}</span>
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
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1.15rem', margin: '.2rem 0 0' }}>About this project</h2>
            <p style={{ marginTop: '.6rem', fontSize: '.84rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
              {project.description || 'No description available for this project.'}
            </p>
          </section>

          {project.gallery && project.gallery.length > 0 && (
            <section className="panel">
              <p className="eyebrow" style={{ margin: 0 }}>GALLERY</p>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1.1rem', margin: '.2rem 0 0' }}>Project gallery</h2>
              <p className="muted" style={{ marginTop: '.25rem' }}>Photos from Wikimedia / official sources · click to open</p>
              <div style={{ display: 'flex', gap: '.5rem', marginTop: '.75rem', overflowX: 'auto', paddingBottom: 4 }}>
                {project.gallery.map(src => (
                  <a key={src} href={src} target="_blank" rel="noreferrer" style={{ flexShrink: 0 }}>
                    <img src={src} alt="" style={{ width: 160, height: 110, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-light)', display: 'block' }} loading="lazy" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Updates & Timeline — like GovTrack */}
          <section className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>UPDATES & TIMELINE</p>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1.1rem', margin: '.2rem 0 0' }}>Updates & timeline</h2>
                <p className="muted" style={{ marginTop: '.25rem' }}>Milestones, alerts, and news from the project timeline.</p>
              </div>
              <span style={{ fontSize: '.62rem', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', background: 'var(--bg-sunken)', border: '1px solid var(--border-light)', padding: '.25rem .5rem', borderRadius: 20, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                {getTimeline(project).length} updates
              </span>
            </div>
            <div style={{ position: 'relative', marginTop: '.85rem', paddingLeft: 28 }}>
              <div style={{ position: 'absolute', left: 13, top: 6, bottom: 6, width: 2, background: 'var(--border-light)', borderRadius: 1 }} />
              {getTimeline(project).map(u => {
                const meta = updateMeta(u.type)
                const Icon = meta.Icon
                return (
                  <div key={`${u.date}-${u.title}`} style={{ display: 'flex', gap: '.75rem', position: 'relative', marginBottom: '.85rem' }}>
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
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
                    <div style={{ flex: 1, background: 'var(--bg-sunken)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '.65rem .75rem' }}>
                      <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '.6rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', padding: '.15rem .4rem', borderRadius: 20, background: meta.bg, color: meta.color, border: `1px solid ${meta.color}14` }}>
                          {u.type}
                        </span>
                        <span style={{ fontSize: '.64rem', color: 'var(--text-tertiary)' }}>{u.date}</span>
                        <span style={{ marginLeft: 'auto', fontSize: '.6rem', color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: '.25rem' }}>
                          {project.source} <ExternalLink size={10} />
                        </span>
                      </div>
                      <strong style={{ display: 'block', fontSize: '.8rem', marginTop: '.3rem', lineHeight: 1.3 }}>{u.title}</strong>
                      <p style={{ margin: '.25rem 0 0', fontSize: '.72rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>{u.text}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Completion note if present */}
          {project.completionNote && (
            <section
              style={{
                background: 'var(--primary-50)',
                border: '1px solid rgba(13,124,95,.14)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.1rem 1.2rem',
                display: 'flex',
                gap: '.7rem',
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary)', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Check size={16} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '.82rem', color: 'var(--primary)' }}>How it got done</strong>
                <p style={{ margin: '.3rem 0 0', fontSize: '.78rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{project.completionNote}</p>
              </div>
            </section>
          )}

          {/* Checklist */}
          <section className="panel">
            <p className="eyebrow" style={{ margin: 0 }}>
              IMPLEMENTATION
            </p>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1.15rem', margin: '.2rem 0 0' }}>Implementation checklist</h2>
            <p className="muted" style={{ marginTop: '.25rem' }}>Milestones mapped from the latest published progress record.</p>
            <div className="checklist" style={{ marginTop: '.75rem' }}>
              {project.checklist.map(item => (
                <div className="check-row" key={item.label}>
                  <ChecklistIcon state={item.state} />
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: '.8rem' }}>{item.label}</strong>
                    <p style={{ margin: '.15rem 0', fontSize: '.7rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.note}</p>
                    <small style={{ fontSize: '.64rem', color: 'var(--text-tertiary)', background: 'var(--bg-sunken)', padding: '.12rem .4rem', borderRadius: 4 }}>{item.date}</small>
                  </div>
                  <StatusBadge status={item.state} />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sticky source card */}
        <aside className="detail-aside" style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1.1rem', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', gap: '.6rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-sunken)', display: 'grid', placeItems: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                <FileText size={16} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '.82rem' }}>Source evidence</strong>
                <p style={{ margin: '.25rem 0 0', fontSize: '.72rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                  Progress reported by {project.source}. Spending and budget figures are shown only where the published record provides a usable figure.
                </p>
                <p style={{ margin: '.6rem 0 0', fontSize: '.7rem' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Source:</span> <strong style={{ color: 'var(--text)' }}>{project.source}</strong>
                </p>
                <a
                  href={project.sourceUrl}
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
                <div style={{ marginTop: '.75rem', display: 'flex', flexDirection: 'column', gap: '.4rem', fontSize: '.72rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Budget</span>
                    <strong>{project.budget}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Spent</span>
                    <strong>{project.spent}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Status</span>
                    <StatusBadge status={project.status} />
                  </div>
                </div>
              </div>
            </div>
          </div>

           <div style={{ background: 'var(--bg-sunken)', borderRadius: 'var(--radius-lg)', padding: '1rem', border: '1px solid var(--border-light)' }}>
            <strong style={{ display: 'block', fontSize: '.78rem' }}>Provenance</strong>
            <p style={{ margin: '.35rem 0 0', fontSize: '.68rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Physical progress is based on the latest published progress report ({project.updated}). Dates in the checklist reflect the most recent indexed update; earlier milestones should be verified against primary documents.
            </p>
          </div>
          <ProjectCommunityContext location={project.location} />
          <RelatedDatasets query={project.category} title={`Open data: ${project.category}`} />
        </aside>
      </div>

      <style>{`@media (max-width: 900px) {
  .detail-grid { grid-template-columns: 1fr !important; }
  .detail-aside { position: static !important; }
}`}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
        {prev ? (
          <Link href={`/projects/${slugify(prev.name)}`} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', color: 'var(--text-secondary)', fontSize: '.78rem', fontWeight: 600 }}>
            <ArrowLeft size={14} /> {prev.name}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/projects/${slugify(next.name)}`} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', color: 'var(--text-secondary)', fontSize: '.78rem', fontWeight: 600 }}>
            {next.name} <ArrowRight size={14} />
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  )
}
