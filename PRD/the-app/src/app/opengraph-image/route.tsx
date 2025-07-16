import { ImageResponse } from 'next/og';
import { getConfig } from '@/lib/config';

export async function GET() {
  const siteTitle = (await getConfig('site_title')) || 'Bring Me Home';

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(to bottom right, #4338CA, #6366F1)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            padding: '60px 80px',
            borderRadius: '20px',
            backdropFilter: 'blur(10px)',
          }}
        >
          <h1
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: 'white',
              margin: '0',
              textAlign: 'center',
              lineHeight: '1.1',
              textShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
            }}
          >
            {siteTitle}
          </h1>
          <p
            style={{
              fontSize: '36px',
              color: '#E0E7FF',
              margin: '20px 0 0 0',
              textAlign: 'center',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            }}
          >
            Support for ICE detainees
          </p>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}