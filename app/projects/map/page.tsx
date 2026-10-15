import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { NationalMapLoader } from '@/components/national-map-loader'

export const metadata = {
  title: 'National Map — every project, plotted',
  description: 'Interactive map of Nepal: public projects, hydropower plants, tremors, weather stations and disaster incidents. Drill from province to district.',
}

export default function MapPage() {
  return (
    <div className="atlas-page">
      <NationalMapLoader />
      <div className="atlas-float atlas-title">
        <Link href="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', fontSize: '.66rem', fontWeight: 700 }} className="text-accent">
          <ArrowLeft size={13} /> Back to tracker
        </Link>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 500, letterSpacing: '-.03em', margin: '.25rem 0', color: 'var(--text)' }}>
          Nepal, plotted.
        </h1>
        <p style={{ fontSize: '.66rem', margin: 0, lineHeight: 1.5 }} className="text-secondary">
          Click a province to drill into districts. Project pins sit on district centroids (≈); hydro, tremors and stations are GPS-exact.
        </p>
      </div>
    </div>
  )
}
