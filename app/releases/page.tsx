import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowDownToLine,
  ArrowUpRight,
  CalendarDays,
  CircleDot,
  Clock3,
  GitBranch,
  GitCommitHorizontal,
  PackageCheck,
  Sparkles,
  Tag,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Releases | Drishti',
  description: 'Version history and release notes for Drishti, Nepal’s public data and civic intelligence platform.',
}

type GithubAsset = { name: string; browser_download_url: string; download_count: number; size: number }
type GithubRelease = {
  id: number
  name: string | null
  tag_name: string
  body: string | null
  html_url: string
  target_commitish: string
  published_at: string | null
  created_at: string
  prerelease: boolean
  draft: boolean
  assets: GithubAsset[]
}

const rawRepository = (process.env.NEXT_PUBLIC_GITHUB_REPOSITORY || process.env.GITHUB_REPOSITORY || 'Shubhamnpk/distri').trim()
const REPOSITORY = rawRepository.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '').replace(/\/+$/, '')
const validRepository = /^[\w.-]+\/[\w.-]+$/.test(REPOSITORY) ? REPOSITORY : null

async function getReleases(): Promise<{ releases: GithubRelease[]; failed: boolean }> {
  if (!validRepository) return { releases: [], failed: false }
  try {
    const response = await fetch(`https://api.github.com/repos/${validRepository}/releases?per_page=30`, {
      headers: {
        Accept: 'application/vnd.github+json',
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
      next: { revalidate: 3600 },
    })
    if (!response.ok) return { releases: [], failed: true }
    const releases = (await response.json()) as GithubRelease[]
    return { releases: releases.filter(release => !release.draft), failed: false }
  } catch {
    return { releases: [], failed: true }
  }
}

function formatReleaseDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'Asia/Kathmandu' }).format(new Date(value))
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function inlineMarkdown(text: string, keyPrefix: string) {
  const parts: React.ReactNode[] = []
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*/g
  let cursor = 0
  let match: RegExpExecArray | null
  let index = 0
  while ((match = pattern.exec(text))) {
    if (match.index > cursor) parts.push(text.slice(cursor, match.index))
    if (match[1] && match[2]) parts.push(<a key={`${keyPrefix}-${index}`} href={match[2]} target="_blank" rel="noreferrer">{match[1]}<ArrowUpRight size={11} /></a>)
    else if (match[3]) parts.push(<code key={`${keyPrefix}-${index}`}>{match[3]}</code>)
    else if (match[4]) parts.push(<strong key={`${keyPrefix}-${index}`}>{match[4]}</strong>)
    cursor = pattern.lastIndex
    index++
  }
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}

