'use client'

import { ChevronDown, Menu, Search, Sun, Moon, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from '@/components/theme-provider'
import { Logo } from '@/components/logo'

type NavItem = { href: string; label: string; desc: string }
type NavGroup = { label: string; items: NavItem[] }

const navGroups: NavGroup[] = [
  {
    label: 'Economy',
    items: [
      { href: '/economy', label: 'Economy overview', desc: 'GDP, prices, people and forecasts' },
      { href: '/market', label: 'Market', desc: 'NEPSE board, sectors and movers' },
      { href: '/companies', label: 'Companies', desc: 'State-owned enterprise finances' },
    ],
  },
  {
    label: 'Places',
    items: [
      { href: '/places', label: 'Provinces & districts', desc: '7 provinces, 77 districts and all local units' },
      { href: '/map', label: 'Map', desc: 'Live national atlas' },
    ],
  },
  {
    label: 'Projects',
    items: [
      { href: '/projects', label: 'Projects', desc: 'Public infrastructure tracker' },
      { href: '/procurement', label: 'Procurement', desc: 'Government tender archive' },
    ],
  },
  {
    label: 'Environment',
    items: [
      { href: '/environment', label: 'Environment overview', desc: 'Weather, air, rivers and quakes' },
      { href: '/disasters', label: 'Disasters', desc: 'Incidents, losses and relief' },
      { href: '/calendar', label: 'Calendar', desc: 'Holidays, fiscal dates and IPOs' },
    ],
  },
]

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const [mobileNav, setMobileNav] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const navRef = useRef<HTMLElement | null>(null)

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    if (href === '/places') {
      return pathname === '/places' || pathname.startsWith('/provinces') || pathname.startsWith('/districts')
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  useEffect(() => {
    setMobileNav(false)
    setOpenMenu(null)
  }, [pathname])

  useEffect(() => {
    if (!mobileNav) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [mobileNav])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setOpenMenu(null)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null)
        setMobileNav(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  // Full-bleed atlas route renders its own chrome.
  if (pathname === '/map' || pathname === '/projects/map') return null

  return (
    <header className="topbar">
      <div className="brand">
        <Link href="/" aria-label="Drishti home"><Logo size={28} /></Link>
      </div>

      <nav id="primary-nav" ref={navRef} className={mobileNav ? 'nav-links open' : 'nav-links'} aria-label="Primary">
        <Link
          href="/"
          className={isActive('/') ? 'nav-link active' : 'nav-link'}
          aria-current={isActive('/') ? 'page' : undefined}
          onClick={() => { setOpenMenu(null); setMobileNav(false) }}
        >
          Home
        </Link>
        {navGroups.map(group => {
          const active = group.items.some(item => isActive(item.href))
          const open = openMenu === group.label
          const menuId = `nav-menu-${group.label.toLowerCase()}`

          return (
            <div key={group.label} className={`nav-group${active ? ' active' : ''}${open ? ' open' : ''}`}>
              <span className="nav-group-heading">{group.label}</span>
              <button
                type="button"
                className="nav-group-toggle"
                aria-haspopup="true"
                aria-expanded={open}
                aria-controls={menuId}
                onClick={() => setOpenMenu(open ? null : group.label)}
              >
                {group.label}
                <ChevronDown size={12} />
              </button>
              <div id={menuId} className="nav-group-menu">
                {group.items.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={isActive(item.href) ? 'nav-menu-link active' : 'nav-menu-link'}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    onClick={() => { setOpenMenu(null); setMobileNav(false) }}
                  >
                    <strong>{item.label}</strong>
                    <span>{item.desc}</span>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="top-actions">
        <form className="search" onSubmit={submitSearch}>
          <Search size={16} />
          <input aria-label="Search" placeholder="Search Nepal" value={query} onChange={e => setQuery(e.target.value)} />
        </form>

        <Link href="/search" className="search-jump" aria-label="Search">
          <Search size={17} />
        </Link>

        <button className="theme-toggle" onClick={toggle} aria-label="Toggle theme" title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation" aria-expanded={mobileNav} aria-controls="primary-nav">
          {mobileNav ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
    </header>
  )
}
