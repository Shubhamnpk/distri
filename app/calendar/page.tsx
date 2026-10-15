'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CalendarDays, Heart } from 'lucide-react'
import NepaliDate from 'nepali-date-converter'
import {
  bsToday, bsMonthGrid, bsMonthAdRange, nextFiscalMilestones,
  BS_MONTHS_EN, BS_MONTHS_NE, BS_WEEKDAYS_SHORT,
} from '@/lib/calendar'
import { yearHolidays, type DayHoliday } from '@/lib/holidays'
import { fetchUpcomingIpos } from '@/lib/nepse'
import { parseIpoEvents, bsToAd, daysUntil } from '@/lib/ipo-events'

type CalKind = 'festival' | 'holiday' | 'fiscal' | 'ipo_open' | 'ipo_close'

type CalEvent = {
  key: string
  date: Date
  kind: CalKind
  title: string
  sub: string
  tranche?: string
}

const KIND = {
  festival: { dot: '#f59e0b', label: 'Festival' },
  holiday: { dot: '#dc2626', label: 'Public holiday' },
  fiscal: { dot: '#8b5cf6', label: 'Fiscal' },
  ipo_open: { dot: '#0ea5e9', label: 'IPO opens' },
  ipo_close: { dot: '#f43f5e', label: 'IPO closes' },
} as const

const adKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

function bsToAdDate(y: number, m: number, d: number): Date | null {
  try {
    return new NepaliDate(y, m, d).toJsDate()
  } catch {
    return null
  }
}

function adToBsParts(ad: Date): { y: number; m: number } | null {
  try {
    const n = new NepaliDate(ad)
    return { y: n.getYear(), m: n.getMonth() }
  } catch {
    return null
  }
}

