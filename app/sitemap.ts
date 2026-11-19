import type { MetadataRoute } from 'next'
import { companies, projects, slugify } from '@/lib/data'
import { DISTRICTS, LOCAL_UNITS, PROVINCES } from '@/lib/geo-constants'
import { SITE_URL } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    '/', '/companies', '/projects', '/economy', '/market', '/places', '/map',
    '/procurement', '/datasets', '/sources', '/environment', '/disasters', '/calendar', '/search', '/releases', '/about',
  ]
  // NOTE: palikas (local units) are deliberately NOT in the sitemap. At ~750
  // URLs the crawler was walking into territory nobody actually queries, which
  // cost real render CPU on Vercel. Provinces and districts cover discovery.
  const placePaths = [
    ...PROVINCES.map(({ slug }) => `/provinces/${slug}`),
    ...DISTRICTS.map(({ slug }) => `/districts/${slug}`),
  ]
  const entityPaths = [
    ...companies.map(({ name }) => `/companies/${slugify(name)}`),
    ...projects.map(({ name }) => `/projects/${slugify(name)}`),
  ]

  return [...staticPaths, ...placePaths, ...entityPaths].map((path) => ({
    url: `${SITE_URL}${path}`,
  }))
}
