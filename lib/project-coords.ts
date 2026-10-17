// Researched site anchors for all 30 tracked projects (subagent sweep, Oct 2026).
// Every row was verified against a fetched source page (Wikipedia infobox,
// OSM/Nominatim feature, or project documentation). Keyed by project slug.
// - high: surveyed structure/airfield coordinates (dam, powerhouse, runway).
// - medium: OSM feature or town-level anchor named by the project source.
// - low: nearest verifiable town — shown as an anchor, never a surveyed point.
// Labels state what the pin actually is; the map renders them accordingly.

import { slugify } from './data'

export type ProjectSite = {
  lat: number
  lon: number
  /** What the pin marks, e.g. "Dam site", "Airfield", "Town anchor". */
  label: string
  confidence: 'high' | 'medium' | 'low'
}

const SITES: [string, number, number, string, ProjectSite['confidence']][] = [
  ['Kathmandu–Terai/Madhes Expressway', 27.55, 85.125, 'Tunnel cluster town (Bhimphedi)', 'low'],
  ['Budhigandaki Hydropower (1,200 MW)', 27.82556, 84.77361, 'Dam site', 'high'],
  ['Mid-Hill (Pushpalal) Highway', 28.267, 83.6, 'Highway town (Baglung)', 'high'],
  ['Postal Highway (Hulaki Rajmarg)', 26.72861, 85.925, 'Highway town (Janakpur)', 'high'],
  ['Madan Bhandari Highway', 27.43028, 85.03222, 'Highway town (Hetauda)', 'high'],
  ['North-South Koshi Corridor', 27.8569, 87.4181, 'Border point (Kimathanka)', 'high'],
  ['North-South Kaligandaki Corridor', 29.30389, 83.96861, 'Border pass (Korala)', 'high'],
  ['North-South Karnali Corridor', 30.15194, 81.33417, 'Border point (Hilsa)', 'high'],
  ['Nijgadh International Airport', 27.12392, 85.17394, 'Proposed airfield', 'high'],
  ['West Seti Hydropower (750 MW)', 29.35889, 80.77111, 'Dam site', 'high'],
  ['East-West Railway (Mechi–Mahakali)', 26.98, 85.9, 'Section town (Bardibas)', 'high'],
  ['Nagdhunga–Naubise Tunnel', 27.68333, 85.18333, 'Approach town (Thankot)', 'low'],
  ['Melamchi Water Supply (Phase 1)', 27.8334, 85.5771, 'Intake gorge', 'medium'],
  ['Gautam Buddha International Airport', 27.50556, 83.41611, 'Airfield', 'high'],
  ['Pokhara International Airport', 28.18969, 84.01489, 'Airfield', 'high'],
  ['Upper Tamakoshi Hydropower (456 MW)', 27.925, 86.213, 'Powerhouse (Gongar)', 'high'],
  ['Siddhababa Tunnel (1,126 m)', 27.76, 83.45, 'Tunnel town (Dobhan)', 'medium'],
  ['Lumbini Area Development', 27.469634, 83.27586, 'Maya Devi Temple', 'high'],
  ['Pashupati Area Development', 27.70972, 85.34861, 'Main temple', 'high'],
  ['Sikta Irrigation Project', 28.039967, 81.9534547, 'Sikta Dam (OSM)', 'medium'],
  ['Bheri Babai Diversion Multipurpose Project', 28.4590659, 81.7775104, 'Diversion dam (OSM)', 'medium'],
  ['Babai Irrigation Project', 28.23306, 81.33306, 'District town (Gulariya)', 'low'],
  ['Rani Jamara Kulariya Irrigation Project', 28.6408858, 81.283829, 'Intake town (Chisapani)', 'medium'],
  ['Sunkoshi Marin Diversion Multipurpose Project', 27.375, 85.89167, 'Intake municipality', 'low'],
  ['Mahakali Irrigation Project', 28.99704, 80.11231, 'Sharada Barrage', 'medium'],
  ['President Chure–Terai Madhesh Conservation Area', 27.43028, 85.03222, 'Central belt town (Hetauda)', 'low'],
  ['Gautam Buddha International Cricket Stadium', 27.66389, 84.34667, 'Planned site (Rampur)', 'high'],
  ['Mulpani Cricket Stadium', 27.718583, 85.39139, 'Upper Mulpani Ground', 'high'],
  ['Girija Prasad Koirala Cricket Stadium', 26.49605, 87.30284, 'Proposed ground (Baijnathpur)', 'medium'],
  ['Tribhuvan University Cricket Ground', 27.67806, 85.29056, 'Ground centre', 'high'],
  ['West Seti Reservoir Hydropower (800 MW)', 29.35889, 80.77111, 'Dam vicinity, Seti R. (same scheme area as 750 MW)', 'medium'],
  ['MCC Nepal Compact — Electricity Transmission Project', 27.9828, 84.2656, 'Substation town (New Damauli)', 'medium'],
  ['Kathmandu Valley Wholesale Water Supply Transmission (Phase 2)', 27.8334, 85.5771, 'Phase-2 intake area (Melamchi gorge)', 'medium'],
]

const BY_SLUG: Record<string, ProjectSite> = {}
for (const [name, lat, lon, label, confidence] of SITES) {
  BY_SLUG[slugify(name)] = { lat, lon, label, confidence }
}

/** Researched site for a project name, or null when unmapped. */
export function projectSite(name: string): ProjectSite | null {
  return BY_SLUG[slugify(name)] ?? null
}
