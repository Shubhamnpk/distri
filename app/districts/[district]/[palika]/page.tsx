'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Cloud, ExternalLink, Home, MapPin, Mountain, Users } from 'lucide-react'
import {
  KIND_LABEL, fetchDailyForecast, fetchDistrictGeoMeta, fetchDistrictPalikaCensus, fetchNearbyPlaces,
  fetchPlaceAreas, fetchWikiSummary, findDistrict, findPalika, findProvinceByName, palikaCensusOf, palikaKey,
  palikasOfDistrict, provinceOfDistrict, wmoText, type DailyForecast, type DistrictGeoMeta, type NearbyPlace,
  type PlaceArea, type PlaceAreas, type WikiSummary,
} from '@/lib/places'
import { canonDistrictKey } from '@/lib/district-geo'
import { PROVINCE_INFO } from '@/lib/province-info'
import type { PalikaCensus } from '@/lib/bipad'
import { fetchCurrentWeather, fetchCurrentPm25, type CurrentWeather } from '@/lib/meteo'
import { skyKind, pm25Band } from '@/lib/condition'
import { WeatherIcon } from '@/components/weather-icon'

const DistrictMap = dynamic(() => import('@/components/district-map').then(m => m.DistrictMap), { ssr: false })

const nf = new Intl.NumberFormat('en-IN')

