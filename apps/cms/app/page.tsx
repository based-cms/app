import Link from 'next/link'

const features = [
  {
    title: 'Type-safe sections',
    description:
      'Define your content schema with defineCMSSection and get full TypeScript inference. No manual types, no codegen step.',
    icon: '{ }',
  },
  {
    title: 'Realtime updates',
    description:
      'Content flows through Convex subscriptions. Edit in the CMS, see it live instantly — no polling, no webhooks, no deploy.',
    icon: '⚡',
  },
  {
    title: 'Multi-tenant',
    description:
      'Each client org is fully isolated via Clerk Organizations. One deployment serves every project.',
    icon: '◈',
  },
  {
    title: 'Media management',
    description:
      'Upload images, videos, and documents to R2 storage. Browse by folder, pick from a dialog, paste a URL — your call.',
    icon: '▣',
  },
]

const codeExample = `import { defineCMSSection, z } from 'cms-client'

const hero = defineCMSSection({
  name: 'hero',
  label: 'Hero Section',
  fields: {
    title: z.string(),
    subtitle: z.string().multiline(),
    image: z.image(),
    ctaText: z.string().optional(),
  },
})`

export default function Home() {
  return (
    <div className="dark min-h-screen bg-[#09090b] text-[#fafafa] selection:bg-white/20">
      {/* ─── Nav ───────────────────────────────────────────────── */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-[13px] font-bold text-[#09090b]">
              B
            </span>
            Better CMS
          </Link>
          <div className="flex items-center gap-5">
            <Link
              href="/sign-in"
              className="text-sm text-[#a1a1aa] transition-colors hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/sign-in"
              className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-[#09090b] transition-colors hover:bg-[#e4e4e7]"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ──────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center px-6 pt-36 pb-24 text-center">
        {/* Subtle radial glow */}
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[480px] w-[720px] rounded-full opacity-[0.07]"
          style={{
            background:
              'radial-gradient(ellipse at center, white 0%, transparent 70%)',
          }}
        />
        <div className="relative">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-xs tracking-wide text-[#a1a1aa]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Now in public beta
          </p>
          <h1 className="mx-auto max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
            The headless CMS
            <br />
            <span className="text-[#71717a]">that types itself.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-[#a1a1aa] sm:text-lg">
            Define sections in TypeScript. Get a fully-typed, realtime CMS dashboard — no REST API, no schema duplication, no deploys to see changes.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-[#09090b] transition-colors hover:bg-[#e4e4e7]"
            >
              Start building
            </Link>
            <span className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 font-mono text-sm text-[#a1a1aa]">
              npx create-better-cms
            </span>
          </div>
        </div>
      </section>

      {/* ─── Features ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]"
            >
              <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] font-mono text-sm text-[#a1a1aa]">
                {f.icon}
              </span>
              <h3 className="mb-1.5 text-base font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-[#71717a]">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Code Example ──────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[#71717a]">
              Define once, use everywhere
            </p>
            <h2 className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Your schema is the source of truth.
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-[#a1a1aa]">
              Write a section definition in your Next.js project. The CMS reads the schema and generates the editing UI automatically. Types flow end-to-end — from definition to <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs">useSection()</code> hook.
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#0c0c0e]">
            <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-white/[0.08]" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/[0.08]" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/[0.08]" />
              <span className="ml-3 text-xs text-[#52525b]">sections.ts</span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-[1.7] text-[#a1a1aa]">
              <code>{codeExample}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────── */}
      <section className="border-t border-white/[0.06] py-24 text-center">
        <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
          Ready to get started?
        </h2>
        <p className="mb-8 text-sm text-[#71717a]">
          Scaffold a project in seconds. Free while in beta.
        </p>
        <Link
          href="/sign-in"
          className="inline-block rounded-lg bg-white px-8 py-3 text-sm font-medium text-[#09090b] transition-colors hover:bg-[#e4e4e7]"
        >
          Create your first project
        </Link>
      </section>

      {/* ─── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-8 text-center text-xs text-[#52525b]">
        Better CMS — Built with Next.js, Convex & Clerk
      </footer>
    </div>
  )
}
