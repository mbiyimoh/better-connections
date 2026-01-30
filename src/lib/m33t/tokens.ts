import jwt from 'jsonwebtoken';

const RSVP_TOKEN_SECRET = process.env.RSVP_TOKEN_SECRET;

// Only throw on server-side when the module is actually used
// This allows the module to be imported without crashing during build
function getSecret(): string {
  if (!RSVP_TOKEN_SECRET) {
    throw new Error('RSVP_TOKEN_SECRET environment variable is required');
  }
  return RSVP_TOKEN_SECRET;
}

export interface RSVPTokenPayload {
  eventId: string;
  email: string | null;
  attendeeId: string;
  type: 'rsvp';
  exp: number;
  iat: number;
}

/**
 * Generate a signed JWT token for RSVP access
 * Token expires 24 hours after the event date
 */
export function generateRSVPToken(
  eventId: string,
  email: string | null,
  attendeeId: string,
  eventDate: Date
): string {
  const payload: Omit<RSVPTokenPayload, 'exp' | 'iat'> = {
    eventId,
    email,
    attendeeId,
    type: 'rsvp',
  };

  // Expire 24 hours after event date
  const expiresAt = new Date(eventDate);
  expiresAt.setHours(expiresAt.getHours() + 24);

  return jwt.sign(payload, getSecret(), {
    expiresIn: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
  });
}

/**
 * Verify and decode an RSVP token
 * Returns null if token is invalid or expired
 */
export function verifyRSVPToken(token: string): RSVPTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret()) as RSVPTokenPayload;

    // Verify it's an RSVP token
    if (decoded.type !== 'rsvp') {
      return null;
    }

    return decoded;
  } catch {
    // Token is invalid or expired
    return null;
  }
}

/**
 * Check if a token is expired (for showing different error messages)
 */
export function isTokenExpired(token: string): boolean {
  try {
    jwt.verify(token, getSecret());
    return false;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return true;
    }
    return false; // Invalid token, not expired
  }
}

/**
 * Generate the RSVP URL for an attendee.
 * Routes to the personalized event landing page (/m33t/{slug}?token=...)
 * so invitees see the full experience before entering the RSVP flow.
 */
export function generateRSVPUrl(
  eventId: string,
  email: string | null,
  attendeeId: string,
  eventDate: Date,
  baseUrl: string,
  slug?: string | null
): string {
  const token = generateRSVPToken(eventId, email, attendeeId, eventDate);
  return slug
    ? `${baseUrl}/m33t/${slug}?token=${token}`
    : `${baseUrl}/rsvp/${token}`;
}
