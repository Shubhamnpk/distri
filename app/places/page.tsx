'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, MapPin, Search } from 'lucide-react'
import { DISTRICTS, LOCAL_UNITS, PROVINCES } from '@/lib/geo-constants'
import { fetchPlaceAreas, type PlaceAreas } from '@/lib/places'
import { PROVINCE_INFO } from '@/lib/province-info'

const nf = new Intl.NumberFormat('en-IN')

export default function PlacesPage() {
  const [areas, setAreas] = useState<PlaceAreas>({ provinces: {}, districts: {}, palikas: {} })
  const [query, setQuery] = useState('')
  const [province, setProvince] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchPlaceAreas().then(a => { if (!cancelled) setAreas(a) }).catch(() => {})
    const params = new URLSearchParams(window.location.search)
    const requestedProvince = params.get('province')
    if (requestedProvince && PROVINCES.some(p => p.name === requestedProvince)) setProvince(requestedProvince)
    const requestedQuery = params.get('q')
    if (requestedQuery) setQuery(requestedQuery)
    return () => { cancelled = true }
  }, [])

  const palikaCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const u of LOCAL_UNITS) m.set(u.district, (m.get(u.district) ?? 0) + 1)
    return m
  }, [])

  const provinceUnitCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const u of LOCAL_UNITS) m.set(u.province, (m.get(u.province) ?? 0) + 1)
    return m
  }, [])

  const q = query.trim().toLowerCase()

  const provinceResults = useMemo(() => {
    return PROVINCES.filter(p => {
      if (province && p.name !== province) return false
      if (!q) return true
      const area = areas.provinces[p.slug]
      const info = PROVINCE_INFO[p.name]
      return p.name.toLowerCase().includes(q)
        || (area?.nameNe ?? '').toLowerCase().includes(q)
        || (info?.capital ?? '').toLowerCase().includes(q)
        || (info?.capitalNe ?? '').toLowerCase().includes(q)
        || (info?.region ?? '').toLowerCase().includes(q)
        || (area?.pcode ?? '').toLowerCase().includes(q)
    })
  }, [areas, province, q])

  const matchedProvinceNames = useMemo(
    () => new Set(provinceResults.map(p => p.name)),
    [provinceResults],
  )

  const districtResults = useMemo(() => {
    return DISTRICTS.filter(d => {
      if (province && d.province !== province) return false
      if (!q) return true
      const ne = areas.districts[d.slug]?.nameNe ?? ''
      if (d.name.toLowerCase().includes(q) || d.province.toLowerCase().includes(q) || ne.toLowerCase().includes(q)) {
        return true
      }
      return q !== '' && matchedProvinceNames.has(d.province)
    })
  }, [areas, matchedProvinceNames, province, q])

  const noResults = provinceResults.length === 0 && districtResults.length === 0

  return (
    <main className="content-wrap">
      <section className="districts-hero">
        <p className="eyebrow">Explore Nepal</p>
        <h1>Provinces, districts &amp; local units</h1>
        <p className="lede">
          The whole administrative map in one place: seven provinces, 77 districts and every local unit inside them.
          Search by name or capital, filter to a province, then open any profile for census, weather, maps and places to visit.
        </p>
        <div className="districts-stats">
          <span><strong>{PROVINCES.length}</strong> provinces</span>
          <span><strong>{DISTRICTS.length}</strong> districts</span>
          <span><strong>{LOCAL_UNITS.length}</strong> local units</span>
        </div>
      </section>

      <div className="districts-toolbar">
        <label className="search districts-search">
          <Search size={16} />
          <input
            aria-label="Search places"
            placeholder="Search a province, district, capital or Nepali name"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </label>
        <div className="districts-chips">
          <button type="button" className={!province ? 'is-active' : ''} onClick={() => setProvince(null)}>All</button>
          {PROVINCES.map(p => (
            <button key={p.slug} type="button" className={province === p.name ? 'is-active' : ''} onClick={() => setProvince(p.name)}>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {noResults ? (
        <p className="muted" style={{ padding: '2rem 0' }}>No province or district matches “{query}”.</p>
      ) : (
        <>
          {provinceResults.length > 0 && (
            <section className="places-section" id="provinces">
              <div className="places-section-head">
                <h2>Provinces</h2>
                <span>{provinceResults.length} of {PROVINCES.length}</span>
              </div>
              <div className="districts-grid">
                {provinceResults.map(p => {
                  const area = areas.provinces[p.slug]
                  const info = PROVINCE_INFO[p.name]
                  const districts = DISTRICTS.filter(d => d.province === p.name)
                  const areaSqKm = area?.areaSqKm
                    ?? districts.reduce((sum, d) => sum + (areas.districts[d.slug]?.areaSqKm ?? 0), 0)
                  return (
                    <Link key={p.slug} href={`/provinces/${p.slug}`} className="district-card is-province">
                      <span className="district-card-prov">Province</span>
                      <strong>{p.name}</strong>
                      <span className="district-card-ne">{area?.nameNe ?? ''}</span>
                      <span className="district-card-meta">
                        {info?.capital ?? 'Nepal'} · {districts.length} districts · {provinceUnitCount.get(p.name) ?? 0} local units
                      </span>
                      <span className="district-card-meta">
                        {areaSqKm > 0 ? `${nf.format(Math.round(areaSqKm))} km²` : 'Area -'} · {area?.pcode ?? 'No code'}
                      </span>
                      <span className="district-card-go"><MapPin size={13} /> Province profile <ArrowRight size={13} /></span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {districtResults.length > 0 && (
            <section className="places-section" id="districts">
              <div className="places-section-head">
                <h2>Districts</h2>
                <span>{districtResults.length} of {DISTRICTS.length}</span>
              </div>
              <div className="districts-grid">
                {districtResults.map(d => {
                  const area = areas.districts[d.slug]?.areaSqKm
                  return (
                    <Link key={d.slug} href={`/districts/${d.slug}`} className="district-card">
                      <span className="district-card-prov">{d.province}</span>
                      <strong>{d.name}</strong>
                      <span className="district-card-ne">{areas.districts[d.slug]?.nameNe ?? ''}</span>
                      <span className="district-card-meta">
                        {area != null ? `${nf.format(Math.round(area))} km²` : 'Area -'}
                        <span aria-hidden> · </span>
                        {palikaCount.get(d.name) ?? 0} local units
                      </span>
                      <span className="district-card-go"><MapPin size={13} /> Explore <ArrowRight size={13} /></span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}
