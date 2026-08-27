'use client'

import { useState } from 'react'
import { Clipboard, ExternalLink, FileText } from 'lucide-react'
import { sources } from '@/lib/data'
import { prompt } from '@/lib/data'

export default function SourcesPage() {
  const [copied, setCopied] = useState(false)

  const copyPrompt = async () => {
    await navigator.clipboard?.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="content-wrap">
      <section className="full-panel panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">EVIDENCE FIRST</p>
            <h2>Public source registry</h2>
          </div>
        </div>
        <p className="section-intro">These are the official public sources we can index. A source being listed does not mean every document is machine-readable or current.</p>

        <div className="source-table">
          {sources.map(s => (
            <a className="source-registry-row" key={s.title} href={s.url} target="_blank" rel="noreferrer">
              <div className="file-icon"><FileText size={17} /></div>
              <div className="source-main"><strong>{s.title}</strong><span>{s.publisher}</span></div>
              <span className="source-type">{s.type}</span>
              <span>{s.date}</span>
              <span className="status-badge status-good"><span className="status-dot" />Verified</span>
              <ExternalLink size={15} />
            </a>
          ))}
        </div>

        <div className="scraper-panel">
          <div>
            <p className="eyebrow">NO STABLE API? BUILD AN ADAPTER.</p>
            <h3>Daily data pipeline brief</h3>
            <p className="muted">Copy this implementation prompt into a Python project to collect, validate, and publish new records every day.</p>
          </div>
          <button className="outline-button" onClick={copyPrompt}>
            <Clipboard size={16} /> {copied ? 'Copied' : 'Copy prompt'}
          </button>
          <pre>{prompt}</pre>
        </div>
      </section>
    </div>
  )
}
