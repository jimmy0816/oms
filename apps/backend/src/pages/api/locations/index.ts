import type { NextApiRequest, NextApiResponse } from 'next';
import { locations } from '@/data/locations.js';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      res.status(200).json(locations);
    } catch (error) {
      console.error('Error reading locations.json:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
