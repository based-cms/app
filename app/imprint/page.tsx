import type { Metadata } from 'next'
import { PublicLegalLayout } from '@/components/marketing/PublicLegalLayout'
import { siteConfig } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Imprint',
  description:
    'Legal notice for Based CMS in accordance with Liechtenstein ECG §5.',
  alternates: {
    canonical: '/imprint',
  },
  openGraph: {
    title: `Imprint | ${siteConfig.name}`,
    description:
      'Legal provider information for Based CMS according to Liechtenstein ECG §5.',
    url: '/imprint',
  },
}

export default function ImprintPage() {
  return (
    <PublicLegalLayout
      title="Imprint (Legal Notice)"
      description="Provider identification and legal contact details for Based CMS."
      updatedAt="March 3, 2026"
    >
      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">Provider information</h2>
        <p className="mt-3">
          This legal notice is provided pursuant to {siteConfig.imprintLawReference}.
        </p>
        <p className="mt-3">
          <strong>{siteConfig.legalName}</strong>
          <br />
          {siteConfig.businessType}
          <br />
          {siteConfig.address.street}
          <br />
          {siteConfig.address.postalCode} {siteConfig.address.city}
          <br />
          {siteConfig.address.country}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">Contact</h2>
        <p className="mt-3">
          Email:{' '}
          <a
            href={`mailto:${siteConfig.legalEmail}`}
            className="text-[#e8aa3a] underline underline-offset-2"
          >
            {siteConfig.legalEmail}
          </a>
          <br />
          Phone:{' '}
          <a
            href={`tel:${siteConfig.phone.replace(/\s+/g, '')}`}
            className="text-[#e8aa3a] underline underline-offset-2"
          >
            {siteConfig.phone}
          </a>
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">Tax identification</h2>
        <p className="mt-3">
          UID / VAT number: {siteConfig.uid}
          <br />
          <span className="text-[#9ca3af]">{siteConfig.uidRegistryNote}</span>
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">
          Responsible for website content
        </h2>
        <p className="mt-3">{siteConfig.ownerName}</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">
          Liability for own content and links
        </h2>
        <p className="mt-3">
          We are responsible for our own content on this website under applicable law.
          Despite careful review, we assume no liability for external content on third
          party websites linked from this site. Responsibility for linked content lies
          solely with the operators of those websites.
        </p>
      </section>
    </PublicLegalLayout>
  )
}

