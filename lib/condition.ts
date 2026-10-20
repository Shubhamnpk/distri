// Shared sky-condition kinds derived from DHM condition text.
// Single source of truth for icons + tints across /environment surfaces.

export type SkyKind = 'clear' | 'partly' | 'cloudy' | 'rain' | 'storm' | 'fog' | 'snow' | 'wind';

export function skyKind(name: string | undefined | null): SkyKind {
  const n = (name ?? '').toLowerCase()
  if (n.includes('thunder') || n.includes('lightning')) return 'storm'
  if (n.includes('rain') || n.includes('shower') || n.includes('drizzle')) return 'rain'
  if (n.includes('snow') || n.includes('sleet') || n.includes('hail')) return 'snow'
  if (n.includes('fog') || n.includes('mist') || n.includes('haze') || n.includes('smoke') || n.includes('dust')) return 'fog'
  if (n.includes('wind') || n.includes('gale') || n.includes('storm')) return 'wind'
  if (n.includes('partly') || n.includes('partial')) return 'partly'
  if (n.includes('clear') || n.includes('sunny') || n.includes('fair')) return 'clear'
  if (n.includes('cloud')) return 'cloudy'
  return 'partly'
}

// Air quality from PM2.5 (µg/m³) on the US EPA bands - drives the severity cue beside the sky icon.
export type Pm25Band = { label: string; cls: 'status-good' | 'status-warn' | 'status-bad' }

export function pm25Band(v: number | null | undefined): Pm25Band | null {
  if (v == null || Number.isNaN(v)) return null
  if (v <= 12) return { label: 'Good', cls: 'status-good' }
  if (v <= 35.4) return { label: 'Moderate', cls: 'status-good' }
  if (v <= 55.4) return { label: 'Sensitive', cls: 'status-warn' }
  if (v <= 150.4) return { label: 'Unhealthy', cls: 'status-warn' }
  if (v <= 250.4) return { label: 'Very unhealthy', cls: 'status-bad' }
  return { label: 'Hazardous', cls: 'status-bad' }
}

export const SKY_META: Record<SkyKind, { label: string; tint: string; bg: string }> = {
  clear: { label: 'Clear sky', tint: '#ea580c', bg: '#ffedd5' },
  partly: { label: 'Partly cloudy', tint: '#d97706', bg: '#fef3c7' },
  cloudy: { label: 'Cloudy', tint: '#64748b', bg: '#f1f5f9' },
  rain: { label: 'Rain', tint: '#2563eb', bg: '#dbeafe' },
  storm: { label: 'Thunderstorm', tint: '#7c3aed', bg: '#ede9fe' },
  fog: { label: 'Fog / haze', tint: '#64748b', bg: '#f1f5f9' },
  snow: { label: 'Snow', tint: '#0284c7', bg: '#e0f2fe' },
  wind: { label: 'Windy', tint: '#0d9488', bg: '#ccfbf1' },
}
