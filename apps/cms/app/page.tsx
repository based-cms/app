import Link from 'next/link'
import { AnimateIn } from '@/components/landing/AnimateIn'

/* ═══════════════════════════════════════════════════════════
   Syntax highlighting — server-side, zero dependencies
   ═══════════════════════════════════════════════════════════ */

type TokenType = 'kw' | 'str' | 'cmt' | 'plain'

const TOKEN_COLORS: Record<TokenType, string> = {
  kw: 'text-[#e8aa3a]',
  str: 'text-[#a5d6a7]',
  cmt: 'text-[#505050]',
  plain: 'text-[#8a8a8a]',
}

function tokenize(code: string) {
  const tokens: Array<{ text: string; type: TokenType }> = []
  const regex =
    /(\/\/[^\n]*)|(\b(?:import|from|export|const|function|return|if|null|type|of|let|new)\b)|('(?:[^'\\]|\\.)*')/g
  let lastIndex = 0
  let match
  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex)
      tokens.push({ text: code.slice(lastIndex, match.index), type: 'plain' })
    if (match[1]) tokens.push({ text: match[1], type: 'cmt' })
    else if (match[2]) tokens.push({ text: match[2], type: 'kw' })
    else if (match[3]) tokens.push({ text: match[3], type: 'str' })
    lastIndex = regex.lastIndex
  }
  if (lastIndex < code.length)
    tokens.push({ text: code.slice(lastIndex), type: 'plain' })
  return tokens
}

function SyntaxCode({ code }: { code: string }) {
  const tokens = tokenize(code)
  return (
    <pre className="overflow-x-auto font-mono text-[13px] leading-[1.9]">
      <code>
        {tokens.map((t, i) => (
          <span key={i} className={TOKEN_COLORS[t.type]}>
            {t.text}
          </span>
        ))}
      </code>
    </pre>
  )
}

/* ═══════════════════════════════════════════════════════════
   Divider
   ═══════════════════════════════════════════════════════════ */

