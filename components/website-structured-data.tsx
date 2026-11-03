import { SITE_URL } from '@/lib/site'

const websiteData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: `${SITE_URL}/`,
  name: 'Drishti',
  alternateName: 'Drishti Nepal',
  description: 'Open public data and civic intelligence for Nepal.',
}

export function WebsiteStructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteData).replace(/</g, '\\u003c') }}
    />
  )
}