export default function PalikaPage() {
  const params = useParams()
  const districtSlug = String(params?.district ?? '')
  const palikaSlug = String(params?.palika ?? '')
  const district = useMemo(() => findDistrict(districtSlug), [districtSlug])
  const palika = useMemo(() => (district ? findPalika(district.name, palikaSlug) : undefined), [district, palikaSlug])

  const [census, setCensus] = useState<PalikaCensus | null>(null)
  const [area, setArea] = useState<PlaceArea | null>(null)
  const [palikaAreas, setPalikaAreas] = useState<PlaceAreas['palikas']>({})
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [districtCoords, setDistrictCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [weather, setWeather] = useState<CurrentWeather | null>(null)
  const [pm, setPm] = useState<number | null>(null)
  const [daily, setDaily] = useState<DailyForecast[]>([])
  const [wiki, setWiki] = useState<WikiSummary | null>(null)
  const [nearby, setNearby] = useState<NearbyPlace[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!district || !palika) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    setCensus(null); setWeather(null); setPm(null); setDaily([]); setWiki(null); setNearby([]); setArea(null)
    setPalikaAreas({}); setDistrictCoords(null)

    ;(async () => {
      const [meta, areas] = await Promise.all([
        fetchDistrictGeoMeta().catch(() => ({} as Record<string, DistrictGeoMeta>)),
        fetchPlaceAreas().catch(() => ({ provinces: {}, districts: {}, palikas: {} } as PlaceAreas)),
      ])
      if (cancelled) return
      const pa = areas.palikas[palikaKey(district.name, palika.slug)] ?? null
      setArea(pa)
      setPalikaAreas(areas.palikas)
      const g = meta[canonDistrictKey(district.name)]
      const districtArea = areas.districts[district.slug] ?? null
      const districtLat = g?.lat ?? districtArea?.lat ?? null
      const districtLon = g?.lon ?? districtArea?.lon ?? null
      if (districtLat != null && districtLon != null) setDistrictCoords({ lat: districtLat, lon: districtLon })
      const censusId = g?.id ?? null

      let lat = pa?.lat ?? g?.lat ?? null
      let lon = pa?.lon ?? g?.lon ?? null

      if (censusId != null) {
        try {
          const c = await fetchDistrictPalikaCensus(censusId)
          if (cancelled) return
          const row = palikaCensusOf(c.byName, palika.name) ?? null
          setCensus(row)
          if (row?.centroid?.length === 2) { lon = row.centroid[0]; lat = row.centroid[1] }
        } catch { /* census is optional */ }
      }
      if (cancelled) return

      if (lat != null && lon != null) {
        const at = { lat, lon }
        setCoords(at)
        await Promise.all([
          fetchCurrentWeather(at).then(w => { if (!cancelled) setWeather(w) }).catch(() => {}),
          fetchCurrentPm25(at).then(v => { if (!cancelled) setPm(v) }).catch(() => {}),
          fetchDailyForecast(lat, lon, 5).then(d => { if (!cancelled) setDaily(d) }).catch(() => {}),
          fetchNearbyPlaces(lat, lon, 10000, 6).then(n => { if (!cancelled) setNearby(n) }).catch(() => {}),
        ])
      }

      const w = await fetchWikiSummary(`${palika.name}, Nepal`, `${palika.name} ${district.name}`, palika.name)
      if (!cancelled) { setWiki(w); setLoading(false) }
    })().catch(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [district, palika])

  if (!district || !palika) {
    return (
      <main className="content-wrap">
        <p className="eyebrow">Not found</p>
        <h1>Local unit not found</h1>
        <p className="muted">
          <Link href="/places" className="text-accent">Browse all places</Link>
        </p>
      </main>
    )
  }

  const province = provinceOfDistrict(district.name)
  const provinceSlug = findProvinceByName(province)?.slug
  const provinceGeoSlug = PROVINCE_INFO[province]?.geoSlug ?? provinceSlug ?? 'bagmati'
  const palikas = palikasOfDistrict(district.name)
  const palikaMarkers = palikas.flatMap(p => {
    const pa = palikaAreas[palikaKey(district.name, p.slug)]
    return pa?.lat != null && pa?.lon != null
      ? [{ name: p.name, slug: p.slug, lat: pa.lat, lon: pa.lon }]
      : []
  })
  if (coords && !palikaMarkers.some(p => p.slug === palika.slug)) {
    palikaMarkers.push({ name: palika.name, slug: palika.slug, lat: coords.lat, lon: coords.lon })
  }
  const nearbyMarkers = nearby.map(place => ({
    title: place.title,
    lat: place.lat,
    lon: place.lon,
    url: place.url,
    note: `${place.distanceKm} km away`,
  }))
  const mapCenter = districtCoords ?? coords
  const pmBand = pm25Band(pm)
  const condition = wmoText(weather?.weather_code)
  const avgHousehold = census && census.households > 0 ? census.population / census.households : null
  const sexTotal = (census?.male ?? 0) + (census?.female ?? 0)

  return (
    <main className="content-wrap">
      <nav className="place-crumbs" aria-label="Breadcrumb">
        <Link href="/places"><ArrowLeft size={13} /> All places</Link>
        <span>/</span>
        {provinceSlug ? <Link href={`/provinces/${provinceSlug}`}>{province}</Link> : <span>{province}</span>}
        <span>/</span>
        <Link href={`/districts/${district.slug}`}>{district.name}</Link>
        <span>/</span>
        <strong>{palika.name}</strong>
      </nav>

      <section className="place-hero">
        <div className="place-hero-copy">
          <p className="eyebrow">{province} · {district.name} · {KIND_LABEL[palika.kind]}</p>
          <h1>{palika.name}</h1>
          <p className="lede">
            {wiki?.extract
              ? wiki.extract.split('. ').slice(0, 2).join('. ') + (wiki.extract.split('. ').length > 2 ? '.' : '')
              : `A ${KIND_LABEL[palika.kind].toLowerCase()} in ${district.name} district, ${province}.`}
          </p>
          <div className="place-hero-tags">
            <span className="place-tag">{KIND_LABEL[palika.kind]}</span>
            <span className="place-tag">{district.name} district</span>
            {area?.areaSqKm != null && <span className="place-tag">{Math.round(area.areaSqKm).toLocaleString('en-IN')} km²</span>}
            {census && <span className="place-tag">Census {census.censusYear}</span>}
            {coords && <span className="place-tag"><MapPin size={12} /> {coords.lat.toFixed(2)}°N, {coords.lon.toFixed(2)}°E</span>}
          </div>
        </div>
        {wiki?.image && (
          <figure className="place-hero-media">
            <img src={wiki.image} alt={palika.name} loading="lazy" />
            <figcaption>Photo: Wikimedia Commons</figcaption>
          </figure>
        )}
      </section>

      <section className="place-stats">
        <Stat icon={<Users size={15} />} label="Population" value={census ? nf.format(census.population) : '—'} note="census 2021" />
        <Stat icon={<Home size={15} />} label="Households" value={census ? nf.format(census.households) : '—'} note={avgHousehold ? `${avgHousehold.toFixed(1)} people / home` : ''} />
        <Stat icon={<Users size={15} />} label="Literacy" value={census?.literacy != null ? `${census.literacy.toFixed(1)}%` : '—'} note="age 5+" />
        <Stat icon={<Mountain size={15} />} label="Area" value={area?.areaSqKm != null ? `${area.areaSqKm.toFixed(1)} km²` : '—'} note={KIND_LABEL[palika.kind]} />
      </section>

      <div className="place-two">
        <section className="panel place-about">
          <div className="panel-head"><h3><BookOpen size={16} /> About {palika.name}</h3></div>
          {wiki ? (
            <>
              <p className="place-body">{wiki.extract}</p>
              <a href={wiki.url} target="_blank" rel="noreferrer" className="text-button">Read on Wikipedia <ExternalLink size={13} /></a>
            </>
          ) : (
            <p className="muted">{loading ? 'Loading summary…' : 'No Wikipedia summary available for this place.'}</p>
          )}
        </section>

        <section className="panel place-weather">
          <div className="panel-head"><h3><Cloud size={16} /> Weather today</h3></div>
          {weather ? (
            <>
              <div className="place-wx-now">
                <span className="wx-halo"><WeatherIcon kind={skyKind(condition)} size={62} /></span>
                <div>
                  <strong>{weather.temperature_2m != null ? `${Math.round(weather.temperature_2m)}°C` : '—'}</strong>
                  <span>{condition}</span>
                  <small>
                    {weather.relative_humidity_2m != null ? `${Math.round(weather.relative_humidity_2m)}% humidity` : ''}
                    {pm != null ? ` · PM2.5 ${pm.toFixed(1)} µg/m³` : ''}
                  </small>
                </div>
                {pmBand && <span className={`status-badge ${pmBand.cls}`}><span className="status-dot" />{pmBand.label}</span>}
              </div>
              {daily.length > 0 && (
                <div className="forecast-row">
                  {daily.map((d, i) => (
                    <div key={d.date} className="forecast-day">
                      <span>{i === 0 ? 'Today' : new Date(d.date).toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                      <WeatherIcon kind={skyKind(wmoText(d.code))} size={26} />
                      <b>{d.max != null ? `${Math.round(d.max)}°` : '—'}</b>
                      <small>{d.min != null ? `${Math.round(d.min)}°` : '—'}</small>
                      {d.rainChance != null && <small>{d.rainChance}% rain</small>}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="muted">{loading ? 'Loading weather…' : 'Weather unavailable right now.'}</p>
          )}
        </section>
      </div>

      {sexTotal > 0 && (
        <section className="panel place-sex">
          <div className="panel-head"><h3>Population split</h3><span className="muted">Census {census?.censusYear}</span></div>
          <div className="sex-bar">
            <span style={{ width: `${((census?.male ?? 0) / sexTotal) * 100}%` }} className="sex-male" />
            <span style={{ width: `${((census?.female ?? 0) / sexTotal) * 100}%` }} className="sex-female" />
          </div>
          <div className="sex-legend">
            <span><i className="dot sex-male" /> Male {nf.format(census?.male ?? 0)}</span>
            <span><i className="dot sex-female" /> Female {nf.format(census?.female ?? 0)}</span>
          </div>
        </section>
      )}

      {mapCenter && (
        <section className="place-map-section">
          <div className="panel-head" style={{ marginBottom: '.6rem' }}>
            <h3><MapPin size={16} /> {palika.name} in {district.name}</h3>
            <Link href={`/districts/${district.slug}`} className="text-button">District profile <ArrowRight size={13} /></Link>
          </div>
          <div className="place-map-box">
            <DistrictMap
              geoSlug={provinceGeoSlug}
              districtName={district.name}
              districtSlug={district.slug}
              center={mapCenter}
              palikas={palikaMarkers}
              places={nearbyMarkers}
              selectedPalikaSlug={palika.slug}
            />
          </div>
          <div className="province-map-legend">
            <span><i className="map-dot is-selected" /> {district.name} district</span>
            <span><i className="map-dot is-district" /> Other districts</span>
            <span><i className="map-dot is-palika" /> Local unit</span>
            {nearbyMarkers.length > 0 && <span><i className="map-dot is-attraction" /> Nearby place</span>}
          </div>
        </section>
      )}

      {nearby.length > 0 && (
        <section className="place-nearby">
          <div className="section-heading" style={{ marginBottom: '.8rem' }}>
            <h2>Nearby places</h2>
            <span className="muted">Landmarks and places of interest within ~10 km</span>
          </div>
          <div className="nearby-grid">
            {nearby.map(n => (
              <a key={n.title} href={n.url} target="_blank" rel="noreferrer" className="nearby-card">
                {n.image && <img src={n.image} alt={n.title} loading="lazy" />}
                <div>
                  <strong>{n.title}</strong>
                  <span className="nearby-dist">{n.distanceKm} km away</span>
                  <p>{n.extract.length > 180 ? `${n.extract.slice(0, 177)}…` : n.extract}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      <p className="place-sources">
        Sources: NSO Census 2021 via BIPAD / NDRRMA · weather &amp; air quality via Open-Meteo · text and images via Wikipedia / Wikimedia Commons.
      </p>
    </main>
  )
}

function Stat({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note?: string }) {
  return (
    <div className="place-stat">
      <span className="place-stat-icon">{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  )
}
