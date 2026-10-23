'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BookOpen, Cloud, ExternalLink, GraduationCap, Home, MapPin, Mountain, Users,
} from 'lucide-react'
import {
  KIND_LABEL, KIND_ORDER, fetchDailyForecast, fetchDistrictGeoMeta, fetchDistrictPalikaCensus,
  fetchNearbyPlaces, fetchPlaceAreas, fetchWikiSummary, findDistrict, findProvinceByName, palikaCensusOf,
  palikaKey, palikasOfDistrict, provinceOfDistrict, wmoText, type DailyForecast, type DistrictGeoMeta, type NearbyPlace,
  type PlaceArea, type PlaceAreas, type WikiSummary,
} from '@/lib/places'
import { canonDistrictKey } from '@/lib/district-geo'
import { PROVINCE_INFO } from '@/lib/province-info'
import { fetchBipadDistrictProfile, type DistrictProfile, type PalikaCensus } from '@/lib/bipad'
import { fetchCurrentWeather, fetchCurrentPm25, type CurrentWeather } from '@/lib/meteo'
import { skyKind, pm25Band } from '@/lib/condition'
import { WeatherIcon } from '@/components/weather-icon'

const DistrictMap = dynamic(() => import('@/components/district-map').then(m => m.DistrictMap), { ssr: false })

const nf = new Intl.NumberFormat('en-IN')

