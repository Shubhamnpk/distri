'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { DocumentPreviewModal } from './document-preview-modal'

export interface PreviewDoc {
  url: string
  title: string
}

interface DocumentViewerContextType {
  openDocument: (url: string, title?: string) => void
  closeDocument: () => void
  isOpen: boolean
  currentDoc: PreviewDoc | null
}

const DocumentViewerContext = createContext<DocumentViewerContextType | null>(null)

export function useDocViewer() {
  const ctx = useContext(DocumentViewerContext)
  if (!ctx) {
    throw new Error('useDocViewer must be used within a DocumentViewerProvider')
  }
  return ctx
}

declare global {
  interface Window {
    __openDrishtiDoc?: (url: string, title?: string) => void
  }
}

export function DocumentViewerProvider({ children }: { children: ReactNode }) {
  const [currentDoc, setCurrentDoc] = useState<PreviewDoc | null>(null)

  const openDocument = useCallback((url: string, title?: string) => {
    if (!url) return
    let resolvedTitle = title
    if (!resolvedTitle) {
      try {
        const u = new URL(url)
        const name = u.pathname.split('/').filter(Boolean).pop()
        resolvedTitle = name ? decodeURIComponent(name.split('?')[0]) : 'Official Document'
      } catch {
        resolvedTitle = 'Official Document'
      }
    }
    setCurrentDoc({ url, title: resolvedTitle })
  }, [])

  const closeDocument = useCallback(() => {
    setCurrentDoc(null)
  }, [])

  // Expose global helper for Leaflet popups or custom DOM elements
  useEffect(() => {
    window.__openDrishtiDoc = openDocument
    return () => {
      delete window.__openDrishtiDoc
    }
  }, [openDocument])

  // Global click interceptor: automatically catches clicks on any document link across the entire app
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Ignore if modified click (cmd, ctrl, shift, alt) or non-left-click
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return

      const target = e.target as HTMLElement | null
      if (!target) return

      const anchor = target.closest('a') as HTMLAnchorElement | null
      if (!anchor || !anchor.href) return

      const href = anchor.href
      const isExplicitDoc =
        anchor.getAttribute('data-doc') === 'true' ||
        anchor.getAttribute('data-document') === 'true' ||
        anchor.getAttribute('data-preview') === 'true' ||
        anchor.classList.contains('doc-link') ||
        anchor.classList.contains('document-preview-trigger')

      const isPdfUrl = /\.pdf(\?.*)?$/i.test(href) || /\/uploads\/.*\.pdf/i.test(href)
      const isImageUrl = /\.(png|jpe?g|webp|bmp|svg)(\?.*)?$/i.test(href) && isExplicitDoc

      if (isExplicitDoc || isPdfUrl || isImageUrl) {
        e.preventDefault()
        e.stopPropagation()

        const extractedTitle =
          anchor.getAttribute('data-title') ||
          anchor.getAttribute('title') ||
          anchor.getAttribute('aria-label') ||
          anchor.textContent?.replace(/[↗→]/g, '').trim() ||
          'Official Document'

        openDocument(href, extractedTitle)
      }
    }

    // Capture phase so we intercept before other router handlers
    window.addEventListener('click', handleDocumentClick, true)
    return () => {
      window.removeEventListener('click', handleDocumentClick, true)
    }
  }, [openDocument])

  return (
    <DocumentViewerContext.Provider
      value={{
        openDocument,
        closeDocument,
        isOpen: currentDoc !== null,
        currentDoc,
      }}
    >
      {children}
      <DocumentPreviewModal
        open={currentDoc !== null}
        onClose={closeDocument}
        url={currentDoc?.url ?? null}
        title={currentDoc?.title}
      />
    </DocumentViewerContext.Provider>
  )
}
