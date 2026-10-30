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

export type DataTableColumn<T, K extends string> = {
  key: K
  label: string
  align?: 'left' | 'right'
  sortable?: boolean
  className?: string
  headClassName?: string
  render: (row: T, index: number) => ReactNode
}

/** Shared sortable table: one place for headers, sort arrows, sticky shell and empty state. */
export function DataTable<T, K extends string>({
  rows, columns, sort, onSort, rowKey, minWidth = 760, empty = 'No rows to show.', showIndex = false, className, rowClassName,
}: {
  rows: readonly T[]
  columns: readonly DataTableColumn<T, K>[]
  sort: SortState<K>
  onSort: (key: K) => void
  rowKey: (row: T, index: number) => string
  minWidth?: number
  empty?: ReactNode
  showIndex?: boolean
  className?: string
  rowClassName?: (row: T, index: number) => string | undefined
}) {
  return (
    <TableShell minWidth={minWidth} className={className}>
      <table className="data-table">
        <thead>
          <tr>
            {showIndex && <th scope="col" className="data-table-th is-right data-table-index">#</th>}
            {columns.map(column => column.sortable === false ? (
              <th
                key={column.key}
                scope="col"
                className={cn('data-table-th', column.align === 'left' ? 'is-left' : 'is-right', column.headClassName)}
              >
                {column.label}
              </th>
            ) : (
              <SortableTh
                key={column.key}
                label={column.label}
                column={column.key}
                sort={sort}
                onSort={onSort}
                align={column.align ?? 'right'}
                className={column.headClassName}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey(row, index)} className={rowClassName?.(row, index)}>
              {showIndex && <td className="data-table-index">{index + 1}</td>}
              {columns.map(column => (
                <td key={column.key} className={cn(column.align === 'left' ? 'is-left' : undefined, column.className)}>
                  {column.render(row, index)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + (showIndex ? 1 : 0)} className="data-table-empty">{empty}</td>
            </tr>
          )}
        </tbody>
      </table>
    </TableShell>
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
