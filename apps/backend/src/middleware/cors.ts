import { NextApiRequest, NextApiResponse } from 'next';
import type { NextApiHandler } from 'next';

/**
 * CORS middleware for Next.js API routes
 * This middleware adds CORS headers to all API responses
 */
export function withCors(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Always allow all origins for development
    res.setHeader(
      'Access-Control-Allow-Origin',
      process.env.PUBLIC_FRONTEND_URL || '*'
    );
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version'
    );
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours cache for preflight

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Continue with the API handler
    return handler(req, res);
  };
}
