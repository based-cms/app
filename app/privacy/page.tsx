import type { Metadata } from 'next'
import { PublicLegalLayout } from '@/components/marketing/PublicLegalLayout'
import { siteConfig } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Privacy Policy for Based CMS, covering account data, usage data, cookies, and your rights.',
  alternates: {
    canonical: '/privacy',
  },
  openGraph: {
    title: `Privacy Policy | ${siteConfig.name}`,
    description:
      'How Based CMS collects, uses, and protects personal data for users and visitors.',
    url: '/privacy',
  },
}

export default function PrivacyPage() {
  return (
    <PublicLegalLayout
      title="Privacy Policy"
      description="This policy explains how personal data is processed when you use Based CMS and this website."
      updatedAt="March 3, 2026"
    >
      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">1. Controller</h2>
        <p className="mt-3">
          Controller for data processing:
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
        <h2 className="text-lg font-semibold text-[#f9fafb]">
          2. Categories of personal data
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-[#d1d5db]">
          <li>Account details (name, email address, authentication metadata)</li>
          <li>Workspace and project-related content you create in the service</li>
          <li>Technical logs (IP address, timestamps, user-agent, request metadata)</li>
          <li>Billing and subscription details (if you purchase paid plans)</li>
          <li>Support communication content when you contact us</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">3. Purposes and legal basis</h2>
        <p className="mt-3">We process personal data to:</p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-[#d1d5db]">
          <li>provide and secure the service (contract performance),</li>
          <li>operate accounts and subscriptions (contract performance),</li>
          <li>prevent abuse and maintain platform integrity (legitimate interest),</li>
          <li>comply with legal obligations such as accounting and tax law,</li>
          <li>respond to inquiries and support requests (legitimate interest).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">
          4. Processors and infrastructure
        </h2>
        <p className="mt-3">
          To deliver the service, we use trusted infrastructure and service providers
          for hosting, authentication, storage, analytics, and operational support. We
          only share data as required to provide the service and under contractual
          safeguards where required by law.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">
          5. International transfers
        </h2>
        <p className="mt-3">
          Your data may be processed in countries outside your residence country. Where
          required, we apply appropriate safeguards for international transfers.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">6. Retention periods</h2>
        <p className="mt-3">
          We retain personal data only as long as necessary for the purposes described
          in this policy, unless a longer retention period is required by law.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">7. Cookies and similar tech</h2>
        <p className="mt-3">
          We use essential cookies and similar technologies needed for authentication,
          security, and service functionality. A cookie consent banner is displayed on your
          first visit, allowing you to accept or decline non-essential cookies. Your choice
          is stored in a cookie (<code className="text-xs">bcms_cookie_consent</code>) for
          one year. You can change your preference at any time by clearing this cookie from
          your browser settings.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">8. Your rights</h2>
        <p className="mt-3">
          Depending on applicable law, you may have rights to access, rectify, erase,
          restrict, object, or request portability of your personal data, and to lodge a
          complaint with a competent supervisory authority.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">9. Security</h2>
        <p className="mt-3">
          We implement technical and organizational measures designed to protect
          personal data against unauthorized access, loss, or misuse.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#f9fafb]">10. Contact</h2>
        <p className="mt-3">
          For privacy-related inquiries and rights requests, contact:{' '}
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

