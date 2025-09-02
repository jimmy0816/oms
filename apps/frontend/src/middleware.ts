import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_PATHS = ['/login'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check if the path is public
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check for a valid session token
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // If a token exists, the user is authenticated, let them proceed
  if (token) {
    return NextResponse.next();
  }

  // If the user is not authenticated, redirect to the login page.
  // We pass the original URL as a callbackUrl query parameter.
  const loginUrl = new URL('/login', req.nextUrl.origin);
  loginUrl.searchParams.set('callbackUrl', req.nextUrl.href);

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
