'use client'

import { Building2 } from 'lucide-react'

export function CompanyLogo({
  src,
  alt,
  size = 36,
  isProfit,
  rounded = 8,
}: {
  src?: string
  alt: string
  size?: number
  isProfit?: boolean
  rounded?: number
}) {
  if (!src) {
    return (
      <span
        style={{
          display: 'grid',
          placeItems: 'center',
          width: size,
          height: size,
          borderRadius: rounded,
          background: isProfit === undefined ? 'var(--bg-sunken)' : isProfit ? 'var(--primary-50)' : 'var(--danger-light)',
          color: isProfit === undefined ? 'var(--text-tertiary)' : isProfit ? 'var(--primary)' : 'var(--danger)',
          flexShrink: 0,
        }}
      >
        <Building2 size={size * 0.5} />
      </span>
    )
  }

  return (
    <span
      className="border border-line-light bg-white"
      style={{
        display: 'grid',
        placeItems: 'center',
        width: size,
        height: size,
        borderRadius: rounded,
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
        padding: 4,
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          background: isProfit === undefined ? 'var(--bg-sunken)' : isProfit ? 'var(--primary-50)' : 'var(--danger-light)',
          color: isProfit === undefined ? 'var(--text-tertiary)' : isProfit ? 'var(--primary)' : 'var(--danger)',
        }}
      >
        <Building2 size={size * 0.45} />
      </span>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain' }}
        onError={e => {
          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
        }}
      />
    </span>
  )
}
