'use client'

import { useEffect, useState } from 'react'
import { MapPin, ExternalLink, Users, AlertTriangle } from 'lucide-react'
import { fetchProjectNepalDistricts, fetchProjectNepalProvinces, slugifyDistrict } from '@/lib/project-nepal'
import type { ProjectNepalDistrict } from '@/lib/types'

export function CommunityOverview() {
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [districts, provinces] = await Promise.all([fetchProjectNepalDistricts(), fetchProjectNepalProvinces()])
        if (!cancelled) setCount(districts.length)
      } catch {
        if (!cancelled) setCount(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '.7rem .9rem', fontSize: '.72rem' }} className="bg-sunken border border-line-light rounded-[10px] text-tertiary">
        Loading community index…
      </div>
    )
  }
  if (count === null) return null

  return (
    <div style={{ padding: '.85rem .95rem', display: 'flex', flexDirection: 'column', gap: '.5rem', marginTop: '.75rem' }} className="bg-card border border-line-light rounded-lg shadow-sm">
      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
        <span style={{ width: 26, height: 26, borderRadius: 7, background: '#fef3c7', color: '#b45309', display: 'grid', placeItems: 'center' }}><Users size={13} /></span>
        <strong style={{ fontSize: '.78rem' }}>Community tracker: Project-Nepal</strong>
        <span style={{ marginLeft: 'auto', fontSize: '.64rem' }} className="text-tertiary">EverestValley / GitHub</span>
      </div>
      <p style={{ margin: 0, fontSize: '.72rem', lineHeight: 1.5 }} className="text-secondary">
        {count} districts across 7 provinces, indexed from open community reports. Use alongside NPP audit data for ground-level cross-checks: problems, achievements, and budgets per district.
      </p>
      <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
        <a href="https://github.com/EverestValley/project-nepal" target="_blank" rel="noreferrer" style={{ fontSize: '.68rem', fontWeight: 600, padding: '.3rem .55rem', display: 'inline-flex', alignItems: 'center', gap: '.25rem' }} className="text-primary bg-primary-50 rounded-[6px]">
          Explore <ExternalLink size={11} />
        </a>
        <span style={{ fontSize: '.64rem', alignSelf: 'center' }} className="text-tertiary">revalidate 24h</span>
      </div>
    </div>
  )
}

export function ProjectCommunityContext({ location }: { location: string }) {
  const [district, setDistrict] = useState<ProjectNepalDistrict | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const districts = await fetchProjectNepalDistricts()
        // location string like "Khokana (Lalitpur) → Nijgadh (Bara)" - extract first district name token that matches known district
        const locLow = location.toLowerCase()
        const hit = districts.find(d => locLow.includes(d.name.toLowerCase()))
        if (!cancelled) setDistrict(hit ?? null)
      } catch {
        if (!cancelled) setDistrict(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [location])

  if (loading) {
    return (
      <div style={{ padding: '1rem' }} className="bg-sunken border border-line-light rounded-lg">
        <span style={{ fontSize: '.72rem' }} className="text-tertiary">Finding community context…</span>
      </div>
    )
  }

  if (!district) {
    return (
      <div style={{ padding: '1rem' }} className="bg-sunken border border-line-light rounded-lg">
        <strong style={{ display: 'block', fontSize: '.78rem' }}>Community context</strong>
        <p style={{ margin: '.3rem 0 0', fontSize: '.72rem', lineHeight: 1.5 }} className="text-secondary">
          Could not map “{location}” to a Project-Nepal district. Browse the full hierarchy to explore local problems &amp; achievements.
        </p>
        <a href="https://github.com/EverestValley/project-nepal/tree/main/data/content" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', marginTop: '.5rem', fontSize: '.68rem', fontWeight: 600 }} className="text-primary">
          Browse districts <ExternalLink size={12} />
        </a>
      </div>
    )
  }

  const districtSlug = `${String(district.id).padStart(2, '0')}-${slugifyDistrict(district.name)}`
  const provinceSlug = district.province_id === 1 ? '1-koshi-pradesh' : district.province_id === 2 ? '2-madhesh-pradesh' : district.province_id === 3 ? '3-bagmati-pradesh' : district.province_id === 4 ? '4-gandaki-pradesh' : district.province_id === 5 ? '5-lumbini-pradesh' : district.province_id === 6 ? '6-karnali-pradesh' : '7-sudurpashchim-pradesh'

  return (
    <div style={{ padding: '1rem' }} className="bg-card border border-line-light rounded-lg shadow-sm">
      <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', marginBottom: '.5rem' }}>
        <span style={{ width: 28, height: 28, borderRadius: 7, background: '#fef3c7', color: '#b45309', display: 'grid', placeItems: 'center' }}><MapPin size={13} /></span>
        <strong style={{ fontSize: '.78rem' }}>Community district: {district.name}</strong>
        <span style={{ marginLeft: 'auto', fontSize: '.62rem', padding: '.15rem .4rem' }} className="text-tertiary bg-sunken rounded-[20px]">Project-Nepal</span>
      </div>
      <p style={{ margin: 0, fontSize: '.72rem', lineHeight: 1.5 }} className="text-secondary">
        Matched “{location}” → <strong>{district.name}</strong> ({district.nepali_name}) in {provinceSlug.replace(/^[^-]+-/, '').replace(/-/g, ' ')}. Check problems, achievements, and budgets reported by the community for cross-verification.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4rem', marginTop: '.65rem' }}>
        <a href={`https://github.com/EverestValley/project-nepal/tree/main/data/content/${provinceSlug}/districts/${districtSlug}/problems`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.68rem', fontWeight: 600, padding: '.4rem .55rem' }} className="bg-danger-light text-danger rounded-[7px]">
          <AlertTriangle size={12} /> Problems <ExternalLink size={11} style={{ marginLeft: 'auto' }} />
        </a>
        <a href={`https://github.com/EverestValley/project-nepal/tree/main/data/content/${provinceSlug}/districts/${districtSlug}/achievements`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.68rem', fontWeight: 600, padding: '.4rem .55rem' }} className="bg-primary-50 text-primary rounded-[7px]">
          <Users size={12} /> Achievements <ExternalLink size={11} style={{ marginLeft: 'auto' }} />
        </a>
      </div>
      <a href={`https://github.com/EverestValley/project-nepal/tree/main/data/content/${provinceSlug}/districts/${districtSlug}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', marginTop: '.6rem', fontSize: '.68rem', fontWeight: 600 }} className="text-primary">
        Open district folder <ExternalLink size={12} />
      </a>
    </div>
  )
}
