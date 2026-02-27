# PACKAGE_USAGE.md — Using `cms-client` in a Client Next.js Project

> Complete reference for integrating Better CMS into a client Next.js 16 project.
> Last updated: 2026-02-27 (Phase 5 complete — actual implementation)

---

## Quick Start (CLI)

The fastest way to get started:

```bash
npx create-better-cms my-project
cd my-project
pnpm install
pnpm dev
```

The CLI prompts for your credentials and writes `.env.local` for you.

---

## Installation (Manual)

```bash
npm install cms-client convex
# or
pnpm add cms-client convex
```

---

## Environment Setup

Get your credentials from the CMS dashboard → your project → Package Setup.

Add to your `.env.local`:

```bash
BETTER-CMS-SLUG=my-project          # your project's public slug
BETTER-CMS-KEY=bcms_test-...        # test key (use bcms_live-... for production)
```

**Key format**: `bcms_<test|live>-<base64(deploymentName.SECRET)>`

- `test` key → preview environment content
- `live` key → production environment content

---

## Setup (Manual)

### 1. Parse the key and create the CMS client

```ts
// lib/cms.ts
import { createCMSClient } from 'cms-client'

export const cms = createCMSClient({
  key: process.env['BETTER-CMS-KEY']!,
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

### 3. Add CMSProvider and register sections

```tsx
// components/providers.tsx
'use client'
import { CMSProvider } from 'cms-client/react'

export function Providers({
  slug,
  convexUrl,
  env,
  children,
}: {
  slug: string
  convexUrl: string
  env: 'production' | 'preview'
  children: React.ReactNode
}) {
  return (
    <CMSProvider slug={slug} convexUrl={convexUrl} env={env}>
      {children}
    </CMSProvider>
  )
}
```

```tsx
// app/layout.tsx — Server Component
import { parseKey } from 'cms-client'
import { cms } from '@/lib/cms'
import { teamSection, heroSection } from '@/lib/sections'
import { Providers } from '@/components/providers'

