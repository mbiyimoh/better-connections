import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that require Better Contacts access (not available to M33T-only invitees)
const BC_ONLY_ROUTES = ['/contacts', '/enrich', '/explore', '/settings', '/onboarding'];

// Routes available to M33T invitees (guest dashboard)
const GUEST_ROUTES = ['/guest'];

// Routes that require authentication
const PROTECTED_ROUTES = [...BC_ONLY_ROUTES, ...GUEST_ROUTES, '/events'];

export async function updateSession(request: NextRequest) {
  // Clone headers and add pathname for server components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: requestHeaders },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: requestHeaders },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected routes - redirect to login if not authenticated
  const isProtectedPath = PROTECTED_ROUTES.some((path) =>
    pathname.startsWith(path)
  );

  if (!user && isProtectedPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users away from auth pages
  const authPaths = ['/login', '/signup', '/forgot-password'];
  const isAuthPath = authPaths.some((path) => pathname === path);

  if (user && isAuthPath) {
    // Respect `next` param for M33T invitee flows that redirect through auth pages
    const next = request.nextUrl.searchParams.get('next');
    const redirectUrl = next || '/contacts';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  return response;
}
