import Link from 'next/link'
import type { ReactNode } from 'react'
import { siteConfig } from '@/lib/site'

type PublicLegalLayoutProps = {
  title: string
  description: string
  updatedAt: string
  children: ReactNode
}

const legalLinks = [
  { href: '/imprint', label: 'Imprint' },
  { href: '/terms', label: 'Terms of Use' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/contact', label: 'Contact' },
  { href: '/faq', label: 'FAQ' },
]

export function PublicLegalLayout({
  title,
  description,
  updatedAt,
  children,
}: PublicLegalLayoutProps) {
  return (
    <div className="min-h-screen bg-[#050505] text-[#e8e8e8]">
      <header className="border-b border-[#1a1a1a]">
        <div className="mx-auto flex h-16 w-full max-w-[960px] items-center justify-between px-6">
          <Link href="/" className="text-sm font-medium tracking-tight">
            {siteConfig.name}
          </Link>
          <Link
            href="/sign-in"
            className="text-xs uppercase tracking-[0.18em] text-[#666] transition-colors hover:text-[#e8aa3a]"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[960px] px-6 py-16 md:py-20">
        <p className="font-mono text-[11px] tracking-[0.18em] text-[#555] uppercase">
          Legal
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[#8a8a8a]">
          {description}
        </p>
        <p className="mt-3 text-xs text-[#666]">Last updated: {updatedAt}</p>

        <article className="mt-10 space-y-8 text-sm leading-7 text-[#d1d5db]">
          {children}
        </article>
      </main>

      <footer className="border-t border-[#1a1a1a] py-8">
        <div className="mx-auto flex w-full max-w-[960px] flex-wrap items-center justify-between gap-4 px-6">
          <p className="text-xs text-[#555]">
            {siteConfig.legalName} - {siteConfig.businessType}
          </p>
          <nav className="flex flex-wrap items-center gap-3 text-xs text-[#777]">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-[#e8aa3a]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  )
}

