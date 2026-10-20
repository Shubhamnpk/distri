// Inline-SVG incident pins for Leaflet divIcons — same approach as the hydro and
// quake marks in sky-svg.ts. BIPAD's own hazard art is 24px line art, which turns
// to mush at map-pin size, so each hazard family gets a bold white glyph on the
// hazard's own colour instead.

const GLYPH: Record<string, string> = {
  snake: `<path d="M5 16.5c2.6-4.4 5.4 1.5 8-1.2 1.7-1.8 1-4.3-.8-4.3-1.4 0-2.2 1.1-1.8 2.2" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><circle cx="16.6" cy="8.6" r="1.5" fill="#fff"/><path d="M18 8.1l2-1M18 9.1l2 1" stroke="#fff" stroke-width="1.1" stroke-linecap="round"/>`,
  slope: `<path d="M4.5 17.5h15" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><path d="M5 17.5 10 9.5l3.6 4.6L16 11l3 6.5" fill="none" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/><circle cx="17" cy="5.6" r="1.2" fill="#fff"/><circle cx="19.2" cy="8.2" r=".85" fill="#fff"/>`,
  fire: `<path d="M12 5.2c.5 2.7 2.4 3.5 3.1 5.5 1 2.6-.4 5-3.1 5.5-2.6.5-4.8-1.4-4.8-3.8 0-1.8 1.2-2.9 2.2-3.8.3 1.2.7 1.8 1.4 2.3-.2-2-.1-4 1.2-5.7z" fill="#fff"/>`,
  rain: `<path d="M7 11a3.1 3.1 0 0 1 .7-6.1A4.2 4.2 0 0 1 15.7 6a2.9 2.9 0 0 1 .5 5.7H7z" fill="#fff"/><path d="M9 14.2l-.8 2.6M12 14.2l-.8 2.6M15 14.2l-.8 2.6" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`,
  waves: `<path d="M4.5 10.5c2.2-2.2 4.4-2.2 6.6 0s4.4 2.2 6.6 0M4.5 14.5c2.2-2.2 4.4-2.2 6.6 0s4.4 2.2 6.6 0M4.5 18.5c2.2-2.2 4.4-2.2 6.6 0s4.4 2.2 6.6 0" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>`,
  paw: `<ellipse cx="12" cy="15.6" rx="3.7" ry="3.1" fill="#fff"/><circle cx="7.6" cy="10.6" r="1.5" fill="#fff"/><circle cx="10.9" cy="8.6" r="1.55" fill="#fff"/><circle cx="14.2" cy="8.6" r="1.55" fill="#fff"/><circle cx="17" cy="10.6" r="1.5" fill="#fff"/>`,
  wind: `<path d="M4.5 10.2h9.6a2.7 2.7 0 1 0-2.7-2.7M4.5 14.2h13a2.7 2.7 0 1 1-2.7 2.7M7 18.2h5.5" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>`,
  bolt: `<polygon points="13.4,4.4 7.4,13 11.5,13 9.8,19.6 16.9,10.5 12.9,10.5 14.6,4.4" fill="#fff"/>`,
  quake: `<path d="M5 12.5 12 6l7 6.5" fill="none" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/><path d="M7 12.5V18h9v-5.5" fill="none" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><path d="M12.2 8.4l-1.1 3h2l-1 3" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>`,
  snow: `<g stroke="#fff" stroke-width="1.5" stroke-linecap="round"><path d="M12 5.5v13M6.4 8.8l11.2 6.4M17.6 8.8 6.4 15.2"/><path d="M12 5.5l-1.6 1.6M12 5.5l1.6 1.6M12 18.5l-1.6-1.6M12 18.5l1.6-1.6"/></g>`,
  virus: `<circle cx="12" cy="12" r="4.4" fill="#fff"/><g stroke="#fff" stroke-width="1.4" stroke-linecap="round"><path d="M12 4.2v3M12 16.8v3M4.2 12h3M16.8 12h3M6.5 6.5l2.1 2.1M15.4 15.4l2.1 2.1M17.5 6.5l-2.1 2.1M8.6 15.4l-2.1 2.1"/></g><circle cx="10.7" cy="11.2" r=".7" fill="#7c3aed"/><circle cx="13.4" cy="12.8" r=".7" fill="#7c3aed"/>`,
  plane: `<path d="M12 4.5 13.1 10l6-2.4v2.2l-5.7 2.6.2 3.4 2.4 1.1v1.6L12 18l-4 1.5v-1.6l2.4-1.1.2-3.4L4.9 9.8V7.6l6 2.4L12 4.5z" fill="#fff"/>`,
  car: `<path d="M5.2 13.5l1.3-3.2a2 2 0 0 1 1.9-1.3h7.2a2 2 0 0 1 1.9 1.3l1.3 3.2" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/><rect x="4.4" y="13" width="15.2" height="4.6" rx="1.2" fill="#fff"/><circle cx="8" cy="18" r="1.5" fill="#fff"/><circle cx="16" cy="18" r="1.5" fill="#fff"/>`,
  warn: `<path d="M12 5.2 19.6 18H4.4L12 5.2z" fill="none" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 9.6v4.1" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="16" r="1" fill="#fff"/>`,
}

/** BIPAD hazard id → glyph family. Ids are stable (47-row dictionary), so the
 *  ids seen in the current feed are mapped directly; unknown ids fall back to ⚠. */
const KIND: Record<number, string> = {
  20: 'snake',
  17: 'slope', 29: 'slope', 3: 'slope', 16: 'slope',
  10: 'fire', 12: 'fire',
  14: 'rain', 19: 'rain',
  11: 'waves', 28: 'waves', 7: 'waves', 46: 'waves',
  2: 'paw',
  22: 'wind', 24: 'wind',
  13: 'snow', 21: 'snow', 6: 'snow',
  23: 'bolt',
  8: 'quake',
  9: 'virus', 33: 'virus', 35: 'virus', 44: 'virus',
  1: 'plane', 15: 'plane',
  34: 'car', 47: 'car',
}

function hazardGlyph(id?: number | null): string {
  return GLYPH[KIND[id ?? -1]] ?? GLYPH.warn
}

export function hazardPinSvg(id: number | null | undefined, color = '#7c3aed', size = 20): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">` +
    `<circle cx="12" cy="12" r="10.1" fill="${color}" stroke="#fff" stroke-width="1.5"/>` +
    `${hazardGlyph(id)}</svg>`
}
