'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  FileText,
  Download,
  ExternalLink,
  X,
  LoaderCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react'

export type DocumentPreviewModalProps = {
  open: boolean
  onClose: () => void
  url: string | null
  title?: string
}

function isImage(url: string | null): boolean {
  if (!url) return false
  return /\.(png|jpe?g|webp|bmp|svg|gif)(\?.*|#.*)?$/i.test(url)
}

export function DocumentPreviewModal({
  open,
  onClose,
  url,
  title = 'Document Preview',
}: DocumentPreviewModalProps) {
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState(false)
  const [imageZoom, setImageZoom] = useState(1)
  const [imagePan, setImagePan] = useState({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  const isImg = isImage(url)
  const proxyUrl = url
    ? `/api/pdf?url=${encodeURIComponent(url)}`
    : ''

  // Reset state whenever URL changes or modal opens
  useEffect(() => {
    if (open && url) {
      setLoading(true)
      setError(false)
      setImageZoom(1)
      setImagePan({ x: 0, y: 0 })
    }
  }, [open, url])

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  const handleDownload = async () => {
    if (!url) return
    setDownloading(true)
    try {
      const downloadUrl = `/api/pdf?url=${encodeURIComponent(url)}&download=1&filename=${encodeURIComponent(title || 'document')}`
      const res = await fetch(downloadUrl)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const ext = isImg
        ? (url.match(/\.(png|jpe?g|gif|webp|svg)$/i)?.[0] ?? '.png')
        : '.pdf'
      const safeName = (title || 'document').replace(/[^\w\s.-]/g, '_').trim()
      const a = document.createElement('a')
      const blobUrl = URL.createObjectURL(blob)
      a.href = blobUrl
      a.download = `${safeName}${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloading(false)
    }
  }

  const handleOpenInNewTab = () => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  // Image pan & drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isImg) return
    isDraggingRef.current = true
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: imagePan.x,
      panY: imagePan.y,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !isImg) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    setImagePan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isImg) return
    isDraggingRef.current = false
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (!isImg) return
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.15 : 0.15
    setImageZoom(z => Math.min(4, Math.max(0.5, z + delta)))
  }

  const resetZoom = useCallback(() => {
    setImageZoom(1)
    setImagePan({ x: 0, y: 0 })
  }, [])

  if (!open || !url) return null

  let domain = ''
  try {
    domain = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    domain = 'Document'
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="doc-preview-backdrop"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 10, 18, 0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(0.5rem, 2vw, 1.5rem)',
      }}
    >
      <div
        className="doc-preview-container"
        style={{
          width: 'min(1100px, 96vw)',
          height: 'min(90vh, 900px)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card, #ffffff)',
          color: 'var(--text, #111827)',
          border: '1px solid var(--border, #e5e7eb)',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          animation: 'docModalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Top Header Bar */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderBottom: '1px solid var(--border-light, #e5e7eb)',
            background: 'var(--bg-sunken, #f9fafb)',
            minHeight: 56,
          }}
        >
          {/* Title and Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
            <span
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--bg, #ffffff)',
                border: '1px solid var(--border, #e5e7eb)',
                color: 'var(--primary, #0d7c5f)',
                flexShrink: 0,
              }}
            >
              {isImg ? <ImageIcon size={16} /> : <FileText size={16} />}
            </span>
            <div style={{ minWidth: 0 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  lineHeight: 1.25,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={title}
              >
                {title}
              </h3>
              <p
                style={{
                  margin: '0.1rem 0 0',
                  fontSize: '0.68rem',
                  color: 'var(--text-tertiary, #9ca3af)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {isImg ? 'Image' : 'PDF Document'} · {domain}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
            {/* Image zoom tools */}
            {isImg && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginRight: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setImageZoom(z => Math.max(0.5, z - 0.25))}
                  className="atlas-zoom-btn"
                  style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)' }}
                  title="Zoom out"
                  aria-label="Zoom out"
                >
                  <ZoomOut size={13} />
                </button>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, minWidth: 38, textAlign: 'center' }}>
                  {Math.round(imageZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setImageZoom(z => Math.min(4, z + 0.25))}
                  className="atlas-zoom-btn"
                  style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)' }}
                  title="Zoom in"
                  aria-label="Zoom in"
                >
                  <ZoomIn size={13} />
                </button>
                <button
                  type="button"
                  onClick={resetZoom}
                  className="atlas-zoom-btn"
                  style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)' }}
                  title="Reset view"
                  aria-label="Reset view"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            )}

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '0.38rem 0.65rem',
                borderRadius: 8,
                border: '1px solid var(--border, #e5e7eb)',
                background: 'var(--bg, #ffffff)',
                color: 'var(--text, #111827)',
                cursor: downloading ? 'wait' : 'pointer',
              }}
              title="Download file"
            >
              {downloading ? <LoaderCircle size={13} className="animate-spin" /> : <Download size={13} />}
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Open in new tab */}
            <button
              type="button"
              onClick={handleOpenInNewTab}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '0.38rem 0.65rem',
                borderRadius: 8,
                border: '1px solid var(--border, #e5e7eb)',
                background: 'var(--bg, #ffffff)',
                color: 'var(--text, #111827)',
                cursor: 'pointer',
              }}
              title="Open raw document in new tab"
            >
              <ExternalLink size={13} />
              <span className="hidden sm:inline">New tab</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close document preview"
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 32,
                height: 32,
                borderRadius: 8,
                border: '1px solid var(--border, #e5e7eb)',
                background: 'var(--bg, #ffffff)',
                color: 'var(--text, #111827)',
                cursor: 'pointer',
                marginLeft: '0.2rem',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Document Body Viewport */}
        <div
          style={{
            position: 'relative',
            flex: 1,
            minHeight: 0,
            background: isImg ? 'var(--bg-sunken, #111827)' : 'var(--bg, #ffffff)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Loading spinner */}
          {loading && !error && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 10,
                background: 'var(--bg-card, #ffffff)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
              }}
            >
              <LoaderCircle size={28} className="text-primary animate-spin" />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Loading document preview...
              </span>
            </div>
          )}

          {/* Error fallback card */}
          {error && (
            <div
              style={{
                padding: '2rem',
                maxWidth: 480,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.8rem',
              }}
            >
              <span
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'var(--danger-light, #fee2e2)',
                  color: 'var(--danger, #dc2626)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <AlertCircle size={24} />
              </span>
              <strong style={{ fontSize: '1rem' }}>Unable to load inline preview</strong>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                The official document host might have restricted direct streaming. You can still download or open the original document in a new tab.
              </p>
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleDownload}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 0.9rem',
                    borderRadius: 8,
                    background: 'var(--primary, #0d7c5f)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  <Download size={14} /> Download file
                </button>
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 0.9rem',
                    borderRadius: 8,
                    background: 'var(--bg, #ffffff)',
                    color: 'var(--text, #111827)',
                    border: '1px solid var(--border)',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  <ExternalLink size={14} /> Open original URL
                </button>
              </div>
            </div>
          )}

          {/* PDF Viewer */}
          {!isImg && (
            <iframe
              src={proxyUrl}
              title={title}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false)
                setError(true)
              }}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: error ? 'none' : 'block',
              }}
            />
          )}

          {/* Image Viewer with interactive Pan and Zoom */}
          {isImg && (
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onWheel={handleWheel}
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: imageZoom > 1 ? 'grab' : 'default',
                userSelect: 'none',
                touchAction: 'none',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proxyUrl}
                alt={title}
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false)
                  setError(true)
                }}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  transform: `translate(${imagePan.x}px, ${imagePan.y}px) scale(${imageZoom})`,
                  transition: isDraggingRef.current ? 'none' : 'transform 0.12s ease-out',
                  transformOrigin: 'center center',
                  pointerEvents: 'none',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
