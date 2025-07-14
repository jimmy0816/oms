import { NextApiRequest, NextApiResponse } from 'next';
import { ApiResponse } from 'shared-types';
import { categoryService } from '@/services/categoryService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<any>>
) {
  if (req.method === 'GET') {
    try {
      const categories = await categoryService.getAllCategories();
      return res.status(200).json({ success: true, data: categories });
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }
}
