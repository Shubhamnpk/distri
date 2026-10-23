'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BookOpen, Building2, ChevronDown, Cloud, ExternalLink, GraduationCap, Home,
  MapPin, Mountain, Users,
} from 'lucide-react'
import { DISTRICTS, LOCAL_UNITS } from '@/lib/geo-constants'
import { PROVINCE_INFO } from '@/lib/province-info'
import {
  KIND_LABEL, KIND_ORDER, fetchDailyForecast, fetchNearbyPlaces, fetchPlaceAreas, fetchProvinceAttractions,
  fetchWikiSummary, findProvince, wmoText, type DailyForecast, type NearbyPlace, type PlaceAreas,
  type ProvinceAttraction, type WikiSummary,
} from '@/lib/places'
import { canonDistrictKey, fetchBipadDistricts, type BipadDistrict } from '@/lib/district-geo'
import { fetchBipadDistrictProfile, type DistrictProfile } from '@/lib/bipad'
import {
  fetchClimateSummary, fetchCurrentPm25, fetchCurrentWeather,
  type ClimateSummary, type CurrentWeather,
} from '@/lib/meteo'
import { pm25Band, skyKind } from '@/lib/condition'
import { WeatherIcon } from '@/components/weather-icon'
import { SortableTh, TableShell, useTableSort } from '@/components/data-table'
import { sortRows } from '@/lib/table-sort'

const ProvinceMap = dynamic(() => import('@/components/province-map').then(m => m.ProvinceMap), { ssr: false })

const nf = new Intl.NumberFormat('en-IN')

const KIND_COLOR = {
  metropolitan: 'var(--accent)',
  sub_metropolitan: '#1a9e7a',
  municipality: '#e0a351',
  rural_municipality: '#8b5cf6',
} as const

type DistrictRow = {
  name: string
  slug: string
  population: number | null
  households: number | null
  literacy: number | null
  areaSqKm: number | null
  density: number | null
  units: number
}

type DistrictSortKey = 'name' | 'population' | 'households' | 'literacy' | 'area' | 'density' | 'units'

