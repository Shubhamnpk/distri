'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Droplets, MapPin, Activity, Wind, Flame, TriangleAlert, Smile, Meh, Frown } from 'lucide-react'
import { fetchDhmForecast, fetchDhmObservations, type DhmStationForecast, type DhmObservations, type DhmWeather } from '@/lib/dhm'
import { fetchBipadIncidents, fetchBipadAlerts, fetchBipadDistrictCentroids, type BipadIncident, type BipadAlert, type BipadGeo } from '@/lib/bipad'
import { fetchCurrentWeather, fetchCurrentPm25, fetchNepalQuakes, fetchDailyHighLow, fetchHourlyTemps, type CurrentWeather, type NepalQuake } from '@/lib/meteo'
import { slugify } from '@/lib/data'
import { skyKind, SKY_META, pm25Band } from '@/lib/condition'
import { WeatherIcon, skyLucide } from '@/components/weather-icon'
import { LineChart } from '@/components/charts'
import { HazardFeed } from '@/components/hazard-feed'
import { ClimatePanel } from '@/components/climate-panel'
import { timeAgo, forecastDayLabel, isDayBySun, shortClock } from '@/lib/time'

function quakeColor(mag: number): string {
  if (mag >= 5) return 'var(--danger)'
  if (mag >= 4) return 'var(--warning)'
  return 'var(--primary)'
}

function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const r = 6371
  const dLa = ((bLat - aLat) * Math.PI) / 180
  const dLo = ((bLon - aLon) * Math.PI) / 180
  const s =
    Math.sin(dLa / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLo / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(s))
}

/** Temperature with an honest source tag - model fallbacks are marked, never silent. */
function Val({ v, model = false }: { v: number | null | undefined; model?: boolean }) {
  if (v == null) return <>-</>
  return (
    <>{Math.round(v)}°{model && <small style={{ fontSize: '.58rem', fontWeight: 400, opacity: .65 }}> ·model</small>}</>
  )
}