const slug = process.env['BETTER-CMS-SLUG']!
const parsed = parseKey(process.env['BETTER-CMS-KEY']!)

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Register sections on every server boot — idempotent
  await cms.registerSections([teamSection, heroSection])

  return (
    <html lang="en">
      <body>
        <Providers
          slug={slug}
          convexUrl={parsed.convexUrl}
          env={parsed.env === 'live' ? 'production' : 'preview'}
        >
          {children}
        </Providers>
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
import { useSection } from 'cms-client/react'
import { teamSection } from '@/lib/sections'

export default function TeamPage() {
  const team = useSection(teamSection)
  // → { name: string; role: string; bio?: string; image: string; order: number }[]
  //      (undefined while loading)

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

### `createCMSClient(options)` — `cms-client`

Creates the server-side CMS client. Call once per project.

```ts
import { createCMSClient } from 'cms-client'

const cms = createCMSClient({
  key: string,   // BETTER-CMS-KEY
})
```

Returns `{ registerSections }`. **Server-side only** — do not import in client components.

---

### `parseKey(key)` — `cms-client`

Parses a `bcms_` key into its parts. Useful for extracting the Convex URL and environment.

```ts
import { parseKey } from 'cms-client'

const parsed = parseKey(process.env['BETTER-CMS-KEY']!)
// parsed.env          → 'test' | 'live'
// parsed.deploymentName → 'elated-tapir-331'
// parsed.secret       → '...' (registration token)
// parsed.convexUrl    → 'https://elated-tapir-331.eu-west-1.convex.cloud'
```

---

### `buildKey(env, deploymentName, secret)` — `cms-client`

Builds a `bcms_` key from its parts. Used internally by the CMS dashboard.

```ts
import { buildKey } from 'cms-client'

const key = buildKey('test', 'elated-tapir-331', 'ABC1ABC2...')
// → 'bcms_test-ZWxhdGVkLXRhcGlyLTMzMS5BQkMxQUJDMg=='
```

---

### `defineCMSSection(definition)` — `cms-client`

Defines a content section with typed fields.

```ts
import { defineCMSSection, z } from 'cms-client'

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

### `z` — Field Type Helpers — `cms-client`

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

### `CMSProvider` — `cms-client/react`

React context provider that wraps your app. Required for `useSection` to work.

```tsx
import { CMSProvider } from 'cms-client/react'

<CMSProvider
  slug={string}                       // BETTER-CMS-SLUG
  convexUrl={string}                  // from parseKey(key).convexUrl
  env={'production' | 'preview'}      // 'production' for live key, 'preview' for test key
>
  {children}
</CMSProvider>
```

`CMSProvider` wraps Convex's `ConvexProvider` internally — you do **not** need a separate `ConvexProvider`.

> **Note**: `CMSProvider` uses React 19's context-as-component syntax. Requires React 19+.

---

### `useSection(section)` — `cms-client/react`

React hook that returns realtime content for a section.

```tsx
'use client'
import { useSection } from 'cms-client/react'
import { teamSection } from '@/lib/sections'

const items = useSection(teamSection)
// → InferSectionType<typeof teamSection>[] | undefined
```

- Returns `undefined` while loading (use a loading state)
- Returns `[]` if no content has been added yet
- Updates automatically when content is edited in CMS (no polling, no page reload)
- **No auth required** — works in public pages
- Must be called inside a component wrapped by `CMSProvider`

---

### `cms.registerSections(sections)` — `cms-client`

Writes section schema definitions to Convex. Call in a **Server Component** or **Server Action**.

```ts
await cms.registerSections([teamSection, heroSection])
```

- **Idempotent**: safe to call on every boot — uses upsert semantics
- **Immediate effect**: CMS reflects section schema changes within seconds of boot
- No return value (void)

---

## TypeScript Types

```ts
import type { CMSSection, CMSClient, InferSectionType } from 'cms-client'

// Get the item type for a section
type TeamMember = InferSectionType<typeof teamSection>
// → { name: string; role: string; bio?: string; image: string; order: number }
```

---

## Key Format

The `BETTER-CMS-KEY` uses the format: `bcms_<test|live>-<base64(deploymentName.SECRET)>`

- `test` — maps to **preview** environment in the CMS
- `live` — maps to **production** environment in the CMS

Both keys encode the same Convex deployment. They differ only in the `env` field returned
by `parseKey()`. Use this to choose which environment's content to display:

```ts
const parsed = parseKey(process.env['BETTER-CMS-KEY']!)
const env = parsed.env === 'live' ? 'production' : 'preview'
```

Project owners can regenerate keys at any time from the CMS dashboard. Regenerating
invalidates all previous keys for that project immediately.

---

## Production vs Preview Content

Content in the CMS has two environments: `production` and `preview`.

- Use `BETTER-CMS-KEY=bcms_live-...` in production deployments
- Use `BETTER-CMS-KEY=bcms_test-...` in preview/staging deployments

The CMS dashboard shows an **Environment Toggle** allowing editors to maintain separate
content for each environment.

---

## Frequently Asked Questions

**Q: Do I need to create a separate Convex project?**
No. Your Next.js project connects to the CMS's Convex deployment directly. The Convex URL
is derived from your `BETTER-CMS-KEY` by `parseKey()`.

**Q: What happens if I add a new field to a section?**
Call `registerSections` again (it happens automatically on next boot). The CMS will show the
new field in its forms. Existing content items won't have the new field — they'll get
`undefined` for optional fields or the default for fields with `.default(...)`.

**Q: Can I have multiple sections of the same type on different pages?**
Not currently. Each section `name` maps to one content document per environment. If you need
page-specific content, create distinct sections: `homeHeroSection`, `aboutHeroSection`, etc.

**Q: Is `useSection` compatible with SSR?**
`useSection` is a client-side React hook (it uses Convex's realtime subscription). For SSR,
a `getSection` Server Component helper is planned but not yet implemented — see `TODO.md`.

**Q: Why two env vars instead of one token?**
The `BETTER-CMS-SLUG` is a public human-readable identifier used in Convex queries.
The `BETTER-CMS-KEY` encodes the Convex deployment and registration secret.
Keeping them separate makes the slug easier to read and copy independently of the key.
