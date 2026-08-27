'use client'

import { useTheme } from '@/components/theme-provider'

type LogoProps = {
  size?: number
  showText?: boolean
}

export function Logo({ size = 32, showText = true }: LogoProps) {
  const { theme } = useTheme()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Drishti logo"
      >
        {/* Outer circle - represents vision/awareness */}
        <circle cx="24" cy="24" r="22" stroke={theme === 'dark' ? '#34c99a' : '#0d7c5f'} strokeWidth="2.5" opacity="0.2" />

        {/* Inner eye shape */}
        <path
          d="M24 10C16 10 10 18 10 24C10 30 16 38 24 38C32 38 38 30 38 24C38 18 32 10 24 10Z"
          stroke={theme === 'dark' ? '#34c99a' : '#0d7c5f'}
          strokeWidth="2"
          fill={theme === 'dark' ? '#0f2e23' : '#e6f5ef'}
        />

        {/* Iris */}
        <circle cx="24" cy="24" r="7" fill={theme === 'dark' ? '#34c99a' : '#0d7c5f'} />

        {/* Pupil */}
        <circle cx="24" cy="24" r="3" fill={theme === 'dark' ? '#0a0f14' : '#ffffff'} />

        {/* Light reflection */}
        <circle cx="21.5" cy="21.5" r="1.5" fill="white" opacity="0.8" />

        {/* Mountain silhouette - representing Nepal */}
        <path
          d="M12 32L18 24L22 28L28 20L36 32"
          stroke={theme === 'dark' ? '#d9a243' : '#b87d2a'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.6"
        />
      </svg>
      {showText && (
        <div style={{ lineHeight: 1.1 }}>
          <strong style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.35rem',
            letterSpacing: '-.04em',
            color: 'var(--text)',
          }}>
            Drishti
          </strong>
          <small style={{
            display: 'block',
            fontSize: '.52rem',
            letterSpacing: '.2em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
            marginTop: '1px',
          }}>
            Nepal Accountability
          </small>
        </div>
      )}
    </div>
  )
}
