/**
 * PII is read from server-only env vars (not NEXT_PUBLIC_*) so it stays
 * out of the client bundle. Falls back to placeholders in development.
 */
export const siteConfig = {
  name: 'Based CMS',
  legalName: process.env.SITE_LEGAL_NAME ?? 'Legal Name',
  businessType: 'Sole Proprietorship (Einzelfirma)',
  ownerName: process.env.SITE_LEGAL_NAME ?? 'Owner Name',
  url: process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://based-cms.dev',
  description:
    'Developer-first headless CMS for realtime content modeling, typed schemas, and multi-tenant SaaS workflows.',
  supportEmail: process.env.SITE_EMAIL ?? 'support@example.com',
  legalEmail: process.env.SITE_EMAIL ?? 'legal@example.com',
  phone: process.env.SITE_PHONE ?? '',
  address: {
    street: process.env.SITE_ADDRESS_STREET ?? '',
    postalCode: process.env.SITE_ADDRESS_POSTAL ?? '',
    city: process.env.SITE_ADDRESS_CITY ?? '',
    country: process.env.SITE_ADDRESS_COUNTRY ?? 'Liechtenstein',
  },
  uid: process.env.SITE_UID ?? '',
  uidRegistryNote:
    'UID registry details may still reference a previous address.',
  imprintLawReference: 'Liechtenstein ECG §5',
} as const

export const siteKeywords = [
  'headless cms for developers',
  'typescript cms',
  'realtime cms',
  'multi-tenant cms',
  'convex cms',
  'schema driven cms',
  'content api for nextjs',
  'saas content management',
] as const

