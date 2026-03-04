import type { Metadata } from 'next'
import { PublicLegalLayout } from '@/components/marketing/PublicLegalLayout'
import { siteConfig } from '@/lib/site'

const faqItems = [
  {
    question: 'What makes Based CMS different from traditional CMS tools?',
    answer:
      'Based CMS is schema-first and developer-focused. You define section fields in TypeScript and use typed data directly, without code generation or custom API layers.',
  },
  {
    question: 'Does Based CMS support multi-tenant SaaS projects?',
    answer:
      'Yes. Each customer workspace is isolated by organization and project boundaries, so one deployment can safely serve many tenants.',
  },
  {
    question: 'Can I preview content before publishing?',
    answer:
      'Yes. Based CMS supports preview and production environments so you can stage edits and publish intentionally.',
  },
  {
    question: 'Do I need to run a separate backend API for content?',
    answer:
      'No. The platform is built around realtime subscriptions and typed section data, removing the need for custom REST or GraphQL glue for common CMS workflows.',
  },
  {
    question: 'Where do I store media files?',
    answer:
      'Media uploads are managed through integrated Cloudflare R2 storage, with project-scoped organization and retrieval.',
  },
  {
    question: 'How do I start integrating Based CMS?',
    answer:
      'Create a project, generate your keys, add BASED-CMS-SLUG and BASED-CMS-KEY to your app environment, and consume section data from the SDK.',
  },
] as const

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
}

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Frequently asked questions about Based CMS for developers and SaaS teams.',
  alternates: {
    canonical: '/faq',
  },
  openGraph: {
    title: `FAQ | ${siteConfig.name}`,
    description:
      'Answers to common questions about realtime, type-safe, multi-tenant CMS workflows.',
    url: '/faq',
  },
}

export default function FaqPage() {
  return (
    <PublicLegalLayout
      title="Frequently Asked Questions"
      description="Developer-focused answers about architecture, integration, and operations."
      updatedAt="March 3, 2026"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <section className="space-y-6">
        {faqItems.map((item) => (
          <div key={item.question} className="rounded-xl border border-[#1f2937] p-5">
            <h2 className="text-base font-semibold text-[#f9fafb]">
              {item.question}
            </h2>
            <p className="mt-2 text-sm leading-7 text-[#c4c8d0]">{item.answer}</p>
          </div>
        ))}
      </section>
    </PublicLegalLayout>
  )
}