export default function CalendarPage() {
  const now = useMemo(() => new Date(), [])
  const bsNow = useMemo(() => bsToday(), [])
  const [view, setView] = useState<'ad' | 'bs'>('bs')
  const [adCursor, setAdCursor] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [bsCursor, setBsCursor] = useState({ y: bsNow.y, m: bsNow.m })
  const [selected, setSelected] = useState<Date>(now)
  const [panel, setPanel] = useState<'day' | 'upcoming'>('day')
  const [likes, setLikes] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('drishti-likes')
      const arr = raw ? JSON.parse(raw) : []
      return Array.isArray(arr) ? arr.filter(x => typeof x === 'string') : []
    } catch {
      return []
    }
  })

  const toggleLike = (id: string) => {
    setLikes(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      try {
        localStorage.setItem('drishti-likes', JSON.stringify(next))
      } catch {
        // private mode — likes last for the session
      }
      return next
    })
  }
  const [ipoRaw, setIpoRaw] = useState<Awaited<ReturnType<typeof fetchUpcomingIpos>>>([])

  // Gazette years are synchronous package data (currently only 2083 exists —
  // other years resolve to [] instead of guessing).
  const festivals = useMemo(() => {
    const years = new Set<number>([bsNow.y, bsCursor.y])
    if (view === 'ad') {
      const p0 = adToBsParts(new Date(adCursor.y, adCursor.m, 1))
      const p1 = adToBsParts(new Date(adCursor.y, adCursor.m + 1, 0))
      if (p0) years.add(p0.y)
      if (p1) years.add(p1.y)
    }
    return [...years].flatMap(y => yearHolidays(y))
  }, [view, adCursor, bsCursor, bsNow])

  useEffect(() => {
    let cancelled = false
    fetchUpcomingIpos().then(list => { if (!cancelled) setIpoRaw(list) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const milestones = useMemo(() => nextFiscalMilestones(6), [])

  const events = useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    const push = (date: Date | null, kind: CalKind, title: string, sub: string, tranche = '') => {
      if (!date) return
      const key = adKey(date)
      const list = map.get(key) ?? []
      list.push({ key: `${kind}-${title}-${tranche}-${key}`, date, kind, title, sub, tranche })
      map.set(key, list)
    }
    const order: Record<CalKind, number> = { holiday: 0, festival: 1, fiscal: 2, ipo_close: 3, ipo_open: 4 }
    for (const f of festivals) {
      const kind: CalKind = f.kind === 'public-holiday' ? 'holiday' : 'festival'
      const sub = f.kind === 'public-holiday'
        ? `Public holiday · ${f.scope}`
        : `Observance · ${f.scope}`
      push(f.ad, kind, f.nameEn, `${sub} · ${BS_MONTHS_EN[f.bsM]} ${f.bsD}, ${f.bsY} BS`)
    }
    for (const ms of milestones) {
      const ad = bsToAd(ms.bsY, ms.bsM, ms.bsD)
      push(ad, 'fiscal', ms.label, ms.detail)
    }
    for (const e of parseIpoEvents(ipoRaw)) {
      push(bsToAd(e.open.y, e.open.m, e.open.d), 'ipo_open', `${e.company} opens`, `${e.units} units`, e.tranche)
      push(bsToAd(e.close.y, e.close.m, e.close.d), 'ipo_close', `${e.company} closes`, `${e.units} units`, e.tranche)
    }
    for (const list of map.values()) list.sort((a, b) => (order[a.kind] ?? 99) - (order[b.kind] ?? 99))
    return map
  }, [festivals, milestones, ipoRaw])

  const eventsOf = (key: string) => events.get(key) ?? []
  const todayKey = adKey(now)
  const selectedKey = adKey(selected)
  const selectedEvents = eventsOf(selectedKey)

  type Ranged = { key: string; title: string; kind: CalKind; tranche: string; sub: string; start: Date; end: Date; days: number }

  const upcoming = useMemo(() => {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    // Group by identity first, so an interleaved different event mid-range
    // can never split one holiday into two cards.
    const groups = new Map<string, { title: string; kind: CalKind; tranche: string; dates: Date[] }>()
    for (const list of events.values()) for (const e of list) {
      if (e.date.getTime() < start) continue
      const gk = `${e.kind}|${e.title}|${e.tranche ?? ''}`
      if (!groups.has(gk)) groups.set(gk, { title: e.title, kind: e.kind, tranche: e.tranche ?? '', dates: [] })
      const g = groups.get(gk)!
      if (!g.dates.some(d => adKey(d) === adKey(e.date))) g.dates.push(e.date)
    }
    const out: Ranged[] = []
    for (const g of groups.values()) {
      g.dates.sort((a, b) => a.getTime() - b.getTime())
      let run: Date[] = []
      const flush = () => {
        if (!run.length) return
        const s = run[0]
        const e = run[run.length - 1]
        const bs = (d: Date) => {
          try {
            const n = new NepaliDate(d)
            return `${BS_MONTHS_EN[n.getMonth()]} ${n.getDate()}`
          } catch {
            return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          }
        }
        out.push({
          key: `${g.kind}-${g.title}-${g.tranche}-${adKey(s)}`,
          title: g.title,
          kind: g.kind,
          tranche: g.tranche,
          sub: run.length > 1 ? `${bs(s)} – ${bs(e)}` : bs(s),
          start: s,
          end: e,
          days: run.length,
        })
        run = []
      }
      for (const d of g.dates) {
        const prev = run[run.length - 1]
        const next = prev ? new Date(prev) : null
        if (next) next.setDate(next.getDate() + 1)
        if (prev && next && adKey(next) === adKey(d)) run.push(d)
        else {
          flush()
          run = [d]
        }
      }
      flush()
    }
    return out.sort((a, b) => a.start.getTime() - b.start.getTime()).slice(0, 6)
  }, [events, now])

  // BS cells (primary BS + secondary AD).
  const bsCells = useMemo(() => {
    const weeks = bsMonthGrid(bsCursor.y, bsCursor.m)
    return weeks.flat().map(d => {
      const inMonth = d.inMonth
      return {
        key: inMonth ? adKey(d.ad) : `x-${d.ad.getTime()}`,
        primary: d.bsD || d.ad.getDate(),
        secondary: inMonth ? d.ad.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null,
        inMonth,
        date: d.ad,
        weekend: d.weekend,
        nepseOpen: d.nepseOpen,
        isToday: d.isToday,
      }
    })
  }, [bsCursor])

  // AD cells (primary AD + secondary BS).
  const adCells = useMemo(() => {
    const first = new Date(adCursor.y, adCursor.m, 1)
    const startOffset = first.getDay()
    const daysInMonth = new Date(adCursor.y, adCursor.m + 1, 0).getDate()
    const total = Math.ceil((startOffset + daysInMonth) / 7) * 7
    const cells = []
    for (let i = 0; i < total; i++) {
      const date = new Date(adCursor.y, adCursor.m, 1 - startOffset + i)
      let secondary: string | null = null
      try {
        const n = new NepaliDate(date)
        secondary = `${n.getDate()} ${BS_MONTHS_EN[n.getMonth()].slice(0, 3)}`
      } catch {
        secondary = null
      }
      cells.push({
        key: adKey(date),
        primary: date.getDate(),
        secondary,
        inMonth: date.getMonth() === adCursor.m,
        date,
        weekend: date.getDay() === 6 || date.getDay() === 0,
        nepseOpen: date.getDay() >= 1 && date.getDay() <= 5,
        isToday: adKey(date) === todayKey,
      })
    }
    return cells
  }, [adCursor, todayKey])

  const cells = view === 'ad' ? adCells : bsCells
  const title = view === 'ad'
    ? new Date(adCursor.y, adCursor.m, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : `${BS_MONTHS_EN[bsCursor.m]} ${bsCursor.y}`
  const titleNe = view === 'bs' ? `${BS_MONTHS_NE[bsCursor.m]} ${bsCursor.y}` : null
  const sub = view === 'bs' ? bsMonthAdRange(bsCursor.y, bsCursor.m) : ''

  const step = (dir: 1 | -1) => {
    if (view === 'ad') {
      const d = new Date(adCursor.y, adCursor.m + dir, 1)
      setAdCursor({ y: d.getFullYear(), m: d.getMonth() })
    } else {
      const m = bsCursor.m + dir
      if (m < 0) setBsCursor({ y: bsCursor.y - 1, m: 11 })
      else if (m > 11) setBsCursor({ y: bsCursor.y + 1, m: 0 })
      else setBsCursor({ y: bsCursor.y, m })
    }
  }

  const goToday = () => {
    setAdCursor({ y: now.getFullYear(), m: now.getMonth() })
    setBsCursor({ y: bsNow.y, m: bsNow.m })
    setSelected(new Date())
  }

  const jumpToDate = (date: Date) => {
    setSelected(date)
    setPanel('day')
    setAdCursor({ y: date.getFullYear(), m: date.getMonth() })
    const p = adToBsParts(date)
    if (p) setBsCursor({ y: p.y, m: p.m })
  }

  return (
    <div className="content-wrap">
      {/* ── Hero ── */}
      <div className="eco-hero" style={{ background: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 60%, #0f0d2e 100%)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: '1.5rem', alignItems: 'center' }} className="cal-hero-grid">
          <div>
            <p style={{ fontSize: '.6rem', letterSpacing: '.16em', fontWeight: 700, opacity: .7, margin: 0 }}>BIKRAM SAMBAT · MARKET CALENDAR</p>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 500, letterSpacing: '-.04em', margin: '.3rem 0 .4rem', lineHeight: 1.05 }}>
              Days that move money.
            </h1>
            <p style={{ fontSize: '.82rem', opacity: .85, margin: 0, maxWidth: 480, lineHeight: 1.6 }}>
              Festivals, public holidays, fiscal turns and IPO windows — plotted on the Nepali month so nothing tradable sneaks past.
            </p>
            <div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(255,255,255,.14)', borderRadius: 20, padding: '.35rem .8rem', fontSize: '.68rem', fontWeight: 700 }}>
                Today · {BS_MONTHS_EN[bsNow.m]} {bsNow.d}, {bsNow.y} BS
              </span>
              <span style={{ background: 'rgba(255,255,255,.14)', borderRadius: 20, padding: '.35rem .8rem', fontSize: '.68rem', fontWeight: 700 }}>
                {upcoming.length} upcoming
              </span>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 14, padding: '.9rem 1rem' }}>
            <p style={{ margin: 0, fontSize: '.6rem', fontWeight: 700, letterSpacing: '.12em', opacity: .7 }}>UP NEXT</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.45rem', marginTop: '.55rem' }}>
              {upcoming.slice(0, 3).map(e => (
                <button
                  key={e.key}
                  onClick={() => jumpToDate(e.start)}
                  style={{ display: 'flex', alignItems: 'center', gap: '.55rem', cursor: 'pointer', textAlign: 'left', padding: '.45rem .55rem', borderRadius: 10, background: 'rgba(255,255,255,.07)' }}
                >
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: KIND[e.kind].dot, flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: '.74rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</strong>
                    <span style={{ fontSize: '.62rem', opacity: .7 }}>
                      {e.start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      {e.days > 1 ? ` – ${e.end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                    </span>
                  </span>
                </button>
              ))}
              {upcoming.length === 0 && (
                <p style={{ margin: 0, fontSize: '.72rem', opacity: .7 }}>A quiet stretch — nothing on the books.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '.5rem', marginBottom: '.9rem' }}>
        <div style={{ display: 'flex', padding: 3 }} className="bg-card border border-line-light rounded-[20px]">
          {(['ad', 'bs'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '.35rem .85rem', borderRadius: 16, fontSize: '.7rem', fontWeight: 700, cursor: 'pointer',
                background: view === v ? 'var(--primary)' : 'transparent',
                color: view === v ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {v === 'ad' ? 'AD' : 'BS (Nepali)'}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
          <button onClick={() => step(-1)} aria-label="Previous month" className="outline-button" style={{ padding: '.45rem .6rem' }}>
            <ArrowLeft size={15} />
          </button>
          <button onClick={goToday} aria-label="Jump to today" style={{ padding: '.45rem .9rem', fontSize: '.7rem', fontWeight: 800, borderRadius: 20, background: 'var(--primary)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '.3rem' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} /> Today
          </button>
          <button onClick={() => step(1)} aria-label="Next month" className="outline-button" style={{ padding: '.45rem .6rem' }}>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      <div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 500, margin: 0 }}>
          {title}
          {titleNe && <span style={{ marginLeft: '.5rem', fontSize: '.85rem', fontWeight: 400 }} className="text-tertiary">{titleNe}</span>}
        </h2>
        {sub && <p className="muted" style={{ margin: '.15rem 0 0', fontSize: '.7rem' }}>{sub}</p>}
      </div>

      <div style={{ display: 'grid', gap: '.75rem', marginTop: '.75rem', alignItems: 'start' }} className="cal-layout">
        <div style={{ minWidth: 0 }}>
          <div style={{ overflow: 'hidden' }} className="bg-card border border-line-light rounded-lg">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-light)' }} className="bg-sunken">
              {BS_WEEKDAYS_SHORT.map(d => (
                <p key={d} style={{ margin: 0, padding: '.45rem 0', textAlign: 'center', fontSize: '.6rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }} className={d === 'Sat' || d === 'Sun' ? 'text-danger' : 'text-tertiary'}>
                  {d}
                </p>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {cells.map(c => {
                const evs = eventsOf(c.key)
                const shown = evs.slice(0, 3)
                const extra = evs.length - shown.length
                const isSel = c.key === selectedKey
                const isToday = c.key === todayKey
                const isHoliday = c.weekend || evs.some(e => e.kind === 'holiday')
                return (
                  <button
                    key={c.key}
                    onClick={() => { setSelected(c.date); setPanel('day') }}
                    title={isHoliday ? 'Public holiday — offices closed' : undefined}
                    style={{
                      minHeight: 62, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 2,
                      padding: 4, textAlign: 'left', cursor: 'pointer',
                      borderBottom: '1px solid var(--border-light)', borderRight: '1px solid var(--border-light)',
                      background: isToday
                        ? 'var(--primary)'
                        : isSel
                          ? 'var(--primary-50)'
                          : isHoliday && c.inMonth
                            ? 'var(--danger-light)'
                            : c.inMonth ? 'transparent' : 'var(--bg-sunken)',
                      opacity: c.inMonth ? 1 : 0.5,
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{
                        width: 24, height: 24, display: 'grid', placeItems: 'center', borderRadius: '50%',
                        fontSize: '.72rem', fontWeight: 700,
                        background: isToday ? 'rgba(255,255,255,.25)' : 'transparent',
                        color: isToday ? '#fff' : isSel ? 'var(--primary)' : isHoliday && c.inMonth ? 'var(--danger)' : 'var(--text)',
                      }}>
                        {c.primary || ''}
                      </span>
                      {c.secondary && (
                        <span style={{ fontSize: '.6rem' }} className="text-tertiary cal-secondary">{c.secondary}</span>
                      )}
                    </span>
                    {shown.length > 0 && (
                      <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3, padding: '0 2px' }}>
                        {shown.map(e => (
                          <span key={e.key} title={`${e.title} · ${e.sub}`} style={{ width: 8, height: 8, borderRadius: '50%', background: KIND[e.kind].dot }} />
                        ))}
                        {extra > 0 && <span style={{ fontSize: '.6rem', fontWeight: 700 }} className="text-tertiary">+{extra}</span>}
                      </span>
                    )}
                    {isHoliday && c.inMonth && !isToday && (
                      <span style={{ fontSize: '.56rem', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', padding: '0 2px', color: 'var(--danger)' }}>
                        Holiday
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ marginTop: '.75rem', padding: '.9rem 1rem' }} className="bg-card border border-line-light rounded-lg">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.8rem' }}>
              <div>
                <p style={{ margin: 0, fontSize: '.68rem', fontWeight: 700 }}>Festivals & holidays</p>
                <p style={{ margin: '.3rem 0 0', fontSize: '.66rem', lineHeight: 1.6 }} className="text-secondary">
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#dc2626', marginRight: '.3rem' }} />
                  <strong>Public holiday</strong> — offices closed, official notice
                </p>
                <p style={{ margin: '.25rem 0 0', fontSize: '.66rem', lineHeight: 1.6 }} className="text-secondary">
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', marginRight: '.3rem' }} />
                  <strong>Festival</strong> — Dashain, Tihar, Teej and daily observances
                </p>
                <p style={{ margin: '.25rem 0 0', fontSize: '.66rem', lineHeight: 1.6 }} className="text-secondary">
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', marginRight: '.3rem' }} />
                  <strong>Sat–Sun weekend</strong> — weekly public holiday, market closed
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '.68rem', fontWeight: 700 }}>Money dates</p>
                <p style={{ margin: '.3rem 0 0', fontSize: '.66rem', lineHeight: 1.6 }} className="text-secondary">
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', marginRight: '.3rem' }} />
                  <strong>Fiscal</strong> — quarter ends, new year budgets
                </p>
                <p style={{ margin: '.25rem 0 0', fontSize: '.66rem', lineHeight: 1.6 }} className="text-secondary">
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#0ea5e9', marginRight: '.3rem' }} />
                  <strong>IPO opens</strong> · <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#f43f5e', marginRight: '.3rem' }} />
                  <strong>closes</strong> — subscription windows
                </p>
              </div>
            </div>
            <p style={{ margin: '.6rem 0 0', fontSize: '.6rem' }} className="text-tertiary">
                Tap any day for details · {view === 'ad' ? 'BS date under each AD day' : 'AD date under each BS day'} · Mon–Fri are NEPSE trading days
            </p>
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <div className="cal-panels">
            <section className="cal-panel-day" style={{ paddingBottom: '1rem' }}>
              <div style={{ padding: '.9rem 1rem', marginBottom: '.55rem', background: 'var(--primary)', color: '#fff' }} className="rounded-lg">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.5rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '.6rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', opacity: .75 }}>
                      {selected.toLocaleDateString('en-GB', { weekday: 'long' })}
                    </p>
                    <strong style={{ display: 'block', fontSize: '1.25rem', letterSpacing: '-.02em', marginTop: '.1rem' }}>
                      {(() => {
                        try {
                          const n = new NepaliDate(selected)
                          return `${BS_MONTHS_EN[n.getMonth()]} ${n.getDate()}, ${n.getYear()}`
                        } catch {
                          return ''
                        }
                      })()}
                    </strong>
                    <span style={{ display: 'block', fontSize: '.66rem', marginTop: '.15rem', opacity: .8 }}>
                      {selected.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} AD
                    </span>
                  </div>
                  <button
                    onClick={() => toggleLike(`day:${adKey(selected)}`)}
                    aria-label={likes.includes(`day:${adKey(selected)}`) ? 'Unmark day' : 'Mark day'}
                    title={likes.includes(`day:${adKey(selected)}`) ? 'Day marked' : 'Mark this day'}
                    style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', borderRadius: '50%', flexShrink: 0, background: likes.includes(`day:${adKey(selected)}`) ? '#fff' : 'rgba(255,255,255,.22)' }}
                  >
                    <Heart size={15} fill={likes.includes(`day:${adKey(selected)}`) ? 'var(--danger)' : 'none'} style={{ color: likes.includes(`day:${adKey(selected)}`) ? 'var(--danger)' : '#fff' }} />
                  </button>
                </div>
                <span style={{ display: 'inline-block', marginTop: '.5rem', fontSize: '.62rem', fontWeight: 700, padding: '.15rem .55rem', borderRadius: 12, background: 'rgba(255,255,255,.22)' }}>
                  {selected.getDay() === 6 || selected.getDay() === 0 ? 'Weekend · closed' : selectedEvents.some(e => e.kind === 'holiday') ? 'Public holiday' : 'Trading day · NEPSE open 11–3'}
                </span>
              </div>
              {selectedEvents.length === 0 ? (
                <p style={{ padding: '.9rem 1rem', fontSize: '.74rem' }} className="bg-card border border-line-light rounded-lg text-tertiary">
                  No events — a quiet day.
                </p>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '.45rem' }}>
                  {selectedEvents.map(e => {
                    const liked = likes.includes(e.key)
                    return (
                      <li
                        key={e.key}
                        style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.6rem .7rem .6rem .55rem', borderLeft: `3px solid ${KIND[e.kind].dot}` }}
                        className="bg-card border border-line-light rounded-lg"
                      >
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '.76rem' }}>{e.title}</strong>
                          <span style={{ fontSize: '.6rem', fontWeight: 700, padding: '.1rem .45rem', borderRadius: 10, background: `${KIND[e.kind].dot}22`, color: KIND[e.kind].dot }}>
                            {KIND[e.kind].label}
                          </span>
                          {e.tranche && (
                            <span style={{ fontSize: '.6rem', fontWeight: 700, padding: '.1rem .45rem', borderRadius: 10 }} className="bg-sunken text-secondary">
                              {e.tranche}
                            </span>
                          )}
                          </span>
                          <span style={{ display: 'block', fontSize: '.66rem', marginTop: '.1rem' }} className="text-tertiary">{e.sub}</span>
                        </span>
                        <button
                          onClick={() => toggleLike(e.key)}
                          aria-label={liked ? 'Unsave' : 'Save'}
                          title={liked ? 'Saved' : 'Save for later'}
                          style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: '50%', flexShrink: 0, background: liked ? 'var(--danger-light)' : 'var(--bg-sunken)' }}
                        >
                          <Heart size={14} fill={liked ? 'var(--danger)' : 'none'} style={{ color: liked ? 'var(--danger)' : 'var(--text-tertiary)' }} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className="cal-panel-upcoming" style={{ paddingBottom: '.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 500, margin: '0 0 .5rem' }}>Upcoming</h3>
              {upcoming.length === 0 ? (
                <p style={{ padding: '.9rem 1rem', fontSize: '.74rem' }} className="bg-card border border-line-light rounded-lg text-tertiary">
                  Nothing on the books ahead.
                </p>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '.45rem' }}>
                  {upcoming.map(e => {
                    const liked = likes.includes(e.key)
                    const sameDay = adKey(e.start) === adKey(e.end)
                    const n = Math.round((new Date(e.start.getFullYear(), e.start.getMonth(), e.start.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000)
                    return (
                      <li key={e.key} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.55rem .65rem' }} className="bg-card border border-line-light rounded-lg">
                        <button
                          onClick={() => jumpToDate(e.start)}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 52, padding: '.35rem .2rem', cursor: 'pointer' }} className="bg-sunken rounded-[8px]"
                          aria-label={`Jump to ${e.title}`}
                        >
                          <strong style={{ fontSize: '.95rem', lineHeight: 1 }}>{e.start.getDate()}</strong>
                          <span style={{ fontSize: '.56rem', fontWeight: 700, textTransform: 'uppercase' }} className="text-tertiary">
                            {sameDay
                              ? e.start.toLocaleDateString('en-GB', { month: 'short' })
                              : `${e.start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}–${e.end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                          </span>
                          {e.days > 1 && (
                            <span style={{ fontSize: '.54rem', fontWeight: 700, marginTop: '.1rem' }} className="text-primary">{e.days} days</span>
                          )}
                        </button>
                        <button onClick={() => jumpToDate(e.start)} style={{ flex: 1, minWidth: 0, textAlign: 'left', cursor: 'pointer' }}>
                          <strong style={{ display: 'block', fontSize: '.76rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {e.title}{e.tranche ? ` · ${e.tranche}` : ''}
                          </strong>
                          <span style={{ display: 'block', fontSize: '.64rem', marginTop: '.1rem' }} className="text-tertiary">
                            {e.sub}
                          </span>
                          <span style={{ display: 'inline-block', marginTop: '.25rem', fontSize: '.6rem', fontWeight: 700, padding: '.15rem .5rem', borderRadius: 10, background: `${KIND[e.kind].dot}22`, color: KIND[e.kind].dot }}>
                            {KIND[e.kind].label} · {n <= 0 ? (n === 0 ? 'today' : 'ongoing') : `in ${n}d`}
                          </span>
                        </button>
                        <button
                          onClick={() => toggleLike(e.key)}
                          aria-label={liked ? 'Unsave' : 'Save'}
                          title={liked ? 'Saved' : 'Save for later'}
                          style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: '50%', flexShrink: 0, background: liked ? 'var(--danger-light)' : 'var(--bg-sunken)' }}
                        >
                          <Heart size={14} fill={liked ? 'var(--danger)' : 'none'} style={{ color: liked ? 'var(--danger)' : 'var(--text-tertiary)' }} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>

      <div style={{ padding: '.9rem 1.1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '.6rem', boxShadow: 'var(--shadow-sm)' }}>
        <CalendarDays size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: '.62rem', color: 'var(--text-secondary)' }}>
          <strong style={{ fontSize: '.74rem', color: 'var(--text)' }}>Market rhythm, not market advice.</strong><br />
          NEPSE trades Monday–Friday 11:00–15:00 NPT · Sat–Sun weekend · Holidays: MOHA Rajpatra notice via @lacspace/nepal-holidays (covers BS 2083)
        </p>
      </div>

      <p style={{ marginTop: '.75rem' }}>
        <Link href="/" className="text-button"><ArrowLeft size={14} /> Back home</Link>
      </p>
    </div>
  )
}
