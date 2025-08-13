import { NextApiResponse } from 'next';
import { ApiResponse, Permission } from 'shared-types';
import { categoryService } from '@/services/categoryService';
import { withPermission, withAuth } from '@/middleware/auth';
import type { AuthenticatedRequest } from '@/middleware/auth';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<any>>
) {
  switch (req.method) {
    case 'GET':
      return getCategories(req, res);
    case 'POST':
      return withPermission(Permission.MANAGE_CATEGORIES)(createCategory)(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }
}

const getCategories = withAuth(async (
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<any>>
) => {
  try {
    const categories = await categoryService.getAllCategories();
    return res.status(200).json({ success: true, data: categories });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

const createCategory = async (
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<any>>
) => {
  try {
    const newCategory = await categoryService.createCategory(req.body);
    return res.status(201).json({ success: true, data: newCategory });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

export default handler;
