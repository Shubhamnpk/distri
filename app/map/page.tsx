import type { Metadata } from 'next'
import { NationalMapLoader } from '@/components/national-map-loader'

export const metadata: Metadata = {
  title: 'National Map of Nepal · Infrastructure, Hydro, Tremors & Live Sensors | Drishti',
  description: 'Full-screen interactive map of Nepal: public infrastructure projects, hydropower plants, earthquakes, weather stations, river flood levels and disaster incidents. Drill from province to district and palika.',
}

export default function MapPage() {
  return (
    <main className="atlas-page">
      <NationalMapLoader />
    </main>
  )
}
