export const siteConfig = {
  name: 'Based CMS',
  legalName: 'David Robert Zelder',
  businessType: 'Sole Proprietorship (Einzelfirma)',
  ownerName: 'David Robert Zelder',
  url: process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://based-cms.dev',
  description:
    'Developer-first headless CMS for realtime content modeling, typed schemas, and multi-tenant SaaS workflows.',
  supportEmail: 'david@zelder.li',
  legalEmail: 'david@zelder.li',
  phone: '+41 77 432 59 24',
  address: {
    street: 'Brüelweg 11',
    postalCode: '9496',
    city: 'Balzers',
    country: 'Liechtenstein',
  },
  uid: 'CHE-379.712.697',
  uidRegistryNote:
    'UID registry details may still reference a previous address (Im Grabaton 9, 9494 Schaan).',
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

