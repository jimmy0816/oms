import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const jsonPath = path.resolve(process.cwd(), 'src/data/locations.json');
      const jsonString = await fs.readFile(jsonPath, 'utf-8');
      const locations = JSON.parse(jsonString);
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
