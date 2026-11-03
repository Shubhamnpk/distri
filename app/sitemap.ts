import type { MetadataRoute } from 'next'
import { companies, projects, slugify } from '@/lib/data'
import { DISTRICTS, LOCAL_UNITS, PROVINCES } from '@/lib/geo-constants'
import { SITE_URL } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    '/', '/companies', '/projects', '/economy', '/market', '/places', '/map',
    '/procurement', '/datasets', '/sources', '/environment', '/disasters', '/calendar', '/search', '/releases', '/about',
  ]
  const placePaths = [
    ...PROVINCES.map(({ slug }) => `/provinces/${slug}`),
    ...DISTRICTS.map(({ slug }) => `/districts/${slug}`),
    ...LOCAL_UNITS.map(({ district, slug }) => `/districts/${slugify(district)}/${slug}`),
  ]
  const entityPaths = [
    ...companies.map(({ name }) => `/companies/${slugify(name)}`),
    ...projects.map(({ name }) => `/projects/${slugify(name)}`),
  ]

  return [...staticPaths, ...placePaths, ...entityPaths].map((path) => ({
    url: `${SITE_URL}${path}`,
  }))
}
