import { ImageResponse } from 'next/og'
import { siteConfig } from '@/lib/site'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default function OpenGraphImage() {
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
            'radial-gradient(circle at 20% 20%, #e8aa3a33 0%, #050505 40%)',
          color: '#e8e8e8',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#e8aa3a',
          }}
        >
          Based CMS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 82,
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            The CMS
            <br />
            that types itself.
          </div>
          <div style={{ fontSize: 30, color: '#9ca3af' }}>
            Realtime content. Type-safe schemas. Built for developers.
          </div>
        </div>
        <div style={{ fontSize: 24, color: '#e8aa3a' }}>{siteConfig.url}</div>
      </div>
    ),
    size
  )
}

