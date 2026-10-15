'use client'

import dynamic from 'next/dynamic'

const NationalMap = dynamic(() => import('@/components/national-map').then(m => m.NationalMap), {
  ssr: false,
  loading: () => (
    <div style={{ height: 'min(80vh, 780px)', display: 'grid', placeItems: 'center', fontSize: '.8rem' }} className="bg-sunken text-tertiary rounded-lg border border-line-light">
      Loading the national atlas…
    </div>
  ),
})

export function NationalMapLoader() {
  return <NationalMap />
}
