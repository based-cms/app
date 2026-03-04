import type { Metadata } from 'next'
import { PublicLegalLayout } from '@/components/marketing/PublicLegalLayout'
import { siteConfig } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contact Based CMS for support, legal notices, security reports, and partnership inquiries.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: `Contact | ${siteConfig.name}`,
    description:
      'Support and legal contact details for Based CMS users and business inquiries.',
    url: '/contact',
  },
}

export default function ContactPage() {
  return (
    <PublicLegalLayout
      title="Contact"
      description="Use the contact options below for support, legal communication, or partnership requests."
      updatedAt="March 3, 2026"
    >
      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">General and support</h2>
        <p className="mt-3">
          Email:{' '}
          <a
            href={`mailto:${siteConfig.supportEmail}`}
            className="text-[#e8aa3a] underline underline-offset-2"
          >
            {siteConfig.supportEmail}
          </a>
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">Legal notices</h2>
        <p className="mt-3">
          For legal communications (including contract and privacy matters), email:{' '}
          <a
            href={`mailto:${siteConfig.legalEmail}`}
            className="text-[#e8aa3a] underline underline-offset-2"
          >
            {siteConfig.legalEmail}
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">Phone</h2>
        <p className="mt-3">
          <a
            href={`tel:${siteConfig.phone.replace(/\s+/g, '')}`}
            className="text-[#e8aa3a] underline underline-offset-2"
          >
            {siteConfig.phone}
          </a>
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">Postal address</h2>
        <p className="mt-3">
          {siteConfig.legalName}
          <br />
          {siteConfig.address.street}
          <br />
          {siteConfig.address.postalCode} {siteConfig.address.city}
          <br />
          {siteConfig.address.country}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">Security reports</h2>
        <p className="mt-3">
          If you believe you found a security issue, email details to{' '}
          <a
            href={`mailto:${siteConfig.supportEmail}`}
            className="text-[#e8aa3a] underline underline-offset-2"
          >
            {siteConfig.supportEmail}
          </a>{' '}
          and include steps to reproduce, impact, and timeline.
        </p>
      </section>
    </PublicLegalLayout>
  )
}

