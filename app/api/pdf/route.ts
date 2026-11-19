import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const TIMEOUT_MS = 25_000
const MAX_BYTES = 35 * 1024 * 1024 // 35 MB

/**
 * Same-origin PDF and image proxy for the in-app document viewer.
 * Third-party government and financial endpoints (SEBON, NEPSE, MoF, DCGF, OAG, IBN)
 * often omit CORS headers or set strict X-Frame-Options that block inline browser viewing.
 * This proxy streams the document bytes with inline disposition and stripped frame-blocking headers.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const target = searchParams.get('url') ?? ''
  const isDownload = searchParams.get('download') === '1'
  const customFilename = searchParams.get('filename') ?? ''

  if (!target) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return NextResponse.json({ error: 'Invalid url parameter' }, { status: 400 })
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return NextResponse.json({ error: 'Only http and https URLs are allowed' }, { status: 400 })
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)

  try {
    const upstream = await fetch(parsed.toString(), {
      signal: ctrl.signal,
      headers: {
        Accept: 'application/pdf,image/*,*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Drishti/1.0',
      },
    })

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: `Upstream responded with ${upstream.status}` }, { status: 502 })
    }

    const contentType = upstream.headers.get('content-type') || 'application/pdf'
    const contentLength = Number(upstream.headers.get('content-length') ?? 0)

    if (Number.isFinite(contentLength) && contentLength > MAX_BYTES) {
      return NextResponse.json({ error: 'Document too large to preview' }, { status: 413 })
    }

    let defaultName = 'document.pdf'
    try {
      const pathname = parsed.pathname
      const last = pathname.split('/').filter(Boolean).pop()
      if (last) {
        defaultName = decodeURIComponent(last.split('?')[0])
      }
    } catch {
      // fallback to defaultName
    }

    const safeName = (customFilename || defaultName).replace(/[^\w\s.-]/g, '_').trim()
    const finalFilename = safeName.toLowerCase().endsWith('.pdf') ? safeName : `${safeName}.pdf`

    const disposition = isDownload
      ? `attachment; filename="${finalFilename}"`
      : 'inline'

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400',
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not fetch document'
    return NextResponse.json({ error: message }, { status: 502 })
  } finally {
    clearTimeout(timer)
  }
}
