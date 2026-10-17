'use client'

import dynamic from 'next/dynamic'

const NationalMap = dynamic(() => import('@/components/national-map').then(m => m.NationalMap), {
  ssr: false,
  loading: () => (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg, #0a0f14)',
        color: 'var(--text, #dce3e8)',
        zIndex: 9999,
      }}
    >
      <div style={{ position: 'relative', width: 64, height: 64, marginBottom: 16 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2.5px solid var(--accent, #34c99a)',
            opacity: 0.25,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2.5px solid transparent',
            borderTopColor: 'var(--accent, #34c99a)',
            animation: 'spin 0.9s linear infinite',
          }}
        />
      </div>
      <strong style={{ fontSize: '0.95rem', letterSpacing: '-0.02em', fontWeight: 600 }}>
        Loading Nepal National Atlas…
      </strong>
      <p style={{ fontSize: '0.75rem', opacity: 0.6, margin: '6px 0 0' }}>
        Streaming projects, hydro registers, tremors and hydrological sensors
      </p>
    </div>
  ),
})

export function NationalMapLoader() {
  return <NationalMap />
}
