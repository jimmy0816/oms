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

  // If no token, and it's a protected route, redirect to login
  const loginUrl = new URL('/login', req.url);

  // This is the original URL the user tried to access
  console.log('req.nextUrl.href', req, loginUrl);
  const callbackUrl = req.nextUrl.href;
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