function Divider({ label, gold }: { label?: string; gold?: boolean }) {
  const color = gold ? 'bg-[#e8aa3a]/30' : 'bg-[#1a1a1a]'
  const h = gold ? 'h-[2px]' : 'h-px'
  return (
    <div className="mx-auto max-w-[1100px] px-6 md:px-10">
      <div className="flex items-center gap-6">
        <div className={`${h} flex-1 ${color}`} />
        {label && (
          <span className="font-mono text-[11px] tracking-wider text-[#2a2a2a]">
            {label}
          </span>
        )}
        <div className={`${h} flex-1 ${color}`} />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Data
   ═══════════════════════════════════════════════════════════ */

const defineCode = `import { defineCMSSection, z } from 'cms-client'

export const hero = defineCMSSection({
  name: 'hero',
  label: 'Hero Section',
  fields: {
    title:    z.string(),
    subtitle: z.string().multiline(),
    image:    z.image(),
    ctaText:  z.string().optional(),
  },
})`

const useCode = `import { useSection } from 'cms-client/react'
import { hero } from '@/cms/sections'

export function Hero() {
  const items = useSection(hero)
  //    ^? { title: string; subtitle: string;
  //         image: string; ctaText?: string }[]

  const data = items?.[0]
  if (!data) return null

  return (
    <section>
      <h1>{data.title}</h1>
      <p>{data.subtitle}</p>
    </section>
  )
}`

const FEATURES = [
  {
    num: '01',
    title: 'REALTIME',
    desc: 'Content flows through Convex subscriptions. Edit in the CMS, see it live in your app. No polling, no webhooks, no cache to bust.',
  },
  {
    num: '02',
    title: 'TYPE-SAFE',
    desc: 'Define fields with z.string(), z.image(), z.boolean(). TypeScript infers the return type of useSection() automatically. Zero codegen.',
  },
  {
    num: '03',
    title: 'TWO ENV VARS',
    desc: 'BASED-CMS-SLUG and BASED-CMS-KEY. That is the entire configuration for a client project. No API routes, no config files.',
  },
  {
    num: '04',
    title: 'MULTI-TENANT',
    desc: 'Each client is a Clerk Organization. One deployment serves every project. Data isolation is baked into every query.',
  },
  {
    num: '05',
    title: 'DUAL ENV',
    desc: 'Toggle between preview and production in the CMS header. Stage content before publishing. Same deployment, separate data lanes.',
  },
  {
    num: '06',
    title: 'R2 STORAGE',
    desc: 'Upload images, videos, and documents to Cloudflare R2. Organize in folders, pick from a dialog. Built-in, not bolted on.',
  },
]

const FEATURE_DELAYS = [
  '',
  'animate-delay-75',
  'animate-delay-100',
  'animate-delay-150',
  'animate-delay-200',
  'animate-delay-300',
]

const OLD_WAY = [
  'REST API endpoints',
  'GraphQL resolvers',
  'Webhook handlers',
  'Cache invalidation',
  'Manual type definitions',
  'Schema duplication',
  'Build-step codegen',
  'Deploy to see changes',
]

const BETTER_WAY = [
  'One useSection() hook',
  'Direct Convex subscriptions',
  'Realtime by default',
  'No cache layer',
  'Types inferred from schema',
  'Single source of truth',
  'Zero codegen',
  'Instant preview',
]

/* ═══════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════ */

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#e8e8e8] selection:bg-[#e8aa3a]/20">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 z-50 w-full bg-[#050505]/60 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-6 md:px-10">
          <Link
            href="/"
            className="flex items-center gap-3 text-sm font-medium tracking-tight"
          >
            <span className="flex h-8 w-8 items-center justify-center bg-[#e8aa3a] text-[13px] font-bold text-[#050505]">
              B
            </span>
            Based CMS
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/sign-in"
              className="text-sm text-[#666] transition-colors hover:text-[#e8e8e8]"
            >
              Sign in
            </Link>
            <Link
              href="/sign-in"
              className="bg-[#e8e8e8] px-4 py-1.5 text-sm font-medium text-[#050505] transition-colors hover:bg-[#e8aa3a]"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="px-6 pt-36 pb-20 md:px-10 md:pt-48 md:pb-28">
        <div className="mx-auto max-w-[1100px]">
          <div className="animate-fade-in mb-8 inline-flex items-center gap-2.5 text-xs tracking-wide text-[#555]">
            <span className="h-1.5 w-1.5 animate-pulse bg-emerald-400" />
            Public beta
          </div>

          <h1 className="animate-fade-in-up animate-duration-700 text-5xl font-extrabold leading-[0.88] tracking-[-0.04em] sm:text-6xl md:text-7xl lg:text-[5.5rem] xl:text-[7rem]">
            The CMS
            <br />
            that types
            <br />
            <span className="text-[#e8aa3a]">itself.</span>
          </h1>

          <p className="animate-fade-in-up animate-duration-700 animate-delay-200 mt-10 max-w-md text-[15px] leading-[1.7] text-[#666] md:mt-14 md:text-base">
            Define your content sections in TypeScript. The CMS reads your
            schema and generates the editing UI. Types flow end-to-end — from
            definition to hook. No REST API. No codegen. No deploys.
          </p>

          <div className="animate-fade-in-up animate-duration-700 animate-delay-300 mt-8 flex items-center gap-2 font-mono text-sm text-[#555]">
            <span className="text-[#e8aa3a]">$</span>
            <span>npx create-based-cms</span>
            <span className="animate-blink text-[#e8aa3a]">_</span>
          </div>
        </div>
      </section>

      <Divider gold />

      {/* ── Code ────────────────────────────────────────────── */}
      <section className="px-6 py-24 md:px-10 md:py-32">
        <div className="mx-auto max-w-[1100px]">
          <AnimateIn>
            <p className="mb-2 font-mono text-[11px] tracking-[0.2em] text-[#444] uppercase">
              01 — Define &amp; consume
            </p>
            <h2 className="mb-14 text-2xl font-bold tracking-tight md:text-3xl">
              Your schema is the source of truth.
            </h2>
          </AnimateIn>

          <div className="grid gap-px bg-[#1a1a1a] md:grid-cols-2">
            <AnimateIn className="bg-[#050505]">
              <div className="px-5 pt-4 pb-0">
                <span className="font-mono text-[11px] text-[#333]">
                  sections.ts
                </span>
              </div>
              <div className="p-5 pt-3">
                <SyntaxCode code={defineCode} />
              </div>
            </AnimateIn>
            <AnimateIn delay="animate-delay-150" className="bg-[#050505]">
              <div className="px-5 pt-4 pb-0">
                <span className="font-mono text-[11px] text-[#333]">
                  Hero.tsx
                </span>
              </div>
              <div className="p-5 pt-3">
                <SyntaxCode code={useCode} />
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      <Divider label="02" />

      {/* ── Features ────────────────────────────────────────── */}
      <section className="px-6 py-24 md:px-10 md:py-32">
        <div className="mx-auto max-w-[1100px]">
          <AnimateIn>
            <p className="mb-2 font-mono text-[11px] tracking-[0.2em] text-[#444] uppercase">
              02 — What you get
            </p>
            <h2 className="mb-14 text-2xl font-bold tracking-tight md:text-3xl">
              Everything you need. Nothing you don&apos;t.
            </h2>
          </AnimateIn>

          <div className="border-t border-[#1a1a1a]">
            {FEATURES.map((f, i) => (
              <AnimateIn key={f.num} delay={FEATURE_DELAYS[i]}>
                <div className="grid gap-2 border-b border-[#1a1a1a] py-6 transition-colors hover:bg-[#0a0a0a] md:grid-cols-[3rem_10rem_1fr] md:items-baseline md:gap-8 md:px-4">
                  <span className="hidden font-mono text-sm text-[#2a2a2a] md:block">
                    {f.num}
                  </span>
                  <span className="font-mono text-xs font-medium tracking-[0.15em] text-[#e8aa3a]">
                    {f.title}
                  </span>
                  <p className="text-sm leading-[1.7] text-[#666]">{f.desc}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      <Divider label="03" />

      {/* ── Comparison ──────────────────────────────────────── */}
      <section className="px-6 py-24 md:px-10 md:py-32">
        <div className="mx-auto max-w-[1100px]">
          <AnimateIn>
            <p className="mb-2 font-mono text-[11px] tracking-[0.2em] text-[#444] uppercase">
              03 — What dies
            </p>
            <h2 className="mb-14 text-2xl font-bold tracking-tight md:text-3xl">
              What you don&apos;t need anymore.
            </h2>
          </AnimateIn>

          <AnimateIn>
            <div className="grid gap-px bg-[#1a1a1a] md:grid-cols-2">
              <div className="bg-[#050505] p-8 md:p-10">
                <p className="mb-8 font-mono text-[11px] tracking-[0.15em] text-[#2a2a2a] uppercase">
                  Before
                </p>
                <ul className="space-y-3.5">
                  {OLD_WAY.map((item) => (
                    <li
                      key={item}
                      className="text-sm text-[#3a3a3a] line-through decoration-[#2a2a2a]"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-[#050505] p-8 md:p-10">
                <p className="mb-8 font-mono text-[11px] tracking-[0.15em] text-[#e8aa3a]/50 uppercase">
                  After
                </p>
                <ul className="space-y-3.5">
                  {BETTER_WAY.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3 text-sm text-[#888]"
                    >
                      <span className="text-xs text-[#e8aa3a]">/</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      <Divider label="04" />

      {/* ── Philosophy ──────────────────────────────────────── */}
      <section className="px-6 py-24 md:px-10 md:py-32">
        <div className="mx-auto max-w-[1100px]">
          <AnimateIn animation="animate-fade-in animate-duration-1000">
            <div className="mx-auto max-w-xl">
              <p className="mb-2 font-mono text-[11px] tracking-[0.2em] text-[#444] uppercase">
                04 — Philosophy
              </p>
              <h2 className="mb-8 text-2xl font-bold tracking-tight md:text-3xl">
                Content. Nothing else.
              </h2>
              <p className="text-[15px] leading-[1.8] text-[#555]">
                Based CMS doesn&apos;t manage your pages, your routes, or your
                SEO. It doesn&apos;t have a page builder, a theme engine, or a
                plugin marketplace. It does one thing: structured content,
                delivered in realtime, with types you didn&apos;t have to write.
                Everything else is your code, your way.
              </p>
            </div>
          </AnimateIn>
        </div>
      </section>

      <Divider gold />

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className="bg-dot-grid relative px-6 py-32 text-center md:px-10 md:py-44">
        <div className="relative mx-auto max-w-[1100px]">
          <AnimateIn animation="animate-fade-in-up animate-duration-700">
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Are you ready
              <br />
              <span className="text-[#e8aa3a]">to be based?</span>
            </h2>
          </AnimateIn>

          <AnimateIn delay="animate-delay-200">
            <div className="mx-auto mt-10 flex w-fit items-center gap-2 border border-[#1a1a1a] bg-[#0a0a0a] px-6 py-4 font-mono text-sm text-[#666]">
              <span className="text-[#e8aa3a]">$</span>
              npx create-based-cms
              <span className="animate-blink ml-0.5 text-[#e8aa3a]">_</span>
            </div>
          </AnimateIn>

          <AnimateIn delay="animate-delay-300">
            <p className="mt-6 text-sm text-[#333]">Free while in beta.</p>
            <Link
              href="/sign-in"
              className="mt-6 inline-block bg-[#e8e8e8] px-8 py-3 text-sm font-medium text-[#050505] transition-colors hover:bg-[#e8aa3a]"
            >
              Get started
            </Link>
          </AnimateIn>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-[#1a1a1a] py-8 text-center text-xs text-[#2a2a2a]">
        Based CMS &mdash; Next.js, Convex &amp; Clerk
      </footer>
    </div>
  )
}
