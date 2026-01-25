import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

// Use nodejs runtime for potential Prisma access in future
export const runtime = 'nodejs';

// Load Instrument Serif font from Google Fonts (woff format for OG image compatibility)
async function loadInstrumentSerif(): Promise<ArrayBuffer> {
  // Use a user agent that requests woff format (not woff2)
  const cssResponse = await fetch(
    'https://fonts.googleapis.com/css2?family=Instrument+Serif&display=swap',
    {
      headers: {
        // Use IE user agent to get woff format (older browser doesn't support woff2)
        'User-Agent': 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)',
      },
    }
  );
  const css = await cssResponse.text();

  // Extract the font file URL from the CSS - handles dynamic Google URLs
  // Matches: url(https://...) format('woff')
  const fontUrlMatch = css.match(/url\(([^)]+)\)\s*format\(['"]woff['"]\)/);
  if (!fontUrlMatch || !fontUrlMatch[1]) {
    throw new Error('Could not find font URL in CSS');
  }

  const fontUrl = fontUrlMatch[1];
  const fontResponse = await fetch(fontUrl);
  return fontResponse.arrayBuffer();
}

// Design constants
const GOLD = '#d4a54a';
const BG_PRIMARY = '#0a0a0f';
const TEXT_PRIMARY = '#f5f5f5';
const TEXT_MUTED = '#71717a';

// Event-specific configurations
interface EventConfig {
  headline: string;
  tagline: string;
  dateLocation: string;
  title: string; // For metadata
}

function getEventConfig(slug: string | null): EventConfig {
  // NO EDGES event configuration
  if (slug === 'no-edges-33-strategies-launch' || slug?.includes('no-edges')) {
    return {
      headline: 'No Edges.',
      tagline: 'Building at the speed of thought.',
      dateLocation: '3.12.26  •  Austin, TX',
      title: 'No Edges - 3.12.26 - Austin, TX',
    };
  }

  // Default fallback for other events
  return {
    headline: 'M33T',
    tagline: 'Connect with purpose.',
    dateLocation: '',
    title: 'M33T Event',
  };
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');
  const config = getEventConfig(slug);

  // Load custom font
  const instrumentSerifData = await loadInstrumentSerif();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          backgroundColor: BG_PRIMARY,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Primary gold glow - positioned to the left */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '15%',
            transform: 'translate(-50%, -50%)',
            width: '900px',
            height: '900px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${GOLD}18 0%, ${GOLD}08 30%, transparent 55%)`,
          }}
        />

        {/* Secondary top-right glow */}
        <div
          style={{
            position: 'absolute',
            top: '-200px',
            right: '-200px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${GOLD}10 0%, transparent 60%)`,
          }}
        />

        {/* Subtle bottom-right glow */}
        <div
          style={{
            position: 'absolute',
            bottom: '-200px',
            right: '10%',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${GOLD}08 0%, transparent 70%)`,
          }}
        />

        {/* Content container - left aligned */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: 10,
            padding: '60px 80px',
          }}
        >
          {/* Main headline - Gold, Instrument Serif font */}
          <div
            style={{
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontSize: '130px',
              fontWeight: 400,
              color: GOLD,
              marginBottom: '24px',
              letterSpacing: '-2px',
              textAlign: 'left',
              lineHeight: 1,
            }}
          >
            {config.headline}
          </div>

          {/* Tagline - White, smaller serif font */}
          <div
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: '38px',
              fontWeight: 400,
              color: TEXT_PRIMARY,
              marginBottom: '48px',
              textAlign: 'left',
              opacity: 0.95,
            }}
          >
            {config.tagline}
          </div>

          {/* Date and location - Muted system font */}
          {config.dateLocation && (
            <div
              style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: '28px',
                fontWeight: 400,
                color: TEXT_MUTED,
                textAlign: 'left',
                letterSpacing: '0.5px',
              }}
            >
              {config.dateLocation}
            </div>
          )}
        </div>

        {/* Gold bottom border with left-to-right gradient fade */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(90deg, ${GOLD} 0%, ${GOLD}60 40%, transparent 80%)`,
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Instrument Serif',
          data: instrumentSerifData,
          style: 'normal',
          weight: 400,
        },
      ],
    }
  );
}
