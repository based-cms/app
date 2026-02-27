# PACKAGE_USAGE.md — Using `cms-client` in a Client Next.js Project

> Complete reference for integrating Better CMS into a client Next.js 16 project.
> Last updated: 2026-02-27 (v0.2.0 — single-token API)

---

## Quick Start (CLI)

The fastest way to get started:

```bash
npx create-better-cms my-project
cd my-project
pnpm install
# Add your token from the CMS dashboard to .env.local
pnpm dev
```

---

## Installation (Manual)

```bash
npm install cms-client convex
# or
pnpm add cms-client convex
```

---

## Environment Setup

Get your token from the CMS dashboard (Project Settings → Generate Token).
Add to your `.env.local`:

```bash
NEXT_PUBLIC_BETTER_CMS_TOKEN=bcms_...
```

The token contains your Convex URL, org slug, and registration key — all encoded in one value.
No other env vars are needed.

---

## Quick Start (Manual)

### 1. Create the CMS client

```ts
// lib/cms.ts
import { createCMSClient } from 'cms-client'

export const cms = createCMSClient({
  token: process.env.NEXT_PUBLIC_BETTER_CMS_TOKEN!,
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

export const heroSection = defineCMSSection({
  name: 'hero',
  label: 'Hero Section',
  fields: {
    heading:    z.string().label('Heading'),
    subheading: z.string().optional().label('Subheading'),
    image:      z.image().label('Hero Image'),
    ctaText:    z.string().optional().label('CTA Button Text'),
    ctaLink:    z.string().optional().label('CTA Link'),
  }
})
```

### 3. Add the CMSProvider and register sections (layout.tsx)

```tsx
// components/providers.tsx
'use client'
import { CMSProvider } from 'cms-client'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CMSProvider token={process.env.NEXT_PUBLIC_BETTER_CMS_TOKEN!}>
      {children}
    </CMSProvider>
  )
}
```

```tsx
// app/layout.tsx — Server Component
import { cms } from '@/lib/cms'
import { teamSection, heroSection } from '@/lib/sections'
import { Providers } from '@/components/providers'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await cms.registerSections([teamSection, heroSection])

  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
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
  token: string,                        // NEXT_PUBLIC_BETTER_CMS_TOKEN
  env?: 'production' | 'preview',       // default: 'production'
})
```

Returns a `CMSClient` object with `registerSections` and `useSection`.

---

### `CMSProvider`

React component that wraps your app with the Convex provider. Required for `useSection` to work.

```tsx
<CMSProvider token={process.env.NEXT_PUBLIC_BETTER_CMS_TOKEN!}>
  {children}
</CMSProvider>
```

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
await cms.registerSections([teamSection, heroSection])
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

## Token Format

The token is a `bcms_` prefixed Base64-encoded JSON string containing:
- `v` — version (currently `1`)
- `url` — Convex deployment URL
- `slug` — org slug
- `key` — registration secret (UUID)

For advanced use cases, you can decode it:

```ts
import { decodeToken } from 'cms-client'

const { url, slug, key } = decodeToken(process.env.NEXT_PUBLIC_BETTER_CMS_TOKEN!)
```

---

## Production vs Preview Content

Content in the CMS has two environments: `production` and `preview`.

By default, `useSection` reads from `production`. To read from `preview`:

```ts
const cms = createCMSClient({
  token: process.env.NEXT_PUBLIC_BETTER_CMS_TOKEN!,
  env: 'preview',
})
```

Tip: Use an environment variable to switch:
```ts
env: process.env.NEXT_PUBLIC_CMS_ENV === 'preview' ? 'preview' : 'production'
```

---

## Frequently Asked Questions

**Q: Do I need to create a separate Convex project?**
No. Your Next.js project connects to the CMS's Convex deployment directly. Everything is
encoded in the `NEXT_PUBLIC_BETTER_CMS_TOKEN`.

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
