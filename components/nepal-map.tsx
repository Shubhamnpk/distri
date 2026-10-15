'use client'

type ProvinceId = 'Koshi' | 'Madhesh' | 'Bagmati' | 'Gandaki' | 'Lumbini' | 'Karnali' | 'Sudurpashchim' | 'National'

const provinces: { id: ProvinceId; label: string; nepali: string; path: string }[] = [
  { id: 'Sudurpashchim', label: 'Sudurpashchim', nepali: 'सुदूरपश्चिम', path: 'M 22 110 L 155 88 L 155 255 L 22 275 Z' },
  { id: 'Karnali', label: 'Karnali', nepali: 'कर्णाली', path: 'M 155 88 L 325 62 L 335 285 L 155 255 Z' },
  { id: 'Lumbini', label: 'Lumbini', nepali: 'लुम्बिनी', path: 'M 325 265 L 510 252 L 510 360 L 335 285 Z' },
  { id: 'Gandaki', label: 'Gandaki', nepali: 'गण्डकी', path: 'M 325 62 L 510 48 L 510 252 L 325 265 Z' },
  { id: 'Bagmati', label: 'Bagmati', nepali: 'बागमती', path: 'M 510 48 L 705 35 L 705 275 L 510 252 Z' },
  { id: 'Madhesh', label: 'Madhesh', nepali: 'मधेश', path: 'M 705 275 L 905 265 L 905 365 L 510 360 Z' },
  { id: 'Koshi', label: 'Koshi', nepali: 'कोशी', path: 'M 705 35 L 945 22 L 980 180 L 905 265 L 705 275 Z' },
]

export function NepalMap({
  selected,
  onSelect,
  counts,
}: {
  selected: string
  onSelect: (p: string) => void
  counts: Record<string, number>
}) {
  const nationalCount = counts['National'] ?? 0

  return (
    <div style={{ padding: '1rem 1.1rem' }} className="bg-card border border-line-light rounded-lg shadow-sm">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem', flexWrap: 'wrap', gap: '.5rem' }}>
        <strong style={{ fontSize: '.82rem', letterSpacing: '-.02em' }}>Filter by province, click the map</strong>
        <span style={{ fontSize: '.62rem', padding: '.2rem .5rem' }} className="text-tertiary bg-sunken rounded-[20px]">
          {nationalCount} national projects shown in every province
        </span>
      </div>

      <div style={{ position: 'relative', padding: '.5rem', overflow: 'hidden' }} className="bg-sunken rounded-[12px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <svg viewBox="0 0 1000 400" role="img" aria-label="Nepal provinces map" style={{ width: '100%', height: 'auto', display: 'block' }}>
          {/* subtle Nepal outline */}
          <rect x="18" y="18" width="964" height="364" rx="14" fill="none" stroke="var(--border)" strokeWidth="1.2" strokeDasharray="6 6" opacity={0.35} />
          {provinces.map(pr => {
            const isActive = selected === pr.id
            const count = counts[pr.id] ?? 0
            return (
              <g key={pr.id} onClick={() => onSelect(pr.id)} style={{ cursor: 'pointer' }}>
                <path
                  d={pr.path}
                  fill={isActive ? 'var(--accent)' : 'var(--bg-elevated)'}
                  stroke={isActive ? 'var(--accent)' : 'var(--border)'}
                  strokeWidth={isActive ? 2.2 : 1.1}
                  style={{ transition: 'all .15s ease', filter: isActive ? 'drop-shadow(0 2px 8px rgba(13,124,95,.22))' : undefined }}
                />
                <text
                  x={(() => {
                    const m = pr.path.match(/M\s+(\d+)/)
                    return m ? Number(m[1]) + 55 : 0
                  })()}
                  y={(() => {
                    // center y roughly
                    if (pr.id === 'Madhesh') return 320
                    if (pr.id === 'Lumbini') return 312
                    return 165
                  })()}
                  fontSize={pr.id === 'Sudurpashchim' ? 11 : 12}
                  fontWeight={isActive ? 700 : 600}
                  fill={isActive ? '#fff' : 'var(--text)'}
                  style={{ pointerEvents: 'none', textShadow: isActive ? '0 1px 6px rgba(0,0,0,.25)' : undefined }}
                >
                  {pr.label}
                </text>
                <text
                  x={(() => {
                    const m = pr.path.match(/M\s+(\d+)/)
                    return m ? Number(m[1]) + 55 : 0
                  })()}
                  y={(() => {
                    if (pr.id === 'Madhesh') return 338
                    if (pr.id === 'Lumbini') return 330
                    return 182
                  })()}
                  fontSize="9"
                  fill={isActive ? 'rgba(255,255,255,.82)' : 'var(--text-tertiary)'}
                  style={{ pointerEvents: 'none' }}
                >
                  {count} projects
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem', marginTop: '.75rem' }}>
        <button onClick={() => onSelect('All')} className={selected === 'All' ? 'selected border border-line-light rounded-[6px]' : 'border border-line-light rounded-[6px]'} style={{
          padding: '.35rem .6rem', fontSize: '.7rem', fontWeight: 600,
          background: selected === 'All' ? 'var(--accent)' : 'var(--bg-sunken)', color: selected === 'All' ? '#fff' : 'var(--text-secondary)',
          cursor: 'pointer'
        }}>
          All provinces
        </button>
        <button onClick={() => onSelect('National')} className={selected === 'National' ? 'selected border border-line-light rounded-[6px]' : 'border border-line-light rounded-[6px]'} style={{
          padding: '.35rem .6rem', fontSize: '.7rem', fontWeight: 600,
          background: selected === 'National' ? 'var(--accent)' : 'var(--bg-sunken)', color: selected === 'National' ? '#fff' : 'var(--text-secondary)',
          cursor: 'pointer'
        }}>
          National ({nationalCount})
        </button>
        {provinces.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              padding: '.35rem .6rem', fontSize: '.7rem', fontWeight: 600,
              background: selected === p.id ? 'var(--accent)' : 'var(--bg-sunken)', color: selected === p.id ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
            className="border border-line-light rounded-[6px]"
          >
            {p.label} ({counts[p.id] ?? 0})
          </button>
        ))}
      </div>

      <p style={{ margin: '.6rem 0 0', fontSize: '.62rem', lineHeight: 1.5 }} className="text-tertiary">
        National projects span multiple provinces and appear in every filter. Heritage & conservation sites cluster in Bagmati.
      </p>
    </div>
  )
}
