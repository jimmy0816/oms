import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_PATHS = ['/login', '/lost-and-found'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check if the path is public
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check for a valid session token
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, cookieName: 'next-auth.session-token' });

  console.log('[middleware req]', req);
  console.log('[middleware nextauth secret]', process.env.NEXTAUTH_SECRET);
  console.log('[middleware token]', token);
  // If a token exists, the user is authenticated, let them proceed
  if (token) {
    return NextResponse.next();
  }

  // If the user is not authenticated, redirect to the login page.
  // We use NEXTAUTH_URL as the reliable base URL because req.nextUrl can be incorrect behind a proxy.
  const baseUrl = process.env.NEXTAUTH_URL;

  // The URL the user was trying to access.
  const callbackUrl = new URL(req.nextUrl.pathname + req.nextUrl.search, baseUrl).href;

  // The login page URL.
  const loginUrl = new URL('/login', baseUrl);
  loginUrl.searchParams.set('callbackUrl', callbackUrl);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