/** Bottom-of-panel toggle revealing the full 24-hour breakdown. */
function HourlyDetails({ hourly }: { hourly: { time: string; value: number }[] }) {
  const [open, setOpen] = useState(false)
  const rows = hourly.filter((_, i) => i % 2 === 0)
  const peak = hourly.reduce((a, b) => (b.value > a.value ? b : a), hourly[0])
  return (
    <div style={{ marginTop: '.6rem' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.35rem',
          padding: '.5rem', borderRadius: 8, fontSize: '.7rem', fontWeight: 700, cursor: 'pointer',
          background: open ? 'var(--primary)' : 'var(--bg-sunken)', color: open ? '#fff' : 'var(--primary)',
        }}
        aria-expanded={open}
      >
        {open ? 'Hide details' : 'Show details'}
      </button>
      {open && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: '.35rem', marginTop: '.5rem' }}>
          {rows.map(r => (
            <div key={r.time} style={{ padding: '.4rem', textAlign: 'center', borderStyle: r.time === peak.time ? 'solid' : undefined, borderWidth: r.time === peak.time ? 1 : undefined }} className={r.time === peak.time ? 'bg-primary-50 border border-primary rounded-[8px]' : 'bg-sunken rounded-[8px]'}>
              <span style={{ fontSize: '.58rem', display: 'block' }} className="text-tertiary">{r.time}</span>
              <strong style={{ fontSize: '.78rem' }}>{r.value.toFixed(1)}°</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CityDetailPage() {
  const params = useParams<{ slug: string }>()
  const [stations, setStations] = useState<DhmStationForecast[]>([])
  const [forecastAt, setForecastAt] = useState<string | undefined>(undefined)
  const [obs, setObs] = useState<DhmObservations | null>(null)
  const [quakes, setQuakes] = useState<NepalQuake[]>([])
  const [incidents, setIncidents] = useState<BipadIncident[]>([])
  const [alerts, setAlerts] = useState<BipadAlert[]>([])
  const [wx, setWx] = useState<CurrentWeather | null>(null)
  const [pm25, setPm25] = useState<number | null>(null)
  const [hourly, setHourly] = useState<{ time: string; value: number }[]>([])
  const [daily, setDaily] = useState<{ date: string; max: number | null; min: number | null }[]>([])
  const [centroids, setCentroids] = useState<BipadGeo[]>([])
  const [missing, setMissing] = useState(false)

  const city = stations.find(s => slugify(s.name) === params.slug) ?? null
  const observed = obs?.stations?.find(s => s.id === city?.id) ?? null

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchDhmForecast(), fetchDhmObservations(), fetchNepalQuakes(20), fetchBipadIncidents(30), fetchBipadAlerts(20)])
      .then(([f, o, q, inc, al]) => {
        if (cancelled) return
        const list = (f?.stations ?? []).filter(s => (s.manual_forecast ?? []).length > 0)
        setStations(list)
        setForecastAt(f?.datetime)
        setObs(o)
        setQuakes(q)
        setIncidents(inc.results)
        setAlerts(al.results)
        if (!list.some(s => slugify(s.name) === params.slug)) setMissing(true)
      })
      .catch(() => { if (!cancelled) setMissing(true) })
    return () => { cancelled = true }
  }, [params.slug])

  useEffect(() => {
    let cancelled = false
    fetchBipadDistrictCentroids()
      .then(d => { if (!cancelled) setCentroids(d.results) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!city) return
    let cancelled = false
    Promise.all([
      fetchCurrentWeather({ lat: city.latitude, lon: city.longitude }),
      fetchCurrentPm25({ lat: city.latitude, lon: city.longitude }),
      fetchDailyHighLow({ lat: city.latitude, lon: city.longitude }),
      fetchHourlyTemps({ lat: city.latitude, lon: city.longitude }),
    ])
      .then(([w, pm, dy, hh]) => {
        if (cancelled) return
        setWx(w)
        setPm25(pm)
        setDaily(dy)
        setHourly(hh)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [city?.id, city?.latitude, city?.longitude])

  const nearQuakes = useMemo(() => {
    if (!city) return []
    return quakes
      .map(q => ({ ...q, km: distanceKm(city.latitude, city.longitude, q.coordinates[1], q.coordinates[0]) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 5)
  }, [quakes, city])

  if (missing) {
    return (
      <div className="content-wrap">
        <Link href="/environment" className="text-button"><ArrowLeft size={14} /> All places</Link>
        <section className="panel" style={{ marginTop: '.75rem' }}>
          <p className="eyebrow">UNKNOWN PLACE</p>
          <h2>No weather station found for “{params.slug}”.</h2>
          <p className="muted">DHM publishes 19 stations - pick one from the list.</p>
        </section>
      </div>
    )
  }

  const day1 = city?.manual_forecast?.find(d => d.day === 1) ?? city?.manual_forecast?.[0]
  const day2 = city?.manual_forecast?.find(d => d.day === 2) ?? city?.manual_forecast?.[1]
  const kind = skyKind(day1?.weather?.name)
  const night = !isDayBySun(city?.sunrise, city?.sunset)
  const aqi = pm25Band(pm25)
  const AqiIcon = aqi?.cls === 'status-bad' ? Frown : aqi?.cls === 'status-warn' ? Meh : aqi ? Smile : null

  // DHM gaps filled transparently: observed ← model today, forecast max ← model day.
  const dMin0 = daily[0]?.min ?? null
  const dMax0 = daily[0]?.max ?? null
  const dMax1 = daily[1]?.max ?? null
  const obsMin = observed?.min_temperature ?? dMin0
  const obsMax = observed?.max_temperature ?? dMax0
  const obsMinModel = observed?.min_temperature == null && dMin0 != null
  const obsMaxModel = observed?.max_temperature == null && dMax0 != null

  // Every forecast day the API actually ships, labeled by its real calendar date
  // (DHM numbers days from the issue date: entries are NOT always 1 and 2).
  const dayRows = useMemo(() => {
    const list = [...(city?.manual_forecast ?? [])].sort((a, b) => (a.day ?? 0) - (b.day ?? 0))
    return list.map(f => {
      const dn = f.day ?? 1
      const model = daily[dn - 1]
      const to = f.to_temperature ?? model?.max ?? null
      return {
        d: f,
        to,
        toModel: f.to_temperature == null && to != null,
        from: f.from_temperature ?? model?.min ?? null,
        fromModel: f.from_temperature == null && model?.min != null,
        label: dn === 1 ? 'Today' : dn === 2 ? 'Tomorrow' : forecastDayLabel(dn, forecastAt),
        sub: dn <= 2 ? forecastDayLabel(dn, forecastAt) : '',
      }
    })
  }, [city, daily, forecastAt])

  /** Closest sibling stations for the "nearby" strip. */
  const nearbyStations = useMemo(() => {
    if (!city) return []
    return stations
      .filter(s => s.id !== city.id)
      .map(s => ({ s, km: distanceKm(city.latitude, city.longitude, s.latitude, s.longitude) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 6)
  }, [stations, city])

  /** DHM stations carry no district, so the climate panel uses the nearest district centroid. */
  const nearDistrict = useMemo(() => {
    if (!city) return null
    let best: { id: number; title: string; km: number } | null = null
    for (const d of centroids) {
      const c = d.centroid?.coordinates
      if (!c || c.length !== 2) continue
      const km = distanceKm(city.latitude, city.longitude, c[1], c[0])
      if (!best || km < best.km) best = { id: d.id, title: d.title ?? 'district', km }
    }
    return best
  }, [centroids, city])

  /** Incidents/alerts within 50 km, newest first - shared feed renders them. */
  const nearby = useMemo(() => {
    if (!city) return { incidents: [] as BipadIncident[], alerts: [] as BipadAlert[], distances: {} as Record<string, number> }
    const within = (p: { type: string; coordinates: [number, number] } | undefined): number | null => {
      if (!p || p.coordinates?.length !== 2) return null
      const km = distanceKm(city.latitude, city.longitude, p.coordinates[1], p.coordinates[0])
      return km <= 50 ? km : null
    }
    const distances: Record<string, number> = {}
    const nearInc = incidents.filter(inc => {
      const km = within(inc.point)
      if (km == null) return false
      distances[`i${inc.id}`] = km
      return true
    })
    const nearAl = alerts.filter(a => {
      const km = within(a.point)
      if (km == null) return false
      distances[`a${a.id}`] = km
      return true
    })
    return { incidents: nearInc, alerts: nearAl, distances }
  }, [incidents, alerts, city])

  return (
    <div className="content-wrap">
      <Link href="/environment" className="text-button"><ArrowLeft size={14} /> All places</Link>

      <div className={`env-hero${night ? ' night' : ''}`} style={{ marginTop: '.75rem' }}>
        <div className="env-hero-grid">
          <div>
            <p style={{ fontSize: '.6rem', letterSpacing: '.16em', fontWeight: 700, opacity: .7, margin: 0 }}>
              <MapPin size={10} style={{ display: 'inline', verticalAlign: '-1px' }} /> {city ? `${city.latitude.toFixed(2)}°N, ${city.longitude.toFixed(2)}°E` : 'LOCATING…'}
            </p>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 500, letterSpacing: '-.03em', margin: '.3rem 0' }}>
              {city?.name ?? '…'}
            </h1>
            <div style={{ display: 'flex', gap: '1.75rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <span style={{ fontSize: '.55rem', opacity: .6, textTransform: 'uppercase', letterSpacing: '.1em' }}>{wx?.temperature_2m != null ? 'Right now · live' : 'Today’s high · observed'}</span>
                <strong style={{ display: 'block', fontSize: '2.4rem', letterSpacing: '-.04em', lineHeight: 1.05 }}>
                  {wx?.temperature_2m != null ? `${wx.temperature_2m.toFixed(1)}°C` : observed?.max_temperature != null ? `${observed.max_temperature.toFixed(1)}°C` : '-'}
                </strong>
                <span style={{ fontSize: '.75rem', opacity: .85 }}>{day1?.weather?.name ?? ''}</span>
              </div>
              {[
                { label: 'Observed min / max', val: <><Val v={obsMin} model={obsMinModel} /> / <Val v={obsMax} model={obsMaxModel} /></> },
                { label: 'Rainfall today', val: observed?.rainfall != null ? `${observed.rainfall} mm` : '-' },
                { label: 'Humidity', val: wx?.relative_humidity_2m != null ? `${wx.relative_humidity_2m}%` : '-' },
                { label: 'PM2.5', val: pm25 != null ? <>{pm25.toFixed(1)} µg/m³{aqi && <span className={`status-badge ${aqi.cls}`} style={{ marginLeft: '.35rem', fontSize: '.55rem', padding: '.1rem .4rem', verticalAlign: '1px' }}>{aqi.label}</span>}</> : '-' },
                ...(city?.sunrise && city?.sunset
                  ? [{ label: 'Sunrise / sunset', val: <>{shortClock(city.sunrise)} · {shortClock(city.sunset)}</> }]
                  : []),
              ].map(item => (
                <div key={item.label}>
                  <span style={{ fontSize: '.55rem', opacity: .6, textTransform: 'uppercase', letterSpacing: '.1em' }}>{item.label}</span>
                  <strong style={{ display: 'block', fontSize: '1.05rem', letterSpacing: '-.02em' }}>{item.val}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="wx-stage" title={day1?.weather?.name ?? SKY_META[kind].label}>
            <span className="wx-halo"><WeatherIcon kind={kind} size={130} night={night} /></span>
            <span className="wx-caption">{day1?.weather?.name ?? SKY_META[kind].label}{night ? ' · night' : ''}</span>
            {aqi && AqiIcon && (
              <span className={`status-badge ${aqi.cls}`} title={`PM2.5 ${pm25?.toFixed(1)} µg/m³ · US EPA band`}>
                <AqiIcon size={12} /> Air · {aqi.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Across today: 24h curve + min/now/max ── */}
      {(hourly.length > 1 || obsMin != null || obsMax != null) && (
        <section className="panel" style={{ marginBottom: '.75rem' }}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">ACROSS TODAY</p>
              <h2>How the day moves</h2>
            </div>
            <span className="muted" style={{ fontSize: '.68rem' }}>Model curve · observed anchors</span>
          </div>
          {hourly.length > 1 && (
            <div style={{ marginTop: '.6rem' }}>
              <LineChart
                data={hourly.filter((_, i) => i % 2 === 0).map(h => ({ year: h.time, value: h.value }))}
                color="var(--primary)"
                height={110}
                formatValue={v => `${v.toFixed(1)}°C`}
              />
            </div>
          )}
          {obsMin != null && obsMax != null && obsMax > obsMin && (
            <div style={{ marginTop: '.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.6rem', fontWeight: 700, marginBottom: '.3rem' }}>
                <span className="text-tertiary">Low {Math.round(obsMin)}°</span>
                <span className="text-primary">Now {wx?.temperature_2m != null ? `${wx.temperature_2m.toFixed(1)}°` : '-'}</span>
                <span className="text-tertiary">High {Math.round(obsMax)}°</span>
              </div>
              <div style={{ height: 8, borderRadius: 99, background: 'var(--border-light)', position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: wx?.temperature_2m != null
                    ? `calc(${Math.min(100, Math.max(0, ((wx.temperature_2m - obsMin) / (obsMax - obsMin)) * 100))}% - 7px)`
                    : '50%',
                  top: -3, width: 14, height: 14, borderRadius: '50%',
                  background: 'var(--bg-elevated)', border: '3px solid var(--primary)', boxShadow: 'var(--shadow-sm)',
                }} />
              </div>
            </div>
          )}
          {hourly.length > 1 && (
            <HourlyDetails hourly={hourly} />
          )}
        </section>
      )}

      <section className="feature-grid">
        <article className="panel">
          <p className="eyebrow">DHM · TWO-DAY OUTLOOK</p>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1.1rem', margin: '.15rem 0 .6rem' }}>What&apos;s coming</h3>
          {dayRows.map((row, i) =>
            row.d ? (
              <div key={row.d.day ?? i} style={{ display: 'flex', alignItems: 'center', gap: '.8rem', padding: '.7rem 0', borderTop: i ? '1px solid var(--border-light)' : 0 }}>
                <span style={{ fontSize: '.68rem', fontWeight: 700, color: 'var(--text-tertiary)', minWidth: 76 }}>{row.label}{row.sub ? ` · ${row.sub}` : ''}</span>
                <WeatherIcon kind={skyKind(row.d.weather?.name)} size={36} night={night} />
                <strong style={{ fontSize: '1rem' }}><Val v={row.d.from_temperature} model={row.fromModel} /> / <Val v={row.to} model={row.toModel} /></strong>
                <span style={{ fontSize: '.72rem', color: 'var(--text-secondary)', flex: 1 }}>{row.d.weather?.name ?? ''}</span>
                <span className={`status-badge ${row.d.rain_probability > 40 ? 'status-warn' : 'status-good'}`}>
                  <Droplets size={11} /> {row.d.rain_probability}%
                </span>
              </div>
            ) : null,
          )}
        </article>

        <article className="panel">
          <div className="panel-head">
            <div><p className="eyebrow">NEAREST TREMORS</p><h3>Ground nearby</h3><p className="muted">USGS, ranked by distance</p></div>
            <Activity style={{ color: 'var(--warning)' }} size={20} />
          </div>
          {nearQuakes.length ? nearQuakes.map(q => (
            <a className="signal" key={q.id} href={q.url} target="_blank" rel="noreferrer">
              <strong style={{ color: quakeColor(q.mag), fontSize: '.95rem', minWidth: 52 }}>M{q.mag.toFixed(1)}</strong>
              <div>
                <strong>{q.place.replace(/, Nepal$/, '')}</strong>
                <p>{Math.round(q.km)} km away{q.depthKm != null ? ` · ${Math.round(q.depthKm)} km deep` : ''} · {timeAgo(q.time)}</p>
              </div>
            </a>
          )) : <p className="muted">No tremors in range.</p>}
        </article>
      </section>

      {/* ── Nearby stations ── */}
      {nearbyStations.length > 0 && (
        <section className="panel" style={{ marginTop: '.75rem' }}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">NEIGHBOURS</p>
              <h2>Nearby places</h2>
            </div>
            <span className="muted" style={{ fontSize: '.68rem' }}>Closest first · tap to visit</span>
          </div>
          <div className="city-grid">
            {nearbyStations.map(({ s, km }) => {
              const dd = s.manual_forecast?.find(x => x.day === 1) ?? s.manual_forecast?.[0]
              const kk = skyKind(dd?.weather?.name)
              const mm = SKY_META[kk]
              const IIcon = skyLucide(kk, night)
              return (
                <Link key={s.id} href={`/environment/${slugify(s.name)}`} className="city-card">
                  <span className="city-icon" style={{ background: mm.bg, color: mm.tint }}>
                    <IIcon size={19} />
                  </span>
                  <span className="city-main">
                    <strong>{s.name}</strong>
                    <small>{dd?.weather?.name ?? 'No detail'} · {Math.round(km)} km</small>
                  </span>
                  <span className="city-temp">{dd?.from_temperature ?? '-'}°</span>
                  {dd && dd.rain_probability > 40 && (
                    <span className="status-badge status-warn city-rain"><Droplets size={11} /> {dd.rain_probability}%</span>
                  )}
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Warnings near this district ── */}
      <section className="panel" style={{ marginTop: '.75rem' }}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">BIPAD · WITHIN 50 KM</p>
            <h3>Warnings near {city?.name ?? 'here'}</h3>
            <p className="muted">Incidents and alerts closest to this station</p>
          </div>
          <TriangleAlert style={{ color: nearby.incidents.length + nearby.alerts.length ? 'var(--warning)' : 'var(--primary)' }} size={20} />
        </div>
        {nearby.incidents.length + nearby.alerts.length ? (
          <HazardFeed incidents={nearby.incidents} alerts={nearby.alerts} distances={nearby.distances} initial={4} />
        ) : <p className="muted">No incidents or alerts within 50 km - quiet skies over {city?.name ?? 'this station'}.</p>}
      </section>

      {/* ── Climate projections for the nearest district ── */}
      {nearDistrict && <ClimatePanel districtId={nearDistrict.id} districtName={nearDistrict.title} />}

      <div style={{ padding: '.9rem 1.1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '.6rem', boxShadow: 'var(--shadow-sm)', marginTop: '.75rem' }}>
        <Wind size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: '.62rem', color: 'var(--text-secondary)' }}>
          Forecast &amp; observations: DHM MFD · Tremors: USGS FDSN · Current conditions &amp; PM2.5: Open-Meteo
        </p>
      </div>
    </div>
  )
}
