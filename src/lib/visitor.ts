import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

const VISITOR_COOKIE_NAME = 'bc_visitor_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Get or create a visitor ID from cookies.
 * Used for tracking anonymous votes when user is not authenticated.
 */
export async function getOrCreateVisitorId(): Promise<string> {
  const cookieStore = await cookies();
  let visitorId = cookieStore.get(VISITOR_COOKIE_NAME)?.value;

  if (!visitorId) {
    visitorId = uuidv4();
    cookieStore.set(VISITOR_COOKIE_NAME, visitorId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
  }

  return visitorId;
}

/**
 * Get visitor ID without creating one if it doesn't exist.
 */
export async function getVisitorId(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(VISITOR_COOKIE_NAME)?.value;
}
