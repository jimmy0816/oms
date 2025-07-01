import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware runs on all API routes
export function middleware(request: NextRequest) {
  // Get the origin from the request headers
  const origin = request.headers.get('origin') || '*';
  
  // Create the response
  const response = NextResponse.next();
  
  // Add the CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours cache for preflight
  
  // Handle OPTIONS preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: response.headers,
    });
  }
  
  return response;
}

// Configure which paths this middleware will run on
export const config = {
  matcher: '/api/:path*',
};
