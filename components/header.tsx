'use client'

import { Menu, Search, Sun, Moon, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTheme } from '@/components/theme-provider'
import { Logo } from '@/components/logo'

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/companies', label: 'Companies' },
  { href: '/projects', label: 'Projects' },
  { href: '/map', label: 'Map' },
  { href: '/procurement', label: 'Procurement' },
  { href: '/economy', label: 'Economy' },
  { href: '/environment', label: 'Environment' },
  { href: '/disasters', label: 'Disasters' },
  { href: '/calendar', label: 'Calendar' },
]

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const [mobileNav, setMobileNav] = useState(false)
  const [query, setQuery] = useState('')

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) router.push(`/companies?q=${encodeURIComponent(query.trim())}`)
  }

  // Full-bleed atlas route renders its own chrome.
  if (pathname === '/map' || pathname === '/projects/map') return null

  return (
    <header className="topbar">
      <div className="brand">
        <Link href="/"><Logo size={28} /></Link>
      </div>

      <nav className={mobileNav ? 'nav-links open' : 'nav-links'}>
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(item.href) ? 'nav-link active' : 'nav-link'}
            onClick={() => setMobileNav(false)}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="top-actions">
        <form className="search" onSubmit={submitSearch}>
          <Search size={16} />
          <input aria-label="Search companies" placeholder="Search" value={query} onChange={e => setQuery(e.target.value)} />
        </form>

        <button className="theme-toggle" onClick={toggle} aria-label="Toggle theme" title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation">
          {mobileNav ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
    </header>
  )
}
