export type SortDirection = 1 | -1 | 0
export type SortKind = 'text' | 'number'
export type SortState<K extends string> = { key: K; dir: SortDirection }

const CYCLES: Record<SortKind, SortDirection[]> = {
  text: [1, -1, 0],
  number: [-1, 1, 0],
}

export function nextSort<K extends string>(current: SortState<K>, key: K, kind: SortKind): SortState<K> {
  if (current.key !== key) return { key, dir: CYCLES[kind][0] }
  const cycle = CYCLES[kind]
  const index = cycle.indexOf(current.dir)
  return { key, dir: cycle[(index + 1) % cycle.length] }
}

export function sortRows<T, K extends string>(
  rows: readonly T[],
  sort: SortState<K>,
  accessors: Record<K, (row: T) => string | number | null | undefined>,
): T[] {
  if (sort.dir === 0) return [...rows]
  const get = accessors[sort.key]
  return [...rows].sort((a, b) => {
    const av = get(a)
    const bv = get(b)
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sort.dir
    return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * sort.dir
  })
}