export default function ProvincePage() {
  const params = useParams()
  const slug = String(params?.province ?? '')
  const province = useMemo(() => findProvince(slug), [slug])
  const info = province ? PROVINCE_INFO[province.name] : undefined

  const [areas, setAreas] = useState<PlaceAreas | null>(null)
  const [bipad, setBipad] = useState<BipadDistrict[]>([])
  const [profiles, setProfiles] = useState<Record<string, DistrictProfile>>({})
  const [weather, setWeather] = useState<CurrentWeather | null>(null)
  const [pm, setPm] = useState<number | null>(null)
  const [daily, setDaily] = useState<DailyForecast[]>([])
  const [climate, setClimate] = useState<ClimateSummary | null>(null)
  const [wiki, setWiki] = useState<WikiSummary | null>(null)
  const [nearby, setNearby] = useState<NearbyPlace[]>([])
  const [attractions, setAttractions] = useState<ProvinceAttraction[]>([])
  const [loading, setLoading] = useState(true)
  const [censusLoading, setCensusLoading] = useState(true)
  const { sort, toggleSort } = useTableSort<DistrictSortKey>(
    { key: 'population', dir: -1 },
    { name: 'text', population: 'number', households: 'number', literacy: 'number', area: 'number', density: 'number', units: 'number' },
  )

  useEffect(() => {
    if (!province || !info) {
      setLoading(false)
      setCensusLoading(false)
      return
    }
    let cancelled = false

    setAreas(null)
    setBipad([])
    setProfiles({})
    setWeather(null)
    setPm(null)
    setDaily([])
    setClimate(null)
    setWiki(null)
    setNearby([])
    setAttractions([])
    setLoading(true)
    setCensusLoading(true)

    const provinceDistricts = DISTRICTS.filter(d => d.province === province.name)
    const at = { lat: info.lat, lon: info.lon }

    ;(async () => {
      const [places, bipadRows, wikiSummary] = await Promise.all([
        fetchPlaceAreas(),
        fetchBipadDistricts(),
        fetchWikiSummary(`${province.name} Province`, province.name),
      ])
      if (cancelled) return

      setAreas(places)
      setBipad(bipadRows)
      setWiki(wikiSummary)

      const byKey = new Map(
        bipadRows
          .filter(d => d.province === province.name)
          .map(d => [canonDistrictKey(d.name), d]),
      )

      const jobs: Promise<void>[] = [
        Promise.all(provinceDistricts.map(async district => {
          const id = byKey.get(canonDistrictKey(district.name))?.id
          if (id == null) return null
          try {
            const profile = await fetchBipadDistrictProfile(id)
            return profile ? [district.slug, profile] as const : null
          } catch {
            return null
          }
        })).then(entries => {
          if (cancelled) return
          const next: Record<string, DistrictProfile> = {}
          for (const entry of entries) {
            if (entry) next[entry[0]] = entry[1]
          }
          setProfiles(next)
          setCensusLoading(false)
        }),
        fetchCurrentWeather(at).then(v => { if (!cancelled) setWeather(v) }),
        fetchCurrentPm25(at).then(v => { if (!cancelled) setPm(v) }),
        fetchDailyForecast(at.lat, at.lon, 5).then(v => { if (!cancelled) setDaily(v) }),
        fetchClimateSummary(at).then(v => { if (!cancelled) setClimate(v) }),
        fetchNearbyPlaces(at.lat, at.lon, 10000, 4).then(v => { if (!cancelled) setNearby(v) }),
        fetchProvinceAttractions(info.wikidata, 12).then(v => { if (!cancelled) setAttractions(v) }),
      ]

      await Promise.all(jobs)
      if (!cancelled) setLoading(false)
    })().catch(() => {
      if (!cancelled) {
        setLoading(false)
        setCensusLoading(false)
      }
    })

    return () => { cancelled = true }
  }, [province, info])

  if (!province) {
    return (
      <main className="content-wrap">
        <p className="eyebrow">Not found</p>
        <h1>Province not found</h1>
        <p className="muted">
          There is no province at &ldquo;{slug}&rdquo;. <Link href="/places" className="text-accent">Browse all places</Link>.
        </p>
      </main>
    )
  }

  const provinceDistricts = DISTRICTS
    .filter(d => d.province === province.name)
    .sort((a, b) => a.name.localeCompare(b.name))
  const units = LOCAL_UNITS.filter(u => u.province === province.name)
  const kindCounts = KIND_ORDER.map(kind => ({
    kind,
    count: units.filter(u => u.kind === kind).length,
  }))
  const metroUnits = units
    .filter(u => u.kind === 'metropolitan' || u.kind === 'sub_metropolitan')
    .sort((a, b) => a.name.localeCompare(b.name))
  const groupedUnits = KIND_ORDER
    .map(kind => ({ kind, items: units.filter(u => u.kind === kind).sort((a, b) => a.name.localeCompare(b.name)) }))
    .filter(group => group.items.length)

  const rows: DistrictRow[] = provinceDistricts.map(district => {
    const profile = profiles[district.slug]
    const areaSqKm = areas?.districts[district.slug]?.areaSqKm ?? null
    const districtUnits = LOCAL_UNITS.filter(u => u.district === district.name).length
    return {
      name: district.name,
      slug: district.slug,
      population: profile?.population ?? null,
      households: profile?.households ?? null,
      literacy: profile?.literacy ?? null,
      areaSqKm,
      density: profile && areaSqKm && areaSqKm > 0 ? profile.population / areaSqKm : null,
      units: districtUnits,
    }
  })

  const sortedRows = sortRows(rows, sort, {
    name: row => row.name,
    population: row => row.population,
    households: row => row.households,
    literacy: row => row.literacy,
    area: row => row.areaSqKm,
    density: row => row.density,
    units: row => row.units,
  })

  const sums = Object.values(profiles).reduce((acc, profile) => ({
    population: acc.population + profile.population,
    male: acc.male + profile.male,
    female: acc.female + profile.female,
    households: acc.households + profile.households,
    above5: acc.above5 + profile.above5,
    literate: acc.literate + profile.literate,
    year: acc.year || profile.censusYear,
  }), { population: 0, male: 0, female: 0, households: 0, above5: 0, literate: 0, year: '' })

  const provinceAreaRow = areas?.provinces[province.slug]
  const districtArea = rows.reduce((sum, row) => sum + (row.areaSqKm ?? 0), 0)
  const provinceArea = provinceAreaRow?.areaSqKm ?? districtArea
  const density = sums.population > 0 && provinceArea > 0 ? sums.population / provinceArea : null
  const literacy = sums.above5 > 0 ? (sums.literate / sums.above5) * 100 : null
  const avgHousehold = sums.households > 0 ? sums.population / sums.households : null
  const sexTotal = sums.male + sums.female
  const sexRatio = sums.female > 0 ? (sums.male / sums.female) * 100 : null

  const ageMap = new Map<string, { male: number; female: number }>()
  for (const profile of Object.values(profiles)) {
    for (const band of profile.ageBands) {
      const current = ageMap.get(band.band) ?? { male: 0, female: 0 }
      current.male += band.male
      current.female += band.female
      ageMap.set(band.band, current)
    }
  }
  const ageBands = [...ageMap.entries()]
    .map(([band, value]) => ({ band, ...value }))
    .sort((a, b) => (parseInt(a.band, 10) || 0) - (parseInt(b.band, 10) || 0))
  const ageMax = ageBands.reduce((max, band) => Math.max(max, band.male + band.female), 0)

  const mostPopulous = [...rows]
    .filter(row => row.population != null)
    .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))[0]
  const largest = [...rows]
    .filter(row => row.areaSqKm != null)
    .sort((a, b) => (b.areaSqKm ?? 0) - (a.areaSqKm ?? 0))[0]
  const mostLiterate = [...rows]
    .filter(row => row.literacy != null)
    .sort((a, b) => (b.literacy ?? 0) - (a.literacy ?? 0))[0]
  const mostUnits = [...rows].sort((a, b) => b.units - a.units)[0]

  const highlights = [
    mostPopulous && { label: 'Most populous district', value: mostPopulous.name, note: `${nf.format(mostPopulous.population ?? 0)} people`, href: `/districts/${mostPopulous.slug}` },
    largest && { label: 'Largest district', value: largest.name, note: `${nf.format(Math.round(largest.areaSqKm ?? 0))} km²`, href: `/districts/${largest.slug}` },
    mostLiterate && { label: 'Highest literacy', value: mostLiterate.name, note: `${(mostLiterate.literacy ?? 0).toFixed(1)}%`, href: `/districts/${mostLiterate.slug}` },
    mostUnits && { label: 'Most local units', value: mostUnits.name, note: `${mostUnits.units} units`, href: `/districts/${mostUnits.slug}` },
  ].filter((item): item is { label: string; value: string; note: string; href: string } => Boolean(item))

  const bipadByKey = new Map(
    bipad
      .filter(d => d.province === province.name)
      .map(d => [canonDistrictKey(d.name), d]),
  )
  const mapDistricts = rows.flatMap(row => {
    const geo = bipadByKey.get(canonDistrictKey(row.name))
    const local = areas?.districts[row.slug]
    const lat = geo?.lat ?? local?.lat
    const lon = geo?.lon ?? local?.lon
    return lat != null && lon != null
      ? [{ name: row.name, lat, lon, population: row.population }]
      : []
  })

  const condition = wmoText(weather?.weather_code)
  const pmBand = pm25Band(pm)
  const unitTotal = Math.max(1, units.length)
  const provincePcode = provinceAreaRow?.pcode
  const nearbyFiltered = nearby.filter(place => place.title.toLowerCase() !== (info?.capital ?? '').toLowerCase())
  const hasAttractions = attractions.length > 0
  const placeCards = hasAttractions
    ? attractions.map(place => ({
      title: place.title,
      extract: place.extract,
      image: place.image,
      url: place.url,
      note: `${place.sitelinks} Wikipedia editions`,
    }))
    : nearbyFiltered.map(place => ({
      title: place.title,
      extract: place.extract,
      image: place.image,
      url: place.url,
      note: `${place.distanceKm} km from ${info?.capital ?? 'the capital'}`,
    }))

  return (
    <main className="content-wrap">
      <nav className="place-crumbs" aria-label="Breadcrumb">
        <Link href="/places"><ArrowLeft size={13} /> All places</Link>
        <span>/</span>
        <strong>{province.name}</strong>
      </nav>

      <section className="place-hero">
        <div className="place-hero-copy">
          <p className="eyebrow">{info?.region ?? 'Nepal'} · Province</p>
          <h1>{province.name}</h1>
          {provinceAreaRow?.nameNe && <p className="place-ne">{provinceAreaRow?.nameNe}</p>}
          <p className="lede">
            {wiki?.extract
              ? wiki.extract.split('. ').slice(0, 2).join('. ') + (wiki.extract.split('. ').length > 2 ? '.' : '')
              : `Census, districts, local government, geography and weather for ${province.name} Province.`}
          </p>
          <div className="place-hero-tags">
            {info && <span className="place-tag"><MapPin size={12} /> {info.capital} · capital</span>}
            <span className="place-tag">{provinceDistricts.length} districts</span>
            <span className="place-tag">{units.length} local units</span>
            {provinceArea > 0 && <span className="place-tag">{nf.format(Math.round(provinceArea))} km²</span>}
            {provincePcode && <span className="place-tag">{provincePcode}</span>}
            {sums.year && <span className="place-tag">Census {sums.year}</span>}
          </div>
        </div>
        {wiki?.image && (
          <figure className="place-hero-media">
            <img src={wiki.image} alt={province.name} loading="lazy" />
            <figcaption>Photo: Wikimedia Commons</figcaption>
          </figure>
        )}
      </section>

      <section className="place-stats province-facts">
        <Stat icon={<Users size={15} />} label="Population" value={sums.population ? nf.format(sums.population) : '—'} note={sums.year ? `Census ${sums.year}` : 'Summed from districts'} />
        <Stat icon={<Home size={15} />} label="Households" value={sums.households ? nf.format(sums.households) : '—'} note={avgHousehold ? `${avgHousehold.toFixed(1)} people / home` : ''} />
        <Stat icon={<GraduationCap size={15} />} label="Literacy" value={literacy != null ? `${literacy.toFixed(1)}%` : '—'} note="age 5+" />
        <Stat icon={<Mountain size={15} />} label="Area" value={provinceArea > 0 ? `${nf.format(Math.round(provinceArea))} km²` : '—'} note={`${provinceDistricts.length} districts`} />
        <Stat icon={<MapPin size={15} />} label="Density" value={density != null ? `${nf.format(Math.round(density))}/km²` : '—'} note={sexRatio != null ? `${sexRatio.toFixed(0)} males per 100 females` : ''} />
        <Stat icon={<Building2 size={15} />} label="Local units" value={nf.format(units.length)} note={`${kindCounts.find(k => k.kind === 'metropolitan')?.count ?? 0} metropolitan`} />
      </section>

      {highlights.length > 0 && (
        <section className="province-highlights" aria-label="Province highlights">
          {highlights.map(item => (
            <Link key={item.label} href={item.href} className="panel province-highlight">
              <span className="eyebrow">{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.note} <ArrowRight size={11} /></small>
            </Link>
          ))}
        </section>
      )}

      <div className="place-two">
        <section className="panel place-about">
          <div className="panel-head"><h3><BookOpen size={16} /> About {province.name}</h3></div>
          {wiki ? (
            <>
              <p className="place-body">{wiki.extract}</p>
              <a href={wiki.url} target="_blank" rel="noreferrer" className="text-button">Read on Wikipedia <ExternalLink size={13} /></a>
            </>
          ) : (
            <p className="muted">{loading ? 'Loading summary…' : 'No Wikipedia summary available for this province.'}</p>
          )}
        </section>

        <section className="panel place-weather">
          <div className="panel-head">
            <h3><Cloud size={16} /> Capital weather</h3>
            {info && <span className="muted">{info.capital}</span>}
          </div>
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
                  {daily.map((day, index) => (
                    <div key={day.date} className="forecast-day">
                      <span>{index === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                      <WeatherIcon kind={skyKind(wmoText(day.code))} size={26} />
                      <b>{day.max != null ? `${Math.round(day.max)}°` : '—'}</b>
                      <small>{day.min != null ? `${Math.round(day.min)}°` : '—'}</small>
                      {day.rainChance != null && <small>{day.rainChance}% rain</small>}
                    </div>
                  ))}
                </div>
              )}
              {climate && (
                <div className="climate-strip">
                  <div><span>12-month mean</span><strong>{climate.meanTemp != null ? `${climate.meanTemp.toFixed(1)}°C` : '—'}</strong></div>
                  <div><span>12-month rainfall</span><strong>{climate.totalPrecip != null ? `${nf.format(Math.round(climate.totalPrecip))} mm` : '—'}</strong></div>
                  <div><span>Rain days</span><strong>{climate.rainDays != null ? climate.rainDays : '—'}</strong></div>
                </div>
              )}
            </>
          ) : (
            <p className="muted">{loading ? 'Loading weather…' : 'Weather unavailable right now.'}</p>
          )}
        </section>
      </div>

      {(sexTotal > 0 || ageBands.length > 0) && (
        <div className="province-census-grid">
          {sexTotal > 0 && (
            <section className="panel place-sex">
              <div className="panel-head"><h3>Population split</h3><span className="muted">Census {sums.year}</span></div>
              <div className="sex-bar">
                <span style={{ width: `${(sums.male / sexTotal) * 100}%` }} className="sex-male" />
                <span style={{ width: `${(sums.female / sexTotal) * 100}%` }} className="sex-female" />
              </div>
              <div className="sex-legend">
                <span><i className="dot sex-male" /> Male {nf.format(sums.male)} ({(sums.male / sexTotal * 100).toFixed(1)}%)</span>
                <span><i className="dot sex-female" /> Female {nf.format(sums.female)} ({(sums.female / sexTotal * 100).toFixed(1)}%)</span>
              </div>
            </section>
          )}

          {ageBands.length > 0 && ageMax > 0 && (
            <section className="panel place-age">
              <div className="panel-head"><h3>Age structure</h3><span className="muted">Census {sums.year}</span></div>
              <div className="age-bars">
                {ageBands.map(band => (
                  <div key={band.band} className="age-row">
                    <span className="age-label">{band.band}</span>
                    <div className="age-track">
                      <span className="age-male" style={{ width: `${(band.male / ageMax) * 100}%` }} />
                      <span className="age-female" style={{ width: `${(band.female / ageMax) * 100}%` }} />
                    </div>
                    <span className="age-val">{nf.format(band.male + band.female)}</span>
                  </div>
                ))}
              </div>
              <div className="sex-legend">
                <span><i className="dot sex-male" /> Male</span>
                <span><i className="dot sex-female" /> Female</span>
              </div>
            </section>
          )}
        </div>
      )}

      <div className="province-map-grid">
        <section>
          <div className="panel-head province-section-head">
            <h3><MapPin size={16} /> Province map</h3>
            <span className="muted">District centres, capital and popular places</span>
          </div>
          <div className="place-map-box province-map-box">
            {info && (
              <ProvinceMap
                geoSlug={info.geoSlug}
                capital={{ name: info.capital, lat: info.lat, lon: info.lon }}
                districts={mapDistricts}
                attractions={attractions}
              />
            )}
          </div>
          <div className="province-map-legend">
            {info && <span><i className="map-dot is-capital" /> {info.capital} capital</span>}
            <span><i className="map-dot is-district" /> District centre</span>
            {hasAttractions && <span><i className="map-dot is-attraction" /> Popular place</span>}
          </div>
        </section>

        <section className="panel province-admin">
          <div className="panel-head"><h3><Building2 size={16} /> Administration</h3></div>
          <dl className="province-admin-list">
            <div><dt>Capital</dt><dd>{info?.capital ?? '—'}</dd></div>
            <div><dt>Districts</dt><dd>{provinceDistricts.length}</dd></div>
            <div><dt>Local units</dt><dd>{units.length}</dd></div>
            <div><dt>OCHA code</dt><dd>{provincePcode ?? '—'}</dd></div>
          </dl>
          <div
            className="province-kind-bar"
            role="img"
            aria-label={`Local unit mix: ${kindCounts.map(kind => `${kind.count} ${KIND_LABEL[kind.kind]}`).join(', ')}`}
          >
            {kindCounts.filter(kind => kind.count > 0).map(kind => (
              <span
                key={kind.kind}
                style={{ width: `${(kind.count / unitTotal) * 100}%`, background: KIND_COLOR[kind.kind] }}
                title={`${kind.count} ${KIND_LABEL[kind.kind]}`}
              />
            ))}
          </div>
          <div className="province-kind-legend">
            {kindCounts.map(kind => (
              <span key={kind.kind}>
                <i style={{ background: KIND_COLOR[kind.kind] }} />
                {KIND_LABEL[kind.kind]} {kind.count}
              </span>
            ))}
          </div>
          {metroUnits.length > 0 && (
            <>
              <p className="province-admin-label">Metropolitan &amp; sub-metropolitan</p>
              <div className="province-unit-chips">
                {metroUnits.map(unit => {
                  const district = provinceDistricts.find(d => d.name === unit.district)
                  return district ? (
                    <Link key={unit.slug} href={`/districts/${district.slug}/${unit.slug}`} className="province-unit-chip">
                      {unit.name}
                      <ArrowRight size={10} />
                    </Link>
                  ) : null
                })}
              </div>
            </>
          )}
        </section>
      </div>

      <section className="province-districts-section">
        <div className="section-heading province-section-head">
          <h2>Districts in {province.name}</h2>
          <span className="muted">{provinceDistricts.length} districts · click a district for its full profile</span>
        </div>
        <TableShell minWidth={780}>
          <table className="data-table">
            <thead>
              <tr>
                <SortableTh label="District" column="name" sort={sort} onSort={toggleSort} align="left" />
                <SortableTh label="Population" column="population" sort={sort} onSort={toggleSort} />
                <SortableTh label="Households" column="households" sort={sort} onSort={toggleSort} />
                <SortableTh label="Literacy" column="literacy" sort={sort} onSort={toggleSort} />
                <SortableTh label="Area" column="area" sort={sort} onSort={toggleSort} />
                <SortableTh label="Density" column="density" sort={sort} onSort={toggleSort} />
                <SortableTh label="Local units" column="units" sort={sort} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map(row => (
                <tr key={row.slug}>
                  <td className="is-left">
                    <Link href={`/districts/${row.slug}`} className="province-district-link">
                      {row.name}
                      <ArrowRight size={11} />
                    </Link>
                  </td>
                  <td>{row.population != null ? nf.format(row.population) : censusLoading ? '…' : '—'}</td>
                  <td>{row.households != null ? nf.format(row.households) : censusLoading ? '…' : '—'}</td>
                  <td>{row.literacy != null ? `${row.literacy.toFixed(1)}%` : censusLoading ? '…' : '—'}</td>
                  <td>{row.areaSqKm != null ? nf.format(Math.round(row.areaSqKm)) : '—'}</td>
                  <td>{row.density != null ? nf.format(Math.round(row.density)) : '—'}</td>
                  <td>{row.units}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="is-left">Province total</td>
                <td>{sums.population ? nf.format(sums.population) : '—'}</td>
                <td>{sums.households ? nf.format(sums.households) : '—'}</td>
                <td>{literacy != null ? `${literacy.toFixed(1)}%` : '—'}</td>
                <td>{provinceArea > 0 ? nf.format(Math.round(provinceArea)) : '—'}</td>
                <td>{density != null ? nf.format(Math.round(density)) : '—'}</td>
                <td>{units.length}</td>
              </tr>
            </tfoot>
          </table>
        </TableShell>
        <p className="province-table-note">
          Population, households and literacy are summed from the newest palika census rows for each district.
          Area is the DataNepal / OCHA COD boundary figure.
        </p>
      </section>

      <details className="panel province-unit-browser">
        <summary>
          <span><Building2 size={15} /> All {units.length} local units</span>
          <small>Grouped by type · each opens the local unit inside its district</small>
          <ChevronDown size={15} className="province-unit-chevron" />
        </summary>
        {groupedUnits.map(group => (
          <div key={group.kind} className="palika-group">
            <p className="palika-group-title">{KIND_LABEL[group.kind]} <span>({group.items.length})</span></p>
            <div className="palika-grid">
              {group.items.map(unit => {
                const district = provinceDistricts.find(d => d.name === unit.district)
                return district ? (
                  <Link key={`${unit.district}-${unit.slug}`} href={`/districts/${district.slug}/${unit.slug}`} className="palika-card">
                    <strong>{unit.name}</strong>
                    <span>{unit.district}</span>
                    <ArrowRight size={13} />
                  </Link>
                ) : null
              })}
            </div>
          </div>
        ))}
      </details>

      {placeCards.length > 0 && info && (
        <section className="place-nearby">
          <div className="section-heading province-section-head">
            <h2>{hasAttractions ? `Popular places in ${province.name}` : `Around ${info.capital}`}</h2>
            <span className="muted">
              {hasAttractions
                ? 'Ranked by Wikipedia language editions · marked on the map'
                : 'Landmarks within ~10 km of the provincial capital'}
            </span>
          </div>
          <div className="nearby-grid">
            {placeCards.map(place => (
              <a key={place.title} href={place.url} target="_blank" rel="noreferrer" className="nearby-card">
                {place.image && <img src={place.image} alt={place.title} loading="lazy" />}
                <div>
                  <strong>{place.title}</strong>
                  <span className="nearby-dist">{place.note}</span>
                  {place.extract && <p>{excerpt(place.extract)}</p>}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      <p className="place-sources">
        Sources: NSO Census 2021 via BIPAD / NDRRMA · administrative areas, Nepali names and OCHA codes via DataNepal / OCHA COD ·
        weather, air quality and rolling 12-month climate via Open-Meteo · text and images via Wikipedia / Wikimedia Commons ·
        popular places ranked from Wikidata sitelinks · provincial capitals from the national map layer.
      </p>
    </main>
  )
}

function excerpt(value: string): string {
  const text = value.trim()
  return text.length > 180 ? `${text.slice(0, 177)}…` : text
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

