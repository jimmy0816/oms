import { NextRequest, NextResponse } from 'next/server';

const allowedOrigins = [
  'http://localhost:3000',
  process.env.PUBLIC_FRONTEND_URL,
].filter(Boolean);

const ALLOWED_METHODS = 'GET, POST, PUT, DELETE, OPTIONS, PATCH';
const ALLOWED_HEADERS =
  'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization';

export function middleware(request: NextRequest) {
  // 1. Determine the base response object based on the request method.
  const response = request.method === 'OPTIONS'
    ? new NextResponse(null, { status: 204 })
    : NextResponse.next();

  // 2. Get the origin from the request headers.
  const origin = request.headers.get('origin');

  // 3. Apply all common CORS headers to the response object.
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS);
  response.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  response.headers.set('Access-Control-Max-Age', '86400');

  // 4. Return the prepared response.
  return response;
}

export const config = {
  matcher: '/api/:path*',
};