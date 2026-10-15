'use client'

import { useEffect, useState } from 'react'
import { Search, Database, ExternalLink, Building2, FolderKanban, Globe2, Filter } from 'lucide-react'
import { searchDatasets } from '@/lib/opendatanepal'
import { fetchDataNepalDatasets, fetchDataNepalIndicators, fetchDataNepalPlaces } from '@/lib/datanepal'
import type { DataNepalDataset } from '@/lib/datanepal'
import type { CkanDataset } from '@/lib/types'

const CATEGORIES = [
  { id: 'all', label: 'All Data', icon: Database },
  { id: 'companies', label: 'Companies & Industry', icon: Building2 },
  { id: 'projects', label: 'Projects & Aid', icon: FolderKanban },
  { id: 'economy', label: 'Economy & Finance', icon: Globe2 },
]

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<CkanDataset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [error, setError] = useState<string | null>(null)
  const [dn, setDn] = useState<{ datasets: DataNepalDataset[]; indicators: number; places: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchDataNepalDatasets(), fetchDataNepalIndicators(), fetchDataNepalPlaces()])
      .then(([datasets, indicators, places]) => {
        if (!cancelled) setDn({ datasets, indicators: indicators.length, places: places.length })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const loadDatasets = async () => {
      try {
        setLoading(true)
        setError(null)
        
        let query = searchQuery || 'nepal'
        if (selectedCategory === 'companies') query = 'industry company registration'
        if (selectedCategory === 'projects') query = 'project aid hydropower'
        if (selectedCategory === 'economy') query = 'GDP budget trade inflation'
        
        const results = await searchDatasets(query, 20)
        setDatasets(results)
      } catch (err) {
        console.error('Failed to load datasets:', err)
        setError('Failed to load datasets from Open Data Nepal')
      } finally {
        setLoading(false)
      }
    }
    
    loadDatasets()
  }, [searchQuery, selectedCategory])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Search is triggered by useEffect when searchQuery changes
  }

  return (
    <div className="content-wrap">
      <section className="full-panel panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">OPEN DATA NEPAL</p>
            <h2>Explore datasets</h2>
          </div>
          <span className="muted" style={{ fontSize: '.68rem' }}>
            {loading ? 'Loading...' : `${datasets.length} datasets found`}
          </span>
        </div>
        <p className="section-intro">
          Search and browse Nepal's open data portal. Datasets cover governance, health, education, environment, finance, and more. Many are available in CSV format, some queryable via the DataStore API.
        </p>

        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '.75rem' }}>
          <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: '400px' }}>
            <label className="search" style={{ display: 'block' }}>
              <Search size={16} />
              <input
                aria-label="Search datasets"
                placeholder="Search datasets..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </label>
          </form>
        </div>

        <div className="quarter-tabs" style={{ marginTop: '.6rem' }}>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            return (
              <button
                key={cat.id}
                className={selectedCategory === cat.id ? 'selected' : ''}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <Icon size={14} /> {cat.label}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p className="muted">Loading datasets from Open Data Nepal...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p className="muted text-danger">{error}</p>
            <button 
              className="outline-button" 
              onClick={() => window.location.reload()}
              style={{ marginTop: '1rem' }}
            >
              Retry
            </button>
          </div>
        ) : datasets.length === 0 ? (
          <p className="muted" style={{ marginTop: '1.5rem' }}>No datasets found for this search.</p>
        ) : (
          <div className="data-table">
            {datasets.map(dataset => (
              <a
                key={dataset.name}
                className="data-row"
                href={`https://opendatanepal.com/dataset/${dataset.name}`}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="entity">
                  <div className="entity-icon" style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'rgb(37, 99, 235)' }}>
                    <Database size={18} />
                  </div>
                  <div>
                    <strong>{dataset.title}</strong>
                    <span>{dataset.organization?.title || 'Unknown'} · {dataset.resources?.length || 0} resources</span>
                  </div>
                </div>
                <div>
                  <small>Format</small>
                  <strong>
                    {[...new Set(dataset.resources?.map(r => r.format))].join(', ') || 'N/A'}
                  </strong>
                </div>
                <div>
                  <small>Tags</small>
                  <strong>{dataset.tags?.slice(0, 3).map(t => t.name).join(', ') || 'N/A'}</strong>
                </div>
                <div>
                  <small>Modified</small>
                  <strong>
                    {dataset.metadata_modified ? new Date(dataset.metadata_modified).toLocaleDateString() : 'N/A'}
                  </strong>
                </div>
                <ExternalLink size={14} className="text-tertiary" />
              </a>
            ))}
          </div>
        )}

        {dn && dn.datasets.length > 0 && (
          <div className="bg-sunken border border-line-light rounded-md" style={{ marginTop: '1.5rem', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
              <Database size={15} className="text-primary" />
              <h3 style={{ fontSize: '.9rem', fontWeight: 600, margin: 0 }}>DataNepal open registry</h3>
              <span className="text-tertiary bg-card border border-line-light rounded-[20px]" style={{ fontSize: '.64rem', padding: '.15rem .5rem' }}>
                {dn.datasets.length} datasets · {dn.indicators} indicators · {dn.places} places
              </span>
              <a href="https://datanepal.org/datasets/" target="_blank" rel="noreferrer" className="text-button" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '.25rem' }}>
                Open registry <ExternalLink size={14} />
              </a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem', marginTop: '.75rem' }}>
              {dn.datasets.slice(0, 6).map((d, i) => (
                <div key={d.dataset_id ?? i} className="bg-card border border-line-light rounded-[8px]" style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.74rem', padding: '.5rem .65rem' }}>
                  <span className="bg-primary-50 text-primary rounded-[6px]" style={{ width: 20, height: 20, display: 'grid', placeItems: 'center', fontSize: '.62rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                  <strong style={{ fontWeight: 600 }}>{String(d.title ?? d.dataset_id ?? 'Untitled dataset')}</strong>
                  {d.dataset_id && <span className="text-tertiary" style={{ marginLeft: 'auto', fontSize: '.62rem', fontFamily: 'monospace' }}>{d.dataset_id}</span>}
                </div>
              ))}
            </div>
            <p className="text-tertiary" style={{ fontSize: '.66rem', lineHeight: 1.5, margin: '.6rem 0 0' }}>
              Census 2021, ECN mirrors & WDI series repackaged as static JSON - no key, refreshed from primary sources. Powers the district hierarchy on the Projects tracker.
            </p>
          </div>
        )}

        <div className="bg-card border border-line-light rounded-md" style={{ marginTop: '1.5rem', padding: '1rem' }}>
          <h3 style={{ fontSize: '.9rem', fontWeight: 600, marginBottom: '.5rem' }}>About Open Data Nepal</h3>          <p className="text-secondary" style={{ fontSize: '.75rem', lineHeight: 1.6, margin: 0 }}>
            Open Data Nepal hosts datasets from 51 publishing organizations. Most are available in CSV format, some queryable via the DataStore API. Data covers industry registrations, foreign direct investment, hydropower projects, government budgets, and more.
          </p>
          <a
            href="https://opendatanepal.com"
            target="_blank"
            rel="noreferrer"
            className="text-button"
            style={{ marginTop: '.75rem', display: 'inline-flex', alignItems: 'center', gap: '.25rem' }}
          >
            Visit Open Data Nepal <ExternalLink size={14} />
          </a>
        </div>
      </section>
    </div>
  )
}
