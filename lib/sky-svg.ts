// Tiny inline-SVG sky pins for Leaflet divIcons (no image assets, no extra deps).
// Mirrors components/weather-icon kinds, including the night moon.

import type { SkyKind } from './condition'

const RAYS = [0, 45, 90, 135, 180, 225, 270, 315]
  .map(a => {
    const r = (a * Math.PI) / 180
    const x1 = 13 + 6 * Math.cos(r)
    const y1 = 13 + 6 * Math.sin(r)
    const x2 = 13 + 8.5 * Math.cos(r)
    const y2 = 13 + 8.5 * Math.sin(r)
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`
  })
  .join('')

const CLOUD = `<ellipse cx="14" cy="16" rx="7" ry="4.5" fill="#dbe6ef"/><ellipse cx="9" cy="18" rx="5" ry="3.4" fill="#c3d2de"/><ellipse cx="19" cy="18" rx="4.6" ry="3.2" fill="#dbe6ef"/>`

function drops(color: string): string {
  return [10, 15, 20]
    .map((x, i) => `<line x1="${x}" y1="${21 + i}" x2="${x - 1}" y2="${24 + i}" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>`)
    .join('')
}

/** Hydropower sigil: a white bolt rising over twin river waves on deep teal.
 *  Fixed 26px art (badge sized by CSS to match weather pins); MW shown in tooltip. */
export function hydroPinSvg(_mw: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">` +
    `<path d="M4,19 q3,-2.5 6,0 t6,0 t6,0" stroke="#38bdf8" stroke-width="1.8" fill="none" stroke-linecap="round"/>` +
    `<path d="M5,22.5 q2.5,-2 5,0 t5,0 t5,0" stroke="#0ea5e9" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/>` +
    `<polygon points="14.5,3 8.5,13 12.3,13 10.8,19.5 17.5,10.5 13.7,10.5 15.2,3" fill="#fff" style="filter:drop-shadow(0 0 2px rgba(255,255,255,.7))"/>` +
    `</svg>`
}

/** Cracked-house quake mark: tilted home split by a jagged crack, severity-tinted. */
export function quakePinSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26" stroke-linecap="round" stroke-linejoin="round">` +
    `<g transform="rotate(-6 13 14)">` +
    `<polygon points="5,12.5 13,5.5 21,12.5" fill="${color}"/>` +
    `<rect x="7" y="12.5" width="12" height="8" fill="${color}"/>` +
    `<rect x="11.8" y="16" width="2.6" height="4.5" fill="#fff" opacity=".9"/>` +
    `<polyline points="12.6,5.2 14.2,9 11.6,12 14,15 12.2,20.6" fill="none" stroke="#fff" stroke-width="1.7"/>` +
    `</g>` +
    `<circle cx="21.5" cy="7" r="1" fill="${color}" opacity=".6"/>` +
    `<circle cx="4.5" cy="8" r="0.9" fill="${color}" opacity=".45"/>` +
    `</svg>`
}
export function skyMarkerSvg(kind: SkyKind, night: boolean): string {
  const moonlit = night && (kind === 'clear' || kind === 'partly')
  let inner = night ? '<circle cx="13" cy="13" r="11.5" fill="#1e2647"/>' : ''
  if (moonlit) {
    inner += `<circle cx="12" cy="12" r="6" fill="#fdfbf0"/><circle cx="10" cy="10" r="1.3" fill="#d8d2b8"/><circle cx="14" cy="13.5" r="1" fill="#d8d2b8"/><circle cx="20" cy="5" r="1" fill="#fff"/><circle cx="5" cy="7" r="0.8" fill="#fff"/><circle cx="21" cy="20" r="0.8" fill="#fff"/>`
    if (kind === 'partly') inner += CLOUD
  } else if (kind === 'clear' || kind === 'partly') {
    inner += `<g stroke="#f5b942" stroke-width="2" stroke-linecap="round"><circle cx="13" cy="13" r="5" fill="#ffd66b" stroke="none"/>${RAYS}</g>`
    if (kind === 'partly') inner += CLOUD
  } else if (kind === 'rain' || kind === 'storm') {
    inner += `${CLOUD}${drops('#5aa9ff')}`
    if (kind === 'storm') inner += `<polygon points="14,17 10,23 13,23 11,27 17,21 13.5,21 16,17" fill="#ffd66b"/>`
  } else if (kind === 'snow') {
    inner += `${CLOUD}<circle cx="10" cy="22" r="1.3" fill="#bfe3ff"/><circle cx="15" cy="23" r="1.3" fill="#bfe3ff"/><circle cx="19" cy="22" r="1.3" fill="#bfe3ff"/>`
  } else if (kind === 'fog') {
    inner += `${CLOUD}<line x1="8" y1="22" x2="19" y2="22" stroke="#9fb2c3" stroke-width="1.8" stroke-linecap="round"/><line x1="10" y1="25" x2="21" y2="25" stroke="#9fb2c3" stroke-width="1.8" stroke-linecap="round"/>`
  } else if (kind === 'wind') {
    inner += `<path d="M5,12 h12 a4,4 0 1,0 -4,-4" stroke="#5ec8bb" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M7,18 h14 a4,4 0 1,1 -4,4" stroke="#5ec8bb" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
  } else {
    inner += CLOUD
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">${inner}</svg>`
}
