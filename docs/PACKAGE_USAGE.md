# PACKAGE_USAGE.md — Using `cms-client` in a Client Next.js Project

> Complete reference for integrating Better CMS into a client Next.js 16 project.
> Last updated: 2026-02-27 (Phase 0 — API finalized in Phase 5)

---

## Installation

```bash
npm install cms-client convex
# or
pnpm add cms-client convex
```

> The package name will be updated to `@[name]/cms` before publishing.
> Until then, use the local workspace path or a pre-release npm package.

---

## Quick Start

### 1. Create the CMS client (one-time setup)

```ts
// lib/cms.ts
import { createCMSClient } from 'cms-client'

export const cms = createCMSClient({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  orgSlug: 'kunde-ag',  // matches the slug in your CMS project settings
})
```

### 2. Define your content sections

```ts
// lib/sections.ts
import { defineCMSSection, z } from 'cms-client'

export const teamSection = defineCMSSection({
  name: 'team',
  label: 'Team Members',
  fields: {
    name:  z.string().label('Full Name'),
    role:  z.string().label('Role'),
    bio:   z.string().optional().label('Bio'),
    image: z.image().label('Profile Photo'),
    order: z.number().default(0),
  }
})

export const faqSection = defineCMSSection({
  name: 'faq',
  label: 'FAQ',
  fields: {
    question: z.string().label('Question'),
    answer:   z.string().multiline().label('Answer'),
  }
})

export const heroSection = defineCMSSection({
  name: 'hero',
  label: 'Hero Section',
  fields: {
    headline:    z.string().label('Headline'),
    subheadline: z.string().optional().label('Subheadline'),
    ctaText:     z.string().label('CTA Button Text'),
    ctaUrl:      z.string().label('CTA URL'),
    image:       z.image().label('Hero Image'),
  }
})
```

### 3. Register sections on boot (layout.tsx)

```tsx
// app/layout.tsx — Server Component
import { cms } from '@/lib/cms'
import { teamSection, faqSection, heroSection } from '@/lib/sections'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Writes section definitions to section_registry in CMS
  // CMS immediately renders correct forms — zero manual setup needed
  await cms.registerSections([teamSection, faqSection, heroSection])

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

> `registerSections` is idempotent. It upserts the registry — safe to call on every boot.

### 4. Use realtime data in pages

```tsx
// app/team/page.tsx — Client Component
'use client'
import { cms } from '@/lib/cms'
import { teamSection } from '@/lib/sections'

export default function TeamPage() {
  const team = cms.useSection(teamSection)
  // → { name: string; role: string; bio?: string; image: string; order: number }[]
  // Updates live whenever content is edited in the CMS

  if (!team) return <div>Loading...</div>

  return (
    <ul>
      {team
        .sort((a, b) => a.order - b.order)
        .map((member, i) => (
          <li key={i}>
            <img src={member.image} alt={member.name} />
            <h2>{member.name}</h2>
            <p>{member.role}</p>
            {member.bio && <p>{member.bio}</p>}
          </li>
        ))}
    </ul>
  )
}
```

---

## API Reference

### `createCMSClient(options)`

Creates the CMS client. Call once per project.

```ts
const cms = createCMSClient({
  convexUrl: string,  // your Convex deployment URL
  orgSlug: string,    // your project slug (set in CMS project settings)
})
```

Returns a `CMSClient` object with `registerSections` and `useSection`.

---

### `defineCMSSection(definition)`

Defines a content section with typed fields.

```ts
const mySection = defineCMSSection({
  name: string,    // unique identifier, e.g. "team"
  label: string,   // human-readable label shown in CMS, e.g. "Team Members"
  fields: {
    [fieldName]: FieldDefinition,
  }
})
```

Returns a `CMSSection` object. The return type of `useSection` is inferred from `fields`.

---

### `z` — Field Type Helpers

| Helper | TypeScript type | CMS form input |
|--------|----------------|----------------|
| `z.string()` | `string` | Text input |
| `z.string().optional()` | `string \| undefined` | Text input (optional) |
| `z.string().multiline()` | `string` | Textarea |
| `z.string().label('...')` | `string` | Text input with custom label |
| `z.number()` | `number` | Number input |
| `z.number().default(0)` | `number` | Number input with default |
| `z.boolean()` | `boolean` | Toggle/checkbox |
| `z.image()` | `string` | Image upload → R2 URL |

Modifiers can be chained: `z.string().optional().label('Bio').multiline()`

---

### `cms.registerSections(sections)`

Writes section schema definitions to Convex. Must be called in a **Server Component** or
**Server Action**.

```ts
await cms.registerSections([teamSection, faqSection])
```

- **Idempotent**: Safe to call on every app boot. Uses upsert semantics.
- **Immediate effect**: CMS reflects section changes within seconds of boot.
- No return value (void).

---

### `cms.useSection(section)`

React hook that returns realtime content for a section.

```ts
const items = cms.useSection(teamSection)
// → InferSectionType<typeof teamSection>[] | undefined
```

- Returns `undefined` while loading (use a loading state)
- Returns `[]` if no content has been added yet
- Updates automatically when content is edited in CMS (no polling, no page reload)
- **No auth required** — works in public pages

---

## TypeScript Types

```ts
import type { CMSSection, CMSClient, InferSectionType } from 'cms-client'

// Get the item type for a section
type TeamMember = InferSectionType<typeof teamSection>
// → { name: string; role: string; bio?: string; image: string; order: number }
```

---

## Environment Setup

Add to your `.env.local`:

```bash
NEXT_PUBLIC_CONVEX_URL=https://<your-cms-convex-deployment>.convex.cloud
```

> Use the **same** Convex URL as the CMS. Client projects connect directly to the CMS's
> Convex deployment — there is no separate Convex project for client projects.

---

## Production vs Preview Content

Content in the CMS has two environments: `production` and `preview`.

By default, `useSection` reads from `production`. To read from `preview`:

```ts
const cms = createCMSClient({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  orgSlug: 'kunde-ag',
  env: 'preview',  // default: 'production'
})
```

Tip: Use an environment variable to switch:
```ts
env: process.env.NEXT_PUBLIC_CMS_ENV === 'preview' ? 'preview' : 'production'
```

---

## Frequently Asked Questions

**Q: Do I need to create a separate Convex project?**
No. Your Next.js project connects to the CMS's Convex deployment directly. You only need the
`NEXT_PUBLIC_CONVEX_URL` environment variable.

**Q: What happens if I add a new field to a section?**
Call `registerSections` again (it happens automatically on next boot). The CMS will show the
new field in its forms. Existing content items won't have the new field value — they'll get
`undefined` for optional fields or the default for fields with `.default(...)`.

**Q: Can I have multiple sections of the same type on different pages?**
Not currently. Each section type (`name`) maps to one content document. If you need page-specific
content, create distinct sections: `homeHeroSection`, `aboutHeroSection`, etc.

**Q: Is `useSection` compatible with SSR?**
`useSection` is a client-side React hook (it uses Convex's realtime subscription). For SSR,
use `cms.getSection(section)` — a Server Component helper that returns a Promise.
*(Note: `getSection` is a Phase 5 stretch goal — check implementation status in PLAN.md)*
