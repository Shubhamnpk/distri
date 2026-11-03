import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CircleHelp, ExternalLink, Eye, FileCheck2, Scale } from 'lucide-react'
import { companies, projects, sources } from '@/lib/data'

export const metadata: Metadata = {
  title: 'About Drishti and our data methodology',
  description: 'Learn what Drishti stands for, how it brings Nepal public records together, and how to trace figures back to their sources.',
  alternates: { canonical: '/about' },
}

const principles = [
  {
    icon: Eye,
    number: '01',
    title: 'Make public records easier to see',
    text: 'Useful information is often spread across reports, portals and data feeds. Drishti brings those records into one place so people can explore them without losing sight of where they came from.',
  },
  {
    icon: FileCheck2,
    number: '02',
    title: 'Put evidence before claims',
    text: 'A figure should come with its publisher, reporting period and source notes wherever those details are available. The original source remains the authority for its record.',
  },
  {
    icon: Scale,
    number: '03',
    title: 'Keep context attached',
    text: 'Budgets, spending, progress and economic indicators can use different periods and definitions. Notes help explain those differences before numbers are compared.',
  },
  {
    icon: CircleHelp,
    number: '04',
    title: 'Be clear about what is unknown',
    text: 'Public data can be late, incomplete or unavailable. Drishti aims to show those gaps honestly instead of presenting missing values as facts.',
  },
]

const areas = [
  ['/companies', 'Public companies', 'Financial reports and public enterprise records'],
  ['/projects', 'Infrastructure projects', 'Budgets, reported progress and project evidence'],
  ['/procurement', 'Procurement', 'Public tender and contract records'],
  ['/economy', 'Economy', 'National indicators and forecasts'],
  ['/market', 'NEPSE market', 'Market activity, listed companies and disclosures'],
  ['/places', 'Places in Nepal', 'Province, district and local unit profiles'],
  ['/environment', 'Environment', 'Weather, air quality, rivers and earthquakes'],
  ['/datasets', 'Open datasets', 'Searchable datasets from public data portals'],
]

export default function AboutPage() {
  return (
    <main className="content-wrap about-page">
      <section className="about-hero">
        <div className="about-hero-copy">
          <p className="eyebrow">ABOUT DRISHTI</p>
          <h1>Public data belongs in public view.</h1>
          <p className="about-lede">
            Drishti is an open-source civic data project that makes Nepal&apos;s public records easier to find, understand and verify. It brings information about public companies, infrastructure, the economy, places and the environment into one clear view.
          </p>
          <div className="about-actions">
            <Link href="/sources" className="cta-primary">See our sources <ArrowRight size={15} /></Link>
            <Link href="#ideology" className="cta-ghost">What we believe</Link>
          </div>
        </div>

        <aside className="about-snapshot" aria-label="Drishti public data coverage">
          <img
            className="about-snapshot-image"
            src="/images/nepal-infrastructure-about.webp"
            alt="Illustrative image of road construction in a mountainous landscape"
            width={1024}
            height={1024}
          />
          <div className="about-snapshot-content">
            <p className="eyebrow">THE IDEA</p>
            <p className="about-snapshot-quote">Evidence first.<br /><span>Context always.</span></p>
            <div className="about-snapshot-stats">
              <div><strong>{companies.length}</strong><span>public enterprises</span></div>
              <div><strong>{projects.length}</strong><span>infrastructure projects</span></div>
              <div><strong>{sources.length}</strong><span>listed sources</span></div>
            </div>
            <p className="about-snapshot-note">Coverage reflects the records currently catalogued in Drishti. Image is illustrative.</p>
          </div>
        </aside>
      </section>

      <section id="ideology" className="about-section">
        <div className="about-section-heading">
          <p className="eyebrow">OUR IDEOLOGY</p>
          <h2>Public information should be useful, traceable and open to question.</h2>
          <p>We believe people should be able to follow a number back to its source, understand what it measures, and see where the record leaves questions unanswered.</p>
        </div>
        <div className="about-principles">
          {principles.map(({ icon: Icon, number, title, text }) => (
            <article className="about-principle" key={number}>
              <div className="about-principle-top"><span>{number}</span><span className="about-principle-icon"><Icon size={17} aria-hidden="true" /></span></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="methodology" className="about-methodology">
        <div>
          <p className="eyebrow">HOW TO READ DRISHTI</p>
          <h2>A guide to the records</h2>
          <p>Drishti is an index and analysis interface, not the original record holder. Use it to explore and compare; follow the source link when you need the complete document or the latest official revision.</p>
        </div>
        <ol className="about-method-list">
          <li><span>01</span><div><strong>Start with the source</strong><p>Publishers and source links are listed in the <Link href="/sources">public source registry</Link> and alongside records where available.</p></div></li>
          <li><span>02</span><div><strong>Check the reporting period</strong><p>Publication date, reporting year and live update time can mean different things. Read the labels and notes on each page.</p></div></li>
          <li><span>03</span><div><strong>Compare like with like</strong><p>Project figures may use different cost estimates, dates or progress measures. Notes explain known differences; unlike measures should not be treated as directly comparable.</p></div></li>
          <li><span>04</span><div><strong>Report a correction with evidence</strong><p>If a record looks wrong or its source has changed, send the page and supporting source to the <a href="https://github.com/Shubhamnpk/distri/issues" target="_blank" rel="noreferrer">project issue tracker <ExternalLink size={12} /></a>.</p></div></li>
        </ol>
      </section>

      <section className="about-explore">
        <div className="about-section-heading">
          <p className="eyebrow">EXPLORE</p>
          <h2>Follow the public record across Nepal</h2>
        </div>
        <div className="about-area-grid">
          {areas.map(([href, title, description]) => (
            <Link href={href} className="about-area-link" key={href}>
              <span><strong>{title}</strong><small>{description}</small></span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <div className="about-open-source">
        <div><strong>Built in the open.</strong><span>Drishti is an open-source project. Explore the code, report an issue or help improve the public record.</span></div>
        <a href="https://github.com/Shubhamnpk/distri" target="_blank" rel="noreferrer" className="outline-button">View project on GitHub <ExternalLink size={14} /></a>
      </div>
    </main>
  )
}
