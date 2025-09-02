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

  return token;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
  const loginUrl = new URL('/login', baseUrl);

  // console.log('req.nextUrl.href', req.nextUrl.href);
  // console.log('loginUrl constructed:', loginUrl.toString());
  // const callbackUrl = `${baseUrl}${req.nextUrl.pathname}${req.nextUrl.search}`;
  // loginUrl.searchParams.set('callbackUrl', callbackUrl);
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
