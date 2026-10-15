'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Droplets, Flame, TriangleAlert, Activity, MapPin, Wind } from 'lucide-react'
import { fetchDhmForecast, fetchDhmObservations, type DhmWeather, type DhmObservations, type DhmStationForecast } from '@/lib/dhm'
import { fetchBipadIncidents, fetchBipadAlerts, type BipadIncident, type BipadAlert } from '@/lib/bipad'
import { fetchCurrentWeather, fetchCurrentPm25, fetchNepalQuakes, fetchCurrentTemps, fetchHourlyTemps, type CurrentWeather, type NepalQuake } from '@/lib/meteo'
import { LineChart } from '@/components/charts'
import { slugify } from '@/lib/data'
import { skyKind, SKY_META } from '@/lib/condition'
import { WeatherIcon, skyLucide } from '@/components/weather-icon'
import { isDayBySun, shortClock } from '@/lib/time'
import { HazardFeed } from '@/components/hazard-feed'
import { timeAgo } from '@/lib/time'

function quakeColor(mag: number): string {
  if (mag >= 5) return 'var(--danger)'
  if (mag >= 4) return 'var(--warning)'
  return 'var(--primary)'
}

const KTM = { lat: 27.71, lon: 85.32 }

export default function EnvironmentPage() {
  const [forecast, setForecast] = useState<DhmWeather | null>(null)
  const [obs, setObs] = useState<DhmObservations | null>(null)
  const [incidents, setIncidents] = useState<BipadIncident[]>([])
  const [alerts, setAlerts] = useState<BipadAlert[]>([])
  const [quakes, setQuakes] = useState<NepalQuake[]>([])
  const [wx, setWx] = useState<CurrentWeather | null>(null)
  const [pm25, setPm25] = useState<number | null>(null)
  const [ktmHourly, setKtmHourly] = useState<{ time: string; value: number }[]>([])
  const [liveTemps, setLiveTemps] = useState<Record<number, number>>({})
  const tempsFor = useRef<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [f, o, inc, al, q, w, pm, hh] = await Promise.all([
          fetchDhmForecast(),
          fetchDhmObservations(),
          fetchBipadIncidents(30),
          fetchBipadAlerts(15),
          fetchNepalQuakes(6),
          fetchCurrentWeather(KTM),
          fetchCurrentPm25(KTM),
          fetchHourlyTemps(KTM),
        ])
        if (cancelled) return
        setForecast(f)
        setObs(o)
        setIncidents(inc.results)
        setAlerts(al.results)
        setQuakes(q)
        setWx(w)
        setPm25(pm)
        setKtmHourly(hh)
      } catch {
        // sections fail soft independently
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const stations: DhmStationForecast[] = (forecast?.stations ?? []).filter(s => (s.manual_forecast ?? []).length > 0)

  // One batched call for live temps across all stations — cards and detail
  // heroes read the same value, so a card never disagrees with its detail page.
  useEffect(() => {
    const key = forecast?.datetime ?? ''
    const list = (forecast?.stations ?? []).filter(s => (s.manual_forecast ?? []).length > 0)
    if (!key || !list.length || tempsFor.current === key) return
    tempsFor.current = key
    fetchCurrentTemps(list.map(s => ({ lat: s.latitude, lon: s.longitude })))
      .then(ts => {
        const m: Record<number, number> = {}
        list.forEach((s, i) => { if (ts[i] != null) m[s.id] = ts[i] as number })
        setLiveTemps(m)
      })
      .catch(() => {})
  }, [forecast])
  const ktmStation = stations.find(s => s.name.toLowerCase().includes('kathmandu')) ?? null
  const ktmObs = obs?.stations?.find(s => s.id === ktmStation?.id) ?? obs?.stations?.find(s => s.name.toLowerCase().includes('kathmandu')) ?? null
  const ktmDay = ktmStation?.manual_forecast?.find(d => d.day === 1) ?? ktmStation?.manual_forecast?.[0]
  const night = useMemo(() => !isDayBySun(ktmStation?.sunrise, ktmStation?.sunset), [ktmStation?.sunrise, ktmStation?.sunset])

  return (
    <div className="content-wrap">
      {/* ── Kathmandu hero - the sky right now ── */}
      <div className={`env-hero${night ? ' night' : ''}`}>
        <div className="env-hero-grid">
          <div className="env-hero-body" style={{ padding: 0 }}>
            <p className="eyebrow" style={{ color: '#9adbc4' }}>LIVE ENVIRONMENT · KATHMANDU VALLEY</p>
            <h1>Kathmandu is {ktmDay?.weather?.name?.toLowerCase() ?? (loading ? 'waking up…' : 'unreported')}.</h1>
            <div className="env-hero-stats">
              <div>
                <span>{wx?.temperature_2m != null ? 'Right now · live' : 'Today’s high · observed'}</span>
                <strong>{wx?.temperature_2m != null ? `${wx.temperature_2m.toFixed(1)}°C` : ktmObs?.max_temperature != null ? `~${ktmObs.max_temperature.toFixed(0)}°C` : '-'}</strong>
              </div>
              {[
                { label: 'Observed min / max', val: ktmObs ? `${ktmObs.min_temperature?.toFixed(0) ?? '-'}° / ${ktmObs.max_temperature?.toFixed(0) ?? '-'}°` : '-' },
                { label: 'Rainfall today', val: ktmObs?.rainfall != null ? `${ktmObs.rainfall} mm` : '-' },
                { label: 'Rain likely', val: ktmDay ? `${ktmDay.rain_probability}%` : '-' },
                { label: 'PM2.5', val: pm25 != null ? `${pm25.toFixed(1)} µg/m³` : '-' },
                ...(ktmStation?.sunrise && ktmStation?.sunset
                  ? [{ label: 'Sunrise / sunset', val: `${shortClock(ktmStation.sunrise)} · ${shortClock(ktmStation.sunset)}` }]
                  : []),
              ].map(item => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.val}</strong>
                </div>
              ))}
            </div>
            {ktmStation && (
              <Link href={`/environment/${slugify(ktmStation.name)}`} className="env-hero-link">
                Open Kathmandu details <ArrowUpRight size={14} />
              </Link>
            )}
            {ktmObs?.min_temperature != null && ktmObs?.max_temperature != null && ktmObs.max_temperature > ktmObs.min_temperature && (
              <div style={{ marginTop: '1rem', maxWidth: 420 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.6rem', fontWeight: 700, marginBottom: '.3rem', opacity: .75 }}>
                  <span>Low {ktmObs.min_temperature.toFixed(0)}°</span>
                  <span>Now {wx?.temperature_2m != null ? `${wx.temperature_2m.toFixed(1)}°` : ''}</span>
                  <span>High {ktmObs.max_temperature.toFixed(0)}°</span>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,.2)', position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: wx?.temperature_2m != null
                      ? `calc(${Math.min(100, Math.max(0, ((wx.temperature_2m - ktmObs.min_temperature) / (ktmObs.max_temperature - ktmObs.min_temperature)) * 100))}% - 7px)`
                      : '50%',
                    top: -3, width: 14, height: 14, borderRadius: '50%', background: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,.3)',
                  }} />
                </div>
              </div>
            )}
          </div>
          <div className="wx-stage" title={ktmDay?.weather?.name ?? 'Current sky'}>
            <span className="wx-halo"><WeatherIcon kind={skyKind(ktmDay?.weather?.name)} size={120} night={night} /></span>
            <span className="wx-caption">{ktmDay?.weather?.name ?? SKY_META.partly.label}{night ? ' · night' : ''}</span>
          </div>
        </div>
        {ktmHourly.length > 1 && (
          <div style={{ padding: '0 clamp(1.5rem, 3vw, 2.5rem) clamp(1.25rem, 2vw, 1.75rem)' }}>
            <LineChart
              data={ktmHourly.filter((_, i) => i % 2 === 0).map(h => ({ year: h.time, value: h.value }))}
              color="#ffffff"
              height={80}
              formatValue={v => `${v.toFixed(1)}°C`}
              title="Kathmandu · across today"
            />
          </div>
        )}
      </div>

      {/* ── Other places: pocket condition cards ── */}
      <section className="panel" style={{ marginBottom: '.75rem' }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">DHM · {stations.length} STATIONS</p>
            <h2>Other places</h2>
          </div>
          <span className="muted" style={{ fontSize: '.68rem' }}>Green dot = live now, otherwise today&apos;s high · tap a card for the full picture</span>
        </div>
        {stations.length ? (
          <div className="city-grid">
            {stations.map(s => {
              const d1 = s.manual_forecast?.find(d => d.day === 1) ?? s.manual_forecast?.[0]
              const ob = obs?.stations?.find(o => o.id === s.id)
              const kind = skyKind(d1?.weather?.name)
              const meta = SKY_META[kind]
              const Icon = skyLucide(kind, night)
              return (
                <Link key={s.id} href={`/environment/${slugify(s.name)}`} className="city-card">
                  <span className="city-icon" style={{ background: meta.bg, color: meta.tint }}>
                    <Icon size={19} />
                  </span>
                  <span className="city-main">
                    <strong>{s.name}</strong>
                    <small>{d1?.weather?.name ?? 'No detail'}{ob?.rainfall ? ` · ${ob.rainfall} mm` : ''}</small>
                  </span>
                  <span className="city-temp" title={liveTemps[s.id] != null ? 'Live now' : "Today's observed high"}>{liveTemps[s.id] != null && <i className="live-dot" style={{ display: 'inline-block', marginRight: '.3rem', verticalAlign: '3px' }} />}{liveTemps[s.id]?.toFixed(0) ?? ob?.max_temperature?.toFixed(0) ?? d1?.from_temperature ?? '-'}°</span>
                  {d1 && d1.rain_probability > 40 && (
                    <span className="status-badge status-warn city-rain"><Droplets size={11} /> {d1.rain_probability}%</span>
                  )}
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="muted" style={{ marginTop: '.75rem' }}>{loading ? 'Loading stations…' : 'Station list unavailable.'}</p>
        )}
      </section>

      {/* ── Incidents + alerts ── */}
      <section className="feature-grid">
        <article className="panel">
          <div className="panel-head">
            <div><p className="eyebrow">BIPAD · NDRRMA</p><h3>Latest incidents</h3><p className="muted">Fires, floods, landslides - reported near-real-time</p></div>
            <Flame style={{ color: 'var(--danger)' }} size={20} />
          </div>
          {loading && !incidents.length ? <p className="muted">Loading…</p> : incidents.length ? <HazardFeed incidents={incidents} alerts={[]} /> : <p className="muted">No incidents in feed.</p>}
        </article>

        <article className="panel">
          <div className="panel-head">
            <div><p className="eyebrow">BIPAD · WARNINGS</p><h3>Active alerts</h3></div>
            <TriangleAlert style={{ color: 'var(--warning)' }} size={20} />
          </div>
          {loading && !alerts.length ? <p className="muted">Loading…</p> : alerts.length ? <HazardFeed incidents={[]} alerts={alerts} /> : <p className="muted">No active alerts.</p>}
          <Link href="/sources" className="panel-link">Why this matters for projects <ArrowUpRight size={14} /></Link>
        </article>
      </section>

      {/* ── Tremors ── */}
      <section className="panel" style={{ marginTop: '.75rem' }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">USGS · NEPAL BBOX 26-31°N</p>
            <h2>Recent tremors</h2>
          </div>
          <span className="muted" style={{ fontSize: '.68rem' }}><Activity size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Infra-risk context for hydropower & roads</span>
        </div>
        {quakes.length ? (
          <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', marginTop: '.9rem' }}>
            {quakes.map(q => (
              <a key={q.id} href={q.url} target="_blank" rel="noreferrer" title={q.depthKm != null ? `M${q.mag.toFixed(1)} · ${Math.round(q.depthKm)} km deep` : `M${q.mag.toFixed(1)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem', padding: '.55rem .8rem', background: 'var(--bg-sunken)', borderRadius: 10, fontSize: '.74rem' }}>
                <strong style={{ color: quakeColor(q.mag), fontSize: '.95rem' }}>M{q.mag.toFixed(1)}</strong>
                <span style={{ color: 'var(--text-secondary)' }}>{q.place.replace(/, Nepal$/, '')}</span>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '.64rem' }}>{timeAgo(q.time)}</span>
              </a>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ marginTop: '.75rem' }}>{loading ? 'Loading…' : 'No recent tremors in range.'}</p>
        )}
        <p className="muted" style={{ marginTop: '.6rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
          <MapPin size={12} /> Open any city above for tremors ranked by distance.
        </p>
      </section>

      {/* ── Sources ── */}
      <div style={{ padding: '.9rem 1.1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '.6rem', boxShadow: 'var(--shadow-sm)', marginTop: '.75rem' }}>
        <Wind size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: '.62rem', color: 'var(--text-secondary)' }}>
          <strong style={{ fontSize: '.74rem', color: 'var(--text)' }}>Live feeds, refreshed hourly.</strong><br />
          Forecast &amp; observations: DHM MFD · Incidents &amp; alerts: BIPAD/NDRRMA · Tremors: USGS FDSN · Current conditions &amp; PM2.5: Open-Meteo
        </p>
      </div>
    </div>
  )
}
