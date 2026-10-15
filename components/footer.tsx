import Link from 'next/link'
import { Logo } from '@/components/logo'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <Logo size={28} showText />
            <p className="footer-tagline">
              Promoting transparency and accountability in Nepal&apos;s public sector through open data.
            </p>
          </div>

          <div className="footer-links">
            <div className="footer-col">
              <h4>Navigate</h4>
              <Link href="/">Overview</Link>
              <Link href="/companies">Companies</Link>
              <Link href="/projects">Projects</Link>
              <Link href="/procurement">Procurement</Link>
              <Link href="/economy">Economy</Link>
              <Link href="/environment">Environment</Link>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <Link href="/economy">Economy Data</Link>
              <Link href="/datasets">Open datasets</Link>
              <Link href="/sources">Source registry</Link>
              <a href="https://data.worldbank.org/country/nepal" target="_blank" rel="noreferrer">World Bank</a>
              <a href="https://www.nrb.org.np" target="_blank" rel="noreferrer">Nepal Rastra Bank</a>
            </div>
            <div className="footer-col">
              <h4>About</h4>
              <span>Open source project</span>
              <span>Data sourced from public records</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} Drishti. Public data for public good.</span>
          <span className="footer-meta">Built for transparency</span>
        </div>
      </div>
    </footer>
  )
}
