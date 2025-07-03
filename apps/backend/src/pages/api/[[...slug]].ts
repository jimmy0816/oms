import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers for all requests
  res.setHeader(
    'Access-Control-Allow-Origin',
    process.env.PUBLIC_FRONTEND_URL || '*'
  );
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours cache for preflight

  // Handle OPTIONS method for preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // For non-OPTIONS methods, return a 404 since this is a catch-all route
  // The specific API routes will handle their own methods
  return res.status(404).json({ error: 'Not Found' });
}
