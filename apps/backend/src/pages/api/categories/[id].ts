import { NextApiResponse } from 'next';
import { ApiResponse, Permission } from 'shared-types';
import { categoryService } from '@/services/categoryService';
import { withPermission } from '@/middleware/auth';
import type { AuthenticatedRequest } from '@/middleware/auth';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<any>>
) {
  const { method } = req;
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ success: false, error: '無效的分類 ID' });
  }

  switch (method) {
    case 'PUT':
      try {
        const updatedCategory = await categoryService.updateCategory(id, req.body);
        return res.status(200).json({ success: true, data: updatedCategory });
      } catch (error: any) {
        return res.status(400).json({ success: false, error: error.message });
      }

    case 'DELETE':
      try {
        await categoryService.deleteCategory(id);
        return res.status(204).end(); // No content
      } catch (error: any) {
        return res.status(400).json({ success: false, error: error.message });
      }

    default:
      res.setHeader('Allow', ['PUT', 'DELETE']);
      return res.status(405).json({ success: false, error: `Method ${method} Not Allowed` });
  }
}

export default withPermission(Permission.MANAGE_CATEGORIES)(handler);
