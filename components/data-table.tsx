'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { nextSort, type SortKind, type SortState } from '@/lib/table-sort'

const STICKY_TOP = 64
const STICKY_QUERY = '(min-width: 1280px)'

export function useTableSort<K extends string>(initial: SortState<K>, kinds: Record<K, SortKind>) {
  const [sort, setSort] = useState(initial)
  const toggleSort = (key: K) => setSort(current => nextSort(current, key, kinds[key]))
  return { sort, setSort, toggleSort }
}

export function TableShell({ children, minWidth = 760, className }: {
  children: ReactNode
  minWidth?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const shell = ref.current
    const table = shell?.querySelector('table')
    const head = table?.querySelector('thead')
    if (!shell || !table || !head) return

    const desktop = window.matchMedia(STICKY_QUERY)
    let frame = 0

    const update = () => {
      frame = 0
      if (desktop.matches) {
        head.style.transform = ''
        return
      }
      const tableRect = table.getBoundingClientRect()
      const headHeight = head.getBoundingClientRect().height
      const offset = Math.max(0, Math.min(
        STICKY_TOP - tableRect.top,
        tableRect.bottom - headHeight - tableRect.top,
      ))
      head.style.transform = offset > 0 ? `translateY(${offset}px)` : ''
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    desktop.addEventListener('change', schedule)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      desktop.removeEventListener('change', schedule)
      head.style.transform = ''
    }
  }, [])

  return (
    <div
      ref={ref}
      className={cn('data-table-shell', className)}
      style={{ '--table-min': `${minWidth}px` } as CSSProperties}
    >
      {children}
    </div>
  )
}

export function SortableTh<K extends string>({ label, column, sort, onSort, align = 'right', className }: {
  label: string
  column: K
  sort: SortState<K>
  onSort: (key: K) => void
  align?: 'left' | 'right'
  className?: string
}) {
  const active = sort.key === column && sort.dir !== 0
  const ariaSort = !active ? 'none' : sort.dir === 1 ? 'ascending' : 'descending'

  return (
    <th scope="col" aria-sort={ariaSort} className={cn('data-table-th', align === 'left' ? 'is-left' : 'is-right', active && 'is-active', className)}>
      <button type="button" className="data-table-sort" onClick={() => onSort(column)} title={`Sort by ${label}`}>
        <span>{label}</span>
        {!active ? <ArrowUpDown size={11} aria-hidden /> : sort.dir === 1 ? <ArrowUp size={11} aria-hidden /> : <ArrowDown size={11} aria-hidden />}
      </button>
    </th>
  )
}
