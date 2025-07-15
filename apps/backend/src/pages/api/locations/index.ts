import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { ApiResponse, Location } from 'shared-types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Location[]>>
) {
  if (req.method === 'GET') {
    try {
      const locations = await prisma.location.findMany({
        orderBy: {
          name: 'asc',
        },
      });
      res.status(200).json({ success: true, data: locations });
    } catch (error: any) {
      console.error('Error fetching locations:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal Server Error',
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res
      .status(405)
      .json({ success: false, error: `Method ${req.method} Not Allowed` });
  }
}
