'use client'

import { WeatherIcon, skyLucide } from '@/components/weather-icon'
import { SKY_META, type SkyKind } from '@/lib/condition'
import { skyMarkerSvg } from '@/lib/sky-svg'

const KINDS: SkyKind[] = ['clear', 'partly', 'cloudy', 'rain', 'storm', 'fog', 'snow', 'wind']

/** TEMPORARY design-QA gallery — delete once icons are approved. */
export default function IconsPage() {
  return (
    <div className="content-wrap">
      <p className="eyebrow">DESIGN QA · TEMPORARY</p>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', margin: '.2rem 0 1rem' }}>Sky icon audit</h1>
      <section className="panel" style={{ marginBottom: '.75rem' }}>
        <h2 style={{ fontSize: '.9rem', margin: '0 0 .6rem' }}>Big animated icons (heroes, day rows)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '.6rem' }}>
          {KINDS.flatMap(k => [
            { k, night: false, label: `${k} · day` },
            { k, night: true, label: `${k} · night` },
          ]).map(({ k, night, label }) => (
            <div key={label} style={{ padding: '.7rem', textAlign: 'center', background: night ? '#141b34' : 'var(--bg-sunken)', color: night ? '#fff' : undefined }} className="rounded-[10px]">
              <WeatherIcon kind={k} size={72} night={night} />
              <strong style={{ display: 'block', fontSize: '.7rem', marginTop: '.3rem' }}>{label}</strong>
              <span style={{ fontSize: '.6rem', opacity: .7 }}>{SKY_META[k].label}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="panel" style={{ marginBottom: '.75rem' }}>
        <h2 style={{ fontSize: '.9rem', margin: '0 0 .6rem' }}>Map pins (26px SVG)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '.6rem' }}>
          {KINDS.flatMap(k => [
            { k, night: false, label: `${k} · day` },
            { k, night: true, label: `${k} · night` },
          ]).map(({ k, night, label }) => (
            <div key={label} style={{ padding: '.7rem', textAlign: 'center', background: night ? '#141b34' : 'var(--bg-sunken)', color: night ? '#fff' : undefined }} className="rounded-[10px]">
              <span dangerouslySetInnerHTML={{ __html: skyMarkerSvg(k, night) }} style={{ display: 'inline-block' }} />
              <strong style={{ display: 'block', fontSize: '.66rem', marginTop: '.3rem' }}>{label}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2 style={{ fontSize: '.9rem', margin: '0 0 .6rem' }}>Compact lucide (city cards)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '.6rem' }}>
          {KINDS.flatMap(k => [
            { k, night: false, label: `${k} · day` },
            { k, night: true, label: `${k} · night` },
          ]).map(({ k, night, label }) => {
            const Icon = skyLucide(k, night)
            return (
              <div key={label} style={{ padding: '.7rem', textAlign: 'center' }} className="bg-sunken rounded-[10px]">
                <Icon size={22} />
                <strong style={{ display: 'block', fontSize: '.66rem', marginTop: '.3rem' }}>{label}</strong>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
