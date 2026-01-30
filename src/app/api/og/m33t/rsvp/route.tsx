import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyRSVPToken } from '@/lib/m33t/tokens';
import { loadInstrumentSerif } from '@/lib/og-fonts';

// Use nodejs runtime for Prisma access
export const runtime = 'nodejs';

// Design constants (matching the event OG image)
const GOLD = '#d4a54a';
const BG_PRIMARY = '#0a0a0f';
const TEXT_PRIMARY = '#f5f5f5';
const TEXT_MUTED = '#71717a';

// Event-specific configurations
interface EventConfig {
  headline: string;
  tagline: string;
  dateLocation: string;
}

function getEventConfig(eventName: string | null): EventConfig {
  if (eventName?.toLowerCase().includes('no edges')) {
    return {
      headline: 'No Edges.',
      tagline: 'Building at the speed of thought.',
      dateLocation: '03.12.26  \u2022  Austin, TX',
    };
  }

  return {
    headline: eventName || 'M33T',
    tagline: 'Connect with purpose.',
    dateLocation: '',
  };
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  // Decode token to get attendee info
  let firstName = '';
  let eventConfig: EventConfig = getEventConfig(null);

  if (token) {
    try {
      const payload = verifyRSVPToken(token);
      if (payload) {
        const [attendee, event] = await Promise.all([
          prisma.eventAttendee.findUnique({
            where: { id: payload.attendeeId },
            select: { firstName: true },
          }),
          prisma.event.findUnique({
            where: { id: payload.eventId },
            select: { name: true },
          }),
        ]);

        if (attendee) {
          firstName = attendee.firstName;
        }
        if (event) {
          eventConfig = getEventConfig(event.name);
        }
      }
    } catch {
      // Token invalid/expired - fall back to generic
    }
  }

  // Fallback if no name could be resolved
  const displayName = firstName || 'You';

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
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: BG_PRIMARY,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Primary gold glow - centered behind the name */}
        <div
          style={{
            position: 'absolute',
            top: '35%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '1000px',
            height: '800px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${GOLD}14 0%, ${GOLD}08 35%, transparent 55%)`,
          }}
        />

        {/* Secondary top-left glow */}
        <div
          style={{
            position: 'absolute',
            top: '-250px',
            left: '-150px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${GOLD}0c 0%, transparent 60%)`,
          }}
        />

        {/* Subtle bottom-right glow */}
        <div
          style={{
            position: 'absolute',
            bottom: '-200px',
            right: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${GOLD}08 0%, transparent 70%)`,
          }}
        />

        {/* Main content - centered */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            padding: '0 80px',
            marginTop: '-80px',
          }}
        >
          {/* First name - large, gold, Instrument Serif */}
          <div
            style={{
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontSize: firstName.length > 10 ? '132px' : '168px',
              fontWeight: 400,
              color: GOLD,
              letterSpacing: '-2px',
              textAlign: 'center',
              lineHeight: 1.05,
              marginBottom: '12px',
            }}
          >
            {displayName}
          </div>

          {/* "You're Invited" - white, slightly smaller */}
          <div
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: '59px',
              fontWeight: 400,
              color: TEXT_PRIMARY,
              textAlign: 'center',
              opacity: 0.9,
              letterSpacing: '1px',
            }}
          >
            {"You're Invited"}
          </div>
        </div>

        {/* Event branding at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            left: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          {/* Event headline - smaller */}
          <div
            style={{
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontSize: '64px',
              fontWeight: 400,
              color: GOLD,
              opacity: 0.75,
              letterSpacing: '-0.5px',
              marginBottom: '6px',
            }}
          >
            {eventConfig.headline}
          </div>

          {/* Tagline */}
          <div
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: '36px',
              fontWeight: 400,
              color: TEXT_MUTED,
              opacity: 0.8,
            }}
          >
            {eventConfig.tagline}
          </div>

          {/* Date/Location */}
          {eventConfig.dateLocation && (
            <div
              style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: '15px',
                fontWeight: 400,
                color: TEXT_MUTED,
                opacity: 0.6,
                marginTop: '4px',
              }}
            >
              {eventConfig.dateLocation}
            </div>
          )}
        </div>

        {/* Gold bottom border with gradient fade */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(90deg, transparent 10%, ${GOLD}60 30%, ${GOLD} 50%, ${GOLD}60 70%, transparent 90%)`,
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
