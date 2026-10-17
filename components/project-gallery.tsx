'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react'

type ProjectGalleryProps = {
  images: string[]
  projectName: string
}

export function ProjectGallery({ images, projectName }: ProjectGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const isOpen = activeIndex !== null

  const showImage = (index: number) => setActiveIndex((index + images.length) % images.length)

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveIndex(null)
      if (event.key === 'ArrowRight') setActiveIndex(index => index === null ? null : (index + 1) % images.length)
      if (event.key === 'ArrowLeft') setActiveIndex(index => index === null ? null : (index - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [images.length, isOpen])

  if (!images.length) return null

  return (
    <>
      <div className="project-gallery-grid">
        {images.map((src, index) => (
          <button
            key={`${src}-${index}`}
            type="button"
            className={`project-gallery-tile${index === 0 ? ' featured' : ''}`}
            onClick={() => showImage(index)}
            aria-label={`Open image ${index + 1} of ${images.length} for ${projectName}`}
          >
            <img src={src} alt={`${projectName} — photo ${index + 1}`} loading={index === 0 ? 'eager' : 'lazy'} />
            <span className="project-gallery-expand"><Expand size={15} /> View</span>
          </button>
        ))}
      </div>

      {activeIndex !== null && (
        <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={`${projectName} photo gallery`} onClick={() => setActiveIndex(null)}>
          <div className="gallery-lightbox-shell" onClick={event => event.stopPropagation()}>
            <header className="gallery-lightbox-header">
              <div>
                <span className="gallery-lightbox-kicker">PROJECT PHOTOS</span>
                <strong>{projectName}</strong>
              </div>
              <div className="gallery-lightbox-controls">
                <span className="gallery-lightbox-count">{activeIndex + 1} <span>/</span> {images.length}</span>
                <button type="button" className="gallery-control" onClick={() => setActiveIndex(null)} aria-label="Close gallery"><X size={19} /></button>
              </div>
            </header>
            <div className="gallery-stage">
              <img src={images[activeIndex]} alt={`${projectName} — photo ${activeIndex + 1}`} />
              {images.length > 1 && <>
                <button type="button" className="gallery-arrow previous" onClick={() => showImage(activeIndex - 1)} aria-label="Previous image"><ChevronLeft size={22} /></button>
                <button type="button" className="gallery-arrow next" onClick={() => showImage(activeIndex + 1)} aria-label="Next image"><ChevronRight size={22} /></button>
              </>}
            </div>
            {images.length > 1 && <div className="gallery-filmstrip" aria-label="Choose a photo">
              {images.map((src, index) => <button type="button" key={`${src}-${index}`} onClick={() => setActiveIndex(index)} aria-label={`Show image ${index + 1}`} aria-current={index === activeIndex}>
                <img src={src} alt="" />
              </button>)}
            </div>}
            <footer className="gallery-lightbox-footer"><span>Use arrow keys to browse</span><span>{activeIndex + 1} of {images.length} photos</span></footer>
          </div>
        </div>
      )}
    </>
  )
}
