'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUp, ArrowUpRight } from 'lucide-react'
import { Logo } from '@/components/logo'
import { companies, projects, sources } from '@/lib/data'

const exploreLinks = [
  { href: '/', label: 'Overview' },
  { href: '/companies', label: 'Companies' },
  { href: '/market', label: 'Market' },
  { href: '/projects', label: 'Projects' },
  { href: '/map', label: 'National Map' },
  { href: '/procurement', label: 'Procurement' },
  { href: '/economy', label: 'Economy' },
  { href: '/environment', label: 'Environment' },
  { href: '/disasters', label: 'Disasters' },
]

const liveDataLinks = [
  { href: 'https://www.nrb.org.np/api-docs-v1/', label: 'NRB forex API' },
  { href: 'https://data.worldbank.org/country/nepal', label: 'World Bank · Nepal' },
  { href: 'https://opendatanepal.com', label: 'Open Data Nepal' },
  { href: 'https://datanepal.org', label: 'DataNepal registry' },
  { href: 'https://hydro.naxa.com.np', label: 'Naxa hydro portal' },
  { href: 'https://data.open-contracting.org/en/publication/36', label: 'OCDS tender archive' },
]

const projectLinks = [
  { href: '/datasets', label: 'Open datasets' },
  { href: '/sources', label: 'Source registry' },
  { href: '/procurement', label: 'Tender archive' },
  { href: '/releases', label: 'Release history' },
]

export function Footer() {
  const pathname = usePathname()
  // Full-bleed atlas route renders its own chrome.
  if (pathname === '/map' || pathname === '/projects/map') return null

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <Logo size={28} showText />
            <p className="footer-tagline">
              Promoting transparency and accountability in Nepal&apos;s public sector through open data.
            </p>
            <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap', marginTop: '.85rem' }}>
              {[
                `${companies.length} enterprises`,
                `${projects.length} projects`,
                `${sources.length} sources`,
              ].map(chip => (
                <span
                  key={chip}
                  style={{
                    fontSize: '.62rem', fontWeight: 700, color: 'var(--accent)',
                    background: 'var(--accent-light)', padding: '.25rem .55rem', borderRadius: 20,
                    border: '1px solid var(--accent)', whiteSpace: 'nowrap',
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="footer-links">
            <div className="footer-col">
              <h4>Explore</h4>
              {exploreLinks.map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={isActive(l.href) ? 'page' : undefined}
                  style={isActive(l.href) ? { color: 'var(--accent)', fontWeight: 700 } : undefined}
                >
                  {l.label}
                </Link>
              ))}
            </div>
            <div className="footer-col">
              <h4>Live data</h4>
              {liveDataLinks.map(l => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '.2rem' }}
                >
                  {l.label}
                  <ArrowUpRight size={11} style={{ flexShrink: 0 }} />
                </a>
              ))}
            </div>
            <div className="footer-col">
              <h4>Drishti</h4>
              {projectLinks.map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={isActive(l.href) ? 'page' : undefined}
                  style={isActive(l.href) ? { color: 'var(--accent)', fontWeight: 700 } : undefined}
                >
                  {l.label}
                </Link>
              ))}
              <span>Open source project</span>
              <span>Data sourced from public records</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} Drishti · Public data for public good.</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.9rem' }}>
            <span className="footer-meta">Built from published records · live where marked</span>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '.25rem',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '.68rem', fontWeight: 700, color: 'var(--accent)', padding: 0,
              }}
              aria-label="Back to top"
            >
              Top <ArrowUp size={12} />
            </button>
          </span>
        </div>
      </div>
    </footer>
  )
}
