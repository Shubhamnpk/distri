// Static province facts that no live feed exposes cleanly: capital, capital
// coordinates and the OCHA/COD geometry slug. Population, area, literacy and
// local-unit counts come from DataNepal + BIPAD on the province page.

export type ProvinceInfo = {
  capital: string
  capitalNe: string
  lat: number
  lon: number
  geoSlug: string
  region: string
  wikidata: string
}

export const PROVINCE_INFO: Record<string, ProvinceInfo> = {
  Koshi: {
    capital: 'Biratnagar',
    capitalNe: 'विराटनगर',
    lat: 26.455,
    lon: 87.27,
    geoSlug: 'koshi',
    region: 'Eastern Nepal',
    wikidata: 'Q25104008',
  },
  Madhesh: {
    capital: 'Janakpurdham',
    capitalNe: 'जनकपुरधाम',
    lat: 26.7288,
    lon: 85.925,
    geoSlug: 'madhesh',
    region: 'Central Terai',
    wikidata: 'Q25104009',
  },
  Bagmati: {
    capital: 'Hetauda',
    capitalNe: 'हेटौंडा',
    lat: 27.4284,
    lon: 85.0322,
    geoSlug: 'bagmati',
    region: 'Central Nepal',
    wikidata: 'Q25104015',
  },
  Gandaki: {
    capital: 'Pokhara',
    capitalNe: 'पोखरा',
    lat: 28.2096,
    lon: 83.9855,
    geoSlug: 'gandaki',
    region: 'Western Nepal',
    wikidata: 'Q25104016',
  },
  Lumbini: {
    capital: 'Deukhuri (Bhalubang)',
    capitalNe: 'देउखुरी (भालुबाङ)',
    lat: 27.84112,
    lon: 82.76103,
    geoSlug: 'lumbini',
    region: 'Western Terai and hills',
    wikidata: 'Q25104014',
  },
  Karnali: {
    capital: 'Birendranagar',
    capitalNe: 'वीरेन्द्रनगर',
    lat: 28.59669,
    lon: 81.61658,
    geoSlug: 'karnali',
    region: 'North-western Nepal',
    wikidata: 'Q25104017',
  },
  Sudurpashchim: {
    capital: 'Godawari',
    capitalNe: 'गोदावरी',
    lat: 28.91,
    lon: 80.59,
    geoSlug: 'sudurpashchim',
    region: 'Far-western Nepal',
    wikidata: 'Q25104019',
  },
}
