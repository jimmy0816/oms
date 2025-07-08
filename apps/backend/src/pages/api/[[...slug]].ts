import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  

  // For non-OPTIONS methods, return a 404 since this is a catch-all route
  // The specific API routes will handle their own methods
  return res.status(404).json({ error: 'Not Found' });
}
