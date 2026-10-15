'use client'

import { Cloud, CloudSun, CloudMoon, CloudRain, CloudLightning, CloudFog, Sun, Moon, Snowflake, Wind } from 'lucide-react'
import type { SkyKind } from '@/lib/condition'

/** Lucide counterpart of a sky kind — for compact cards and badges. */
export function skyLucide(kind: SkyKind, night = false) {
  if (night) {
    switch (kind) {
      case 'clear': return Moon
      case 'partly': return CloudMoon
      case 'cloudy': return Cloud
      case 'rain': return CloudRain
      case 'storm': return CloudLightning
      case 'fog': return CloudFog
      case 'snow': return Snowflake
      case 'wind': return Wind
    }
  }
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
export function WeatherIcon({ kind, size = 96, night = false }: { kind: SkyKind; size?: number; night?: boolean }) {
  const cloud = '#e8eef4'
  const dark = '#c3d2de'
  const moonlit = night && (kind === 'clear' || kind === 'partly')
  const orbX = kind === 'clear' ? 32 : 22
  const orbY = kind === 'clear' ? 32 : 22
  return (
    <svg className="wx" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={kind}>
      {moonlit && (
        <>
          <circle cx={orbX} cy={orbY} r="15" fill="#1e2647" />
          <circle cx={orbX - 2} cy={orbY - 2} r="8" fill="#fdfbf0" style={{ filter: 'drop-shadow(0 0 8px rgba(240,235,200,.65))' }} />
          <circle cx={orbX - 5} cy={orbY - 5} r="1.8" fill="#d8d2b8" />
          <circle cx={orbX + 1} cy={orbY} r="1.3" fill="#d8d2b8" />
          <circle cx={orbX - 3} cy={orbY + 3} r="1" fill="#d8d2b8" />
          <circle className="wx-star" cx={orbX + 10} cy={orbY - 10} r="1.2" fill="#fff" />
          <circle className="wx-star" style={{ animationDelay: '-1s' }} cx={orbX - 11} cy={orbY - 8} r="1" fill="#fff" />
          <circle className="wx-star" style={{ animationDelay: '-2s' }} cx={orbX + 8} cy={orbY + 11} r="1" fill="#fff" />
          <circle className="wx-star" style={{ animationDelay: '-1.5s' }} cx={orbX - 12} cy={orbY + 6} r="0.9" fill="#fff" />
        </>
      )}
      {!moonlit && (kind === 'clear' || kind === 'partly') && (
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