export default function DistrictPage() {
  const params = useParams()
  const slug = String(params?.district ?? '')
  const district = useMemo(() => findDistrict(slug), [slug])

  const [area, setArea] = useState<PlaceArea | null>(null)
  const [palikaAreas, setPalikaAreas] = useState<PlaceAreas['palikas']>({})
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [profile, setProfile] = useState<DistrictProfile | null>(null)
  const [census, setCensus] = useState<Record<string, PalikaCensus>>({})
  const [weather, setWeather] = useState<CurrentWeather | null>(null)
  const [pm, setPm] = useState<number | null>(null)
  const [daily, setDaily] = useState<DailyForecast[]>([])
  const [wiki, setWiki] = useState<WikiSummary | null>(null)
  const [nearby, setNearby] = useState<NearbyPlace[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!district) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    setProfile(null); setWeather(null); setPm(null); setDaily([]); setWiki(null); setNearby([]); setCensus({})
    setPalikaAreas({})

    ;(async () => {
      const [areas, meta] = await Promise.all([
        fetchPlaceAreas().catch(() => ({ provinces: {}, districts: {}, palikas: {} } as PlaceAreas)),
        fetchDistrictGeoMeta().catch(() => ({} as Record<string, DistrictGeoMeta>)),
      ])
      if (cancelled) return
      const districtArea = areas.districts[district.slug] ?? null
      setArea(districtArea)
      setPalikaAreas(areas.palikas)
      const g = meta[canonDistrictKey(district.name)]
      const lat = g?.lat ?? districtArea?.lat ?? null
      const lon = g?.lon ?? districtArea?.lon ?? null
      if (lat != null && lon != null) setCoords({ lat, lon })

      const jobs: Promise<void>[] = []
      if (g?.id != null) {
        jobs.push(fetchBipadDistrictProfile(g.id).then(p => { if (!cancelled) setProfile(p) }))
        jobs.push(fetchDistrictPalikaCensus(g.id).then(c => { if (!cancelled) setCensus(c.byName) }))
      }
      if (lat != null && lon != null) {
        const at = { lat, lon }
        jobs.push(fetchCurrentWeather(at).then(w => { if (!cancelled) setWeather(w) }))
        jobs.push(fetchCurrentPm25(at).then(v => { if (!cancelled) setPm(v) }))
        jobs.push(fetchDailyForecast(lat, lon, 5).then(d => { if (!cancelled) setDaily(d) }))
        jobs.push(fetchNearbyPlaces(lat, lon, 15000, 6).then(n => { if (!cancelled) setNearby(n) }))
      }
      jobs.push(fetchWikiSummary(`${district.name} District`, district.name).then(w => { if (!cancelled) setWiki(w) }))

      await Promise.all(jobs)
      if (!cancelled) setLoading(false)
    })().catch(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [district])

  if (!district) {
    return (
      <main className="content-wrap">
        <p className="eyebrow">Not found</p>
        <h1>District not found</h1>
        <p className="muted">There is no district at â€œ{slug}â€. <Link href="/places" className="text-accent">Browse all places</Link>.</p>
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
  const nearbyMarkers = nearby.map(place => ({
    title: place.title,
    lat: place.lat,
    lon: place.lon,
    url: place.url,
    note: `${place.distanceKm} km away`,
  }))
  const grouped = KIND_ORDER.map(kind => ({ kind, items: palikas.filter(p => p.kind === kind) })).filter(g => g.items.length)
  const pmBand = pm25Band(pm)
  const condition = wmoText(weather?.weather_code)
  const avgHousehold = profile && profile.households > 0 ? profile.population / profile.households : null
  const sexMale = profile?.male ?? 0
  const sexFemale = profile?.female ?? 0
  const sexTotal = sexMale + sexFemale
  const ageBands = (profile?.ageBands ?? [])
    .slice()
    .sort((a, b) => (parseInt(a.band, 10) || 0) - (parseInt(b.band, 10) || 0))
  const ageMax = ageBands.reduce((m, b) => Math.max(m, b.male + b.female), 0)

  return (
    <main className="content-wrap">
      <nav className="place-crumbs" aria-label="Breadcrumb">
        <Link href="/places"><ArrowLeft size={13} /> All places</Link>
        <span>/</span>
        {provinceSlug ? <Link href={`/provinces/${provinceSlug}`}>{province}</Link> : <span>{province}</span>}
        <span>/</span>
        <strong>{district.name}</strong>
      </nav>

      <section className="place-hero">
        <div className="place-hero-copy">
          <p className="eyebrow">{province} Province Â· District</p>
          <h1>{district.name}</h1>
          {area?.nameNe && <p className="place-ne">{area.nameNe}</p>}
          <p className="lede">
            {wiki?.extract
              ? wiki.extract.split('. ').slice(0, 2).join('. ') + (wiki.extract.split('. ').length > 2 ? '.' : '')
              : `Census, weather and places around ${district.name}.`}
          </p>
          <div className="place-hero-tags">
            {area?.areaSqKm != null && <span className="place-tag">{Math.round(area.areaSqKm).toLocaleString('en-IN')} kmÂ²</span>}
            <span className="place-tag">{palikas.length} local units</span>
            {profile && <span className="place-tag">Census {profile.censusYear}</span>}
            {coords && <span className="place-tag"><MapPin size={12} /> {coords.lat.toFixed(2)}Â°N, {coords.lon.toFixed(2)}Â°E</span>}
          </div>
        </div>
        {wiki?.image && (
          <figure className="place-hero-media">
            <img src={wiki.image} alt={`${district.name}`} loading="lazy" />
            <figcaption>Photo: Wikimedia Commons</figcaption>
          </figure>
        )}
      </section>

      <section className="place-stats">
        <Stat icon={<Users size={15} />} label="Population" value={profile ? nf.format(profile.population) : 'â€”'} note={profile ? `${profile.units} palikas summed` : 'census 2021'} />
        <Stat icon={<Home size={15} />} label="Households" value={profile ? nf.format(profile.households) : 'â€”'} note={avgHousehold ? `${avgHousehold.toFixed(1)} people / home` : ''} />
        <Stat icon={<GraduationCap size={15} />} label="Literacy" value={profile?.literacy != null ? `${profile.literacy.toFixed(1)}%` : 'â€”'} note="age 5+" />
        <Stat icon={<Mountain size={15} />} label="Area" value={area?.areaSqKm != null ? `${Math.round(area.areaSqKm).toLocaleString('en-IN')} kmÂ²` : 'â€”'} note={`${palikas.length} local units`} />
      </section>

      <div className="place-two">
        <section className="panel place-about">
          <div className="panel-head"><h3><BookOpen size={16} /> About {district.name}</h3></div>
          {wiki ? (
            <>
              <p className="place-body">{wiki.extract}</p>
              <a href={wiki.url} target="_blank" rel="noreferrer" className="text-button">Read on Wikipedia <ExternalLink size={13} /></a>
            </>
          ) : (
            <p className="muted">{loading ? 'Loading summaryâ€¦' : 'No Wikipedia summary available for this district.'}</p>
          )}
        </section>

        <section className="panel place-weather">
          <div className="panel-head"><h3><Cloud size={16} /> Weather today</h3></div>
          {weather ? (
            <>
              <div className="place-wx-now">
                <span className="wx-halo"><WeatherIcon kind={skyKind(condition)} size={62} /></span>
                <div>
                  <strong>{weather.temperature_2m != null ? `${Math.round(weather.temperature_2m)}Â°C` : 'â€”'}</strong>
                  <span>{condition}</span>
                  <small>
                    {weather.relative_humidity_2m != null ? `${Math.round(weather.relative_humidity_2m)}% humidity` : ''}
                    {pm != null ? ` Â· PM2.5 ${pm.toFixed(1)} Âµg/mÂ³` : ''}
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
                      <b>{d.max != null ? `${Math.round(d.max)}Â°` : 'â€”'}</b>
                      <small>{d.min != null ? `${Math.round(d.min)}Â°` : 'â€”'}</small>
                      {d.rainChance != null && <small>{d.rainChance}% rain</small>}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="muted">{loading ? 'Loading weatherâ€¦' : 'Weather unavailable right now.'}</p>
          )}
        </section>
      </div>

      {sexTotal > 0 && (
        <section className="panel place-sex">
          <div className="panel-head"><h3>Population split</h3><span className="muted">Census {profile?.censusYear}</span></div>
          <div className="sex-bar">
            <span style={{ width: `${(sexMale / sexTotal) * 100}%` }} className="sex-male" />
            <span style={{ width: `${(sexFemale / sexTotal) * 100}%` }} className="sex-female" />
          </div>
          <div className="sex-legend">
            <span><i className="dot sex-male" /> Male {nf.format(sexMale)} ({(sexMale / sexTotal * 100).toFixed(1)}%)</span>
            <span><i className="dot sex-female" /> Female {nf.format(sexFemale)} ({(sexFemale / sexTotal * 100).toFixed(1)}%)</span>
          </div>
        </section>
      )}

      {ageBands.length > 0 && ageMax > 0 && (
        <section className="panel place-age">
          <div className="panel-head"><h3>Age structure</h3><span className="muted">Census {profile?.censusYear}</span></div>
          <div className="age-bars">
            {ageBands.map(b => (
              <div key={b.band} className="age-row">
                <span className="age-label">{b.band}</span>
                <div className="age-track">
                  <span className="age-male" style={{ width: `${(b.male / ageMax) * 100}%` }} />
                  <span className="age-female" style={{ width: `${(b.female / ageMax) * 100}%` }} />
                </div>
                <span className="age-val">{nf.format(b.male + b.female)}</span>
              </div>
            ))}
          </div>
          <div className="sex-legend">
            <span><i className="dot sex-male" /> Male</span>
            <span><i className="dot sex-female" /> Female</span>
          </div>
        </section>
      )}

      {coords && (
        <section className="place-map-section">
          <div className="panel-head" style={{ marginBottom: '.6rem' }}>
            <h3><MapPin size={16} /> {district.name} in {province}</h3>
            {provinceSlug && <Link href={`/provinces/${provinceSlug}`} className="text-button">Province profile <ArrowRight size={13} /></Link>}
          </div>
          <div className="place-map-box">
            <DistrictMap
              geoSlug={provinceGeoSlug}
              districtName={district.name}
              districtSlug={district.slug}
              center={coords}
              palikas={palikaMarkers}
              places={nearbyMarkers}
            />
          </div>
          <div className="province-map-legend">
            <span><i className="map-dot is-selected" /> {district.name} district</span>
            <span><i className="map-dot is-district" /> Other districts</span>
            {palikaMarkers.length > 0 && <span><i className="map-dot is-palika" /> Local unit</span>}
            {nearbyMarkers.length > 0 && <span><i className="map-dot is-attraction" /> Nearby place</span>}
          </div>
        </section>
      )}

      <section className="place-palikas">
        <div className="section-heading" style={{ marginBottom: '.8rem' }}>
          <h2>Local units</h2>
          <span className="muted">{palikas.length} municipalities &amp; rural municipalities</span>
        </div>
        {grouped.map(g => (
          <div key={g.kind} className="palika-group">
            <p className="palika-group-title">{KIND_LABEL[g.kind]} <span>({g.items.length})</span></p>
            <div className="palika-grid">
              {g.items.map(p => {
                const c = palikaCensusOf(census, p.name)
                return (
                  <Link key={p.slug} href={`/districts/${district.slug}/${p.slug}`} className="palika-card">
                    <strong>{p.name}</strong>
                    <span>{c ? `${nf.format(c.population)} people` : KIND_LABEL[p.kind]}</span>
                    <ArrowRight size={13} />
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </section>

      {nearby.length > 0 && (
        <section className="place-nearby">
          <div className="section-heading" style={{ marginBottom: '.8rem' }}>
            <h2>Nearby places</h2>
            <span className="muted">Landmarks and places of interest within ~15 km</span>
          </div>
          <div className="nearby-grid">
            {nearby.map(n => (
              <a key={n.title} href={n.url} target="_blank" rel="noreferrer" className="nearby-card">
                {n.image && <img src={n.image} alt={n.title} loading="lazy" />}
                <div>
                  <strong>{n.title}</strong>
                  <span className="nearby-dist">{n.distanceKm} km away</span>
                  <p>{excerpt(n.extract)}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      <p className="place-sources">
        Sources: NSO Census 2021 via BIPAD / NDRRMA Â· area &amp; names via DataNepal (COD) Â· weather &amp; air quality via Open-Meteo Â·
        text and images via Wikipedia / Wikimedia Commons.
      </p>
    </main>
  )
}

function excerpt(s: string): string {
  const t = s.trim()
  return t.length > 180 ? `${t.slice(0, 177)}â€¦` : t
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

