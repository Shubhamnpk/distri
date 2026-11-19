/**
 * CDN caching for GET route handlers.
 *
 * In this Next.js version route handlers are **not** cached by default, and
 * `export const revalidate` alone does not stop the function from running on
 * every request. Without explicit cache headers each visit to /economy or the
 * home page re-executed the handler, which is billed as Fluid Active CPU on
 * Vercel. `s-maxage` keeps the JSON on the edge, so only the first request per
 * window costs CPU. Browsers still revalidate (no `max-age`), so they always
 * see at most one window of staleness.
 *
 * `Vercel-CDN-Cache-Control` takes precedence over `Cache-Control` on Vercel;
 * sending both keeps the same behaviour on other hosts.
 */
export function cdnCache(seconds: number, staleSeconds = seconds * 24) {
  const value = `public, s-maxage=${seconds}, stale-while-revalidate=${staleSeconds}`
  return {
    'Cache-Control': value,
    'Vercel-CDN-Cache-Control': value,
  }
}
