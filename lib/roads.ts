// Nepal road network from ICIMOD's ArcGIS server (Nepal/BaseMap MapServer, Road
// layer 2). Keyless, CORS-open, queryable as GeoJSON. The old DoR road JSON is
// dead; this is the replacement geometry source. We pull only the national
// highway class (TYPE='Highway', ~302 segments), paged at the 1000-record cap.

const BASE = 'https://geoapps.icimod.org/icimodarcgis/rest/services/Nepal/BaseMap/MapServer/2'

type Feature = { type: string; properties: Record<string, unknown>; geometry: unknown }
export type RoadFeatureCollection = { type: 'FeatureCollection'; features: Feature[] }

let cache: Promise<RoadFeatureCollection | null> | null = null

export function fetchNepalHighways(): Promise<RoadFeatureCollection | null> {
  if (!cache) {
    cache = (async () => {
      const features: Feature[] = []
      let offset = 0
      for (let page = 0; page < 4; page++) {
        const url =
          `${BASE}/query?where=${encodeURIComponent("TYPE='Highway'")}` +
          `&outFields=TYPE&returnGeometry=true&outSR=4326&f=geojson` +
          `&resultOffset=${offset}&resultRecordCount=1000`
        try {
          const res = await fetch(url, { next: { revalidate: 86400 } })
          if (!res.ok) break
          const json = await res.json()
          const batch: Feature[] = Array.isArray(json?.features) ? json.features : []
          features.push(...batch)
          if (batch.length < 1000) break
          offset += 1000
        } catch {
          break
        }
      }
      return features.length ? { type: 'FeatureCollection', features } as RoadFeatureCollection : null
    })()
  }
  return cache
}
