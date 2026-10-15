'use client'

import { Cloud, CloudSun, CloudRain, CloudLightning, CloudFog, Sun, Snowflake, Wind } from 'lucide-react'
import type { SkyKind } from '@/lib/condition'

/** Lucide counterpart of a sky kind - for compact cards and badges. */
export function skyLucide(kind: SkyKind) {
  switch (kind) {
    case 'clear': return Sun
    case 'partly': return CloudSun
    case 'cloudy': return Cloud
    case 'rain': return CloudRain
    case 'storm': return CloudLightning
    case 'fog': return CloudFog
    case 'snow': return Snowflake
    case 'wind': return Wind
  }
}

/** Animated SVG sky icon - motion mirrors the actual condition. Pure CSS, no assets. */
export function WeatherIcon({ kind, size = 96 }: { kind: SkyKind; size?: number }) {
  const cloud = '#e8eef4'
  const dark = '#c3d2de'
  return (
    <svg className="wx" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={kind}>
      {(kind === 'clear' || kind === 'partly') && (
        <g className="wx-rays" stroke="#ffcf5c" strokeWidth="3" strokeLinecap="round">
          <circle cx={kind === 'clear' ? 32 : 22} cy={kind === 'clear' ? 32 : 22} r="10" fill="#ffd66b" stroke="none" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
            const cx = kind === 'clear' ? 32 : 22
            const cy = kind === 'clear' ? 32 : 22
            const r1 = 14
            const r2 = 18
            const rad = (a * Math.PI) / 180
            return (
              <line
                key={a}
                x1={cx + r1 * Math.cos(rad)} y1={cy + r1 * Math.sin(rad)}
                x2={cx + r2 * Math.cos(rad)} y2={cy + r2 * Math.sin(rad)}
              />
            )
          })}
        </g>
      )}
      {kind !== 'clear' && (
        <g className="wx-drift">
          <ellipse cx="36" cy="40" rx="16" ry="10" fill={cloud} />
          <ellipse cx="24" cy="44" rx="11" ry="7" fill={dark} />
          <ellipse cx="46" cy="44" rx="10" ry="7" fill={cloud} />
        </g>
      )}
      {(kind === 'rain' || kind === 'storm') && (
        <g stroke="#5aa9ff" strokeWidth="3" strokeLinecap="round">
          <line className="wx-drop" style={{ animationDelay: '0s' }} x1="26" y1="50" x2="24" y2="56" />
          <line className="wx-drop" style={{ animationDelay: '-1s' }} x1="36" y1="50" x2="34" y2="56" />
          <line className="wx-drop" style={{ animationDelay: '-2s' }} x1="46" y1="50" x2="44" y2="56" />
        </g>
      )}
      {kind === 'storm' && (
        <polygon className="wx-flash" points="34,44 26,56 32,56 28,64 40,52 33,52 38,44" fill="#ffd66b" />
      )}
      {kind === 'snow' && (
        <g fill="#bfe3ff">
          <circle className="wx-flake" style={{ animationDelay: '0s' }} cx="26" cy="52" r="2" />
          <circle className="wx-flake" style={{ animationDelay: '-1.2s' }} cx="36" cy="52" r="2" />
          <circle className="wx-flake" style={{ animationDelay: '-2.1s' }} cx="46" cy="52" r="2" />
        </g>
      )}
      {kind === 'fog' && (
        <g stroke="#9fb2c3" strokeWidth="3" strokeLinecap="round">
          <line className="wx-fogline" style={{ animationDelay: '0s' }} x1="20" y1="52" x2="44" y2="52" />
          <line className="wx-fogline" style={{ animationDelay: '-1.4s' }} x1="24" y1="58" x2="48" y2="58" />
        </g>
      )}
      {kind === 'wind' && (
        <g stroke="#7dd3c8" strokeWidth="3" strokeLinecap="round" fill="none">
          <path className="wx-fogline" style={{ animationDelay: '0s' }} d="M14,48 h26 a6,6 0 1,0 -6,-6" />
          <path className="wx-fogline" style={{ animationDelay: '-1.2s' }} d="M18,56 h30 a6,6 0 1,1 -6,6" />
        </g>
      )}
    </svg>
  )
}
