import { NextApiResponse } from 'next';
import { ApiResponse, Permission } from 'shared-types';
import { categoryService } from '@/services/categoryService';
import { withPermission } from '@/middleware/auth';
import type { AuthenticatedRequest } from '@/middleware/auth';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<any>>
) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }

  try {
    // The body should contain the updates array
    await categoryService.reorderCategories(req.body.updates);
    return res.status(200).json({ success: true, data: null });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
}

export default withPermission(Permission.MANAGE_CATEGORIES)(handler);
