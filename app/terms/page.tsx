import type { Metadata } from 'next'
import { PublicLegalLayout } from '@/components/marketing/PublicLegalLayout'
import { siteConfig } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Terms of Use',
  description:
    'Terms of Use for Based CMS, including subscription, acceptable use, and liability terms.',
  alternates: {
    canonical: '/terms',
  },
  openGraph: {
    title: `Terms of Use | ${siteConfig.name}`,
    description:
      'Contractual terms for using Based CMS services and related website features.',
    url: '/terms',
  },
}

export default function TermsPage() {
  return (
    <PublicLegalLayout
      title="Terms of Use"
      description="These terms govern your use of the Based CMS website, accounts, and SaaS services."
      updatedAt="March 3, 2026"
    >
      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">1. Scope</h2>
        <p className="mt-3">
          These Terms of Use apply to all users of {siteConfig.name}, including free
          and paid plans, whether used for personal, professional, or business
          purposes. By creating an account or using the service, you agree to these
          terms.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">2. Provider</h2>
        <p className="mt-3">
          Service provider:
          <br />
          {siteConfig.legalName}, {siteConfig.businessType}
          <br />
          {siteConfig.address.street}, {siteConfig.address.postalCode}{' '}
          {siteConfig.address.city}, {siteConfig.address.country}
          <br />
          Email:{' '}
          <a
            href={`mailto:${siteConfig.legalEmail}`}
            className="text-[#e8aa3a] underline underline-offset-2"
          >
            {siteConfig.legalEmail}
          </a>
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">3. Accounts and access</h2>
        <p className="mt-3">
          You must provide accurate information when creating an account. You are
          responsible for all activity under your account and for maintaining the
          confidentiality of your credentials and API keys.
        </p>
        <p className="mt-3">
          We may suspend or restrict access if there is a reasonable suspicion of
          unauthorized access, abuse, security risk, or violation of these terms.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">4. Permitted use</h2>
        <p className="mt-3">You agree not to:</p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-[#d1d5db]">
          <li>use the service for unlawful or fraudulent activities,</li>
          <li>attempt to gain unauthorized access to systems or data,</li>
          <li>interfere with service stability, security, or availability,</li>
          <li>upload malware or harmful code,</li>
          <li>resell access unless expressly authorized in writing.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">
          5. Plans, billing, and renewals
        </h2>
        <p className="mt-3">
          Paid subscriptions renew automatically at the end of each billing cycle
          unless canceled before renewal. Prices, included features, and usage limits
          are as shown at checkout or in your account settings.
        </p>
        <p className="mt-3">
          Unless otherwise required by mandatory law or agreed in writing, fees are
          non-refundable for already-started billing periods.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">
          6. Intellectual property
        </h2>
        <p className="mt-3">
          The service, website, brand assets, and software components remain our
          intellectual property or that of our licensors. Subject to these terms and
          your plan, we grant you a limited, non-exclusive, non-transferable right to
          use the service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">
          7. Customer data and content
        </h2>
        <p className="mt-3">
          You retain rights to your content and data. You grant us only the rights
          necessary to host, process, back up, and transmit your data for service
          operation, security, and support.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">
          8. Availability and changes
        </h2>
        <p className="mt-3">
          We continuously improve the service and may modify, replace, or discontinue
          features. We aim for high availability but do not guarantee uninterrupted
          operation.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">
          9. Warranty and liability
        </h2>
        <p className="mt-3">
          To the extent permitted by law, the service is provided on an as-is basis.
          We are liable without limitation for intent and gross negligence, as well as
          for injury to life, body, or health. For slight negligence, liability is
          limited to breaches of essential contractual obligations and to foreseeable,
          typical damages.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">10. Term and termination</h2>
        <p className="mt-3">
          You may terminate your account at any time through your account settings or
          by contacting support. We may terminate or suspend accounts for material
          breach, abuse, or legal compliance reasons.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">
          11. Governing law and venue
        </h2>
        <p className="mt-3">
          These terms are governed by the substantive laws of Liechtenstein, excluding
          conflict-of-law provisions. If you are a consumer, mandatory consumer
          protection laws of your place of residence remain unaffected.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">12. Contact</h2>
        <p className="mt-3">
          For legal notices or questions related to these terms, contact:{' '}
          <a
            href={`mailto:${siteConfig.legalEmail}`}
            className="text-[#e8aa3a] underline underline-offset-2"
          >
            {siteConfig.legalEmail}
          </a>
          .
        </p>
      </section>
    </PublicLegalLayout>
  )
}

