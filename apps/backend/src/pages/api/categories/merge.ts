import { NextApiResponse } from 'next';
import { ApiResponse, Permission } from 'shared-types';
import { categoryService } from '@/services/categoryService';
import { withPermission, AuthenticatedRequest } from '@/middleware/auth';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<any>>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res
      .status(405)
      .json({ success: false, error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { sourceIds, targetId, newName, parentId } = req.body;

    if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: '未選擇要整併的分類' });
    }

    if (!targetId && !newName) {
      return res
        .status(400)
        .json({ success: false, error: '必須指定目標分類或新分類名稱' });
    }

    await categoryService.mergeCategories(
      sourceIds,
      targetId,
      newName,
      parentId,
    );

    return res
      .status(200)
      .json({ success: true, data: { message: '整併完成' } });
  } catch (error: any) {
    console.error('Merge error:', error);
    return res
      .status(400)
      .json({ success: false, error: error.message || '整併失敗' });
  }
}

export default withPermission(Permission.MANAGE_CATEGORIES)(handler);
