import { ImageResponse } from 'next/og'
import { siteConfig } from '@/lib/site'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px',
          backgroundColor: '#050505',
          backgroundImage:
            'linear-gradient(130deg, #050505 0%, #111827 50%, #050505 100%)',
          color: '#f3f4f6',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            alignSelf: 'flex-start',
            border: '1px solid #374151',
            padding: '8px 14px',
            borderRadius: 9999,
            fontSize: 22,
            color: '#e8aa3a',
          }}
        >
          Public Beta
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 74,
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            Realtime CMS
            <br />
            for Developers
          </div>
          <div style={{ fontSize: 30, color: '#9ca3af' }}>
            Based CMS: schema-first content without codegen.
          </div>
        </div>
        <div style={{ fontSize: 24 }}>{siteConfig.url}</div>
      </div>
    ),
    size
  )
}