function ReleaseNotes({ body }: { body: string | null }) {
  const lines = (body ?? '').split(/\r?\n/)
  const blocks: React.ReactNode[] = []
  let bullets: { text: string; key: number }[] = []
  const flushBullets = () => {
    if (bullets.length) {
      blocks.push(<ul key={`list-${bullets[0].key}`}>{bullets.map(item => <li key={item.key}>{inlineMarkdown(item.text, `bullet-${item.key}`)}</li>)}</ul>)
      bullets = []
    }
  }
  lines.forEach((rawLine, index) => {
    const line = rawLine.trim()
    if (!line) { flushBullets(); return }
    const heading = line.match(/^#{1,4}\s+(.+)$/)
    if (heading) {
      flushBullets()
      blocks.push(<h4 key={`heading-${index}`}>{inlineMarkdown(heading[1], `heading-${index}`)}</h4>)
      return
    }
    const bullet = line.match(/^(?:[-*+]\s+|\d+\.\s+)(.+)$/)
    if (bullet) { bullets.push({ text: bullet[1], key: index }); return }
    flushBullets()
    blocks.push(<p key={`paragraph-${index}`}>{inlineMarkdown(line, `paragraph-${index}`)}</p>)
  })
  flushBullets()
  if (!blocks.length) return <p className="release-notes-empty">No release notes were added for this version.</p>
  return <div className="release-notes">{blocks}</div>
}

export default async function ReleasesPage() {
  const { releases, failed } = await getReleases()
  const latest = releases[0]
  const repositoryUrl = validRepository ? `https://github.com/${validRepository}` : null

  return (
    <main className="release-page">
      <section className="release-hero">
        <div className="release-hero-copy">
          <div className="release-kicker"><span className="release-kicker-mark"><Sparkles size={13} /></span> THE DRISHTI CHANGELOG</div>
          <h1>Built in the open.<br /><span>Improved over time.</span></h1>
          <p>A clear record of what changes in Drishti: new public data, sharper tools, and a more useful view of Nepal.</p>
          <div className="release-hero-actions">
            {repositoryUrl ? <a className="release-primary-link" href={`${repositoryUrl}/releases`} target="_blank" rel="noreferrer"><GitBranch size={16} /> View on GitHub <ArrowUpRight size={14} /></a> : <span className="release-primary-link release-link-disabled"><GitBranch size={16} /> GitHub releases</span>}
            <Link href="/sources" className="release-secondary-link">How we source data <ArrowUpRight size={14} /></Link>
          </div>
        </div>
        <div className="release-hero-art" aria-hidden="true">
          <div className="release-orbit release-orbit-one" /><div className="release-orbit release-orbit-two" />
          <div className="release-art-core"><span>दृष्टि</span><i /></div>
          <span className="release-art-coordinate release-art-coordinate-top">27°42′N · 85°19′E</span>
          <span className="release-art-coordinate release-art-coordinate-bottom">NEPAL · OPEN DATA</span>
        </div>
        <div className="release-hero-foot"><span><CircleDot size={13} /> Version history</span><span>{releases.length ? `${releases.length} published ${releases.length === 1 ? 'release' : 'releases'}` : 'A living project, openly documented'}</span></div>
      </section>

      <section className="release-overview" aria-label="Release summary">
        <div className="release-summary-card release-summary-featured">
          <div className="release-summary-icon"><PackageCheck size={18} /></div>
          <div><span className="release-summary-label">LATEST RELEASE</span><strong>{latest ? latest.name || latest.tag_name : validRepository ? 'No releases published yet' : 'Release archive'}</strong><small>{latest ? `${latest.tag_name} · ${formatReleaseDate(latest.published_at || latest.created_at)}` : 'Published versions will appear here'}</small></div>
          {latest && <span className="release-latest-badge">LATEST</span>}
        </div>
        <div className="release-summary-card">
          <div className="release-summary-icon"><GitCommitHorizontal size={18} /></div>
          <div><span className="release-summary-label">A PUBLIC RECORD</span><strong>Every release, in context</strong><small>Notes and downloads linked to GitHub</small></div>
        </div>
      </section>

      <section className="release-history-section">
        <div className="release-section-heading"><div><p className="eyebrow">CHANGE HISTORY</p><h2>Release archive</h2><p>Published versions, newest first. Each entry links back to its original GitHub release.</p></div>{repositoryUrl && <a href={`${repositoryUrl}/releases`} target="_blank" rel="noreferrer" className="release-archive-link">All GitHub releases <ArrowUpRight size={14} /></a>}</div>

        {failed ? (
          <div className="release-empty-state"><div className="release-empty-icon"><Clock3 size={20} /></div><h3>Release history is temporarily unavailable</h3><p>GitHub did not return the release archive. Try again in a little while.</p>{repositoryUrl && <a href={`${repositoryUrl}/releases`} target="_blank" rel="noreferrer">Open releases on GitHub <ArrowUpRight size={14} /></a>}</div>
        ) : releases.length ? (
          <div className="release-timeline">{releases.map((release, index) => (
            <article className="release-entry" key={release.id}>
              <div className="release-timeline-rail"><span className={`release-timeline-node${index === 0 ? ' is-latest' : ''}`} /><span className="release-timeline-line" /></div>
              <div className="release-card">
                <div className="release-card-topline"><span className={`release-channel${release.prerelease ? ' is-preview' : ''}`}><i />{release.prerelease ? 'PRE-RELEASE' : 'STABLE RELEASE'}</span><time dateTime={release.published_at || release.created_at}><CalendarDays size={13} />{formatReleaseDate(release.published_at || release.created_at)}</time></div>
                <div className="release-title-row"><div><h3>{release.name || release.tag_name}</h3><div className="release-version"><Tag size={13} />{release.tag_name}{release.target_commitish && <span>· {release.target_commitish}</span>}</div></div><a className="release-github-link" href={release.html_url} target="_blank" rel="noreferrer" aria-label={`View ${release.tag_name} on GitHub`}><GitBranch size={16} /><ArrowUpRight size={13} /></a></div>
                <ReleaseNotes body={release.body} />
                {release.assets.length > 0 && <div className="release-assets"><span className="release-assets-label">DOWNLOADS</span>{release.assets.map(asset => <a key={asset.name} href={asset.browser_download_url}><ArrowDownToLine size={13} /><span>{asset.name}</span><small>{formatSize(asset.size)}</small></a>)}</div>}
              </div>
            </article>
          ))}</div>
        ) : (
          <div className="release-empty-state"><div className="release-empty-icon"><Tag size={20} /></div><h3>{validRepository ? 'The first release is still ahead' : 'Connect the GitHub release archive'}</h3><p>{validRepository ? 'There are no published GitHub releases yet. Once a version is published, its notes and downloads will appear here automatically.' : 'Set NEXT_PUBLIC_GITHUB_REPOSITORY to owner/repository to connect this page to the project’s published releases.'}</p>{repositoryUrl ? <a href={`${repositoryUrl}/releases/new`} target="_blank" rel="noreferrer">Publish a release on GitHub <ArrowUpRight size={14} /></a> : <span className="release-config-hint">Waiting for this project’s repository address</span>}</div>
        )}
      </section>
    </main>
  )
}
