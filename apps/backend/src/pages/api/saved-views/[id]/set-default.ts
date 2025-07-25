import { NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { id } = req.query; // SavedView ID
  const { viewType } = req.body; // View type (e.g., 'REPORT', 'TICKET')
  const authUser = req.user; // 從 AuthenticatedRequest 獲取用戶資訊

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Saved view ID is required' });
  }

  if (!viewType || (viewType !== 'REPORT' && viewType !== 'TICKET')) {
    return res
      .status(400)
      .json({ message: 'Valid view type (REPORT or TICKET) is required' });
  }

  try {
    // 1. 將該用戶和該視圖類型下的所有其他視圖的 isDefault 設為 false
    await prisma.savedView.updateMany({
      where: {
        userId: authUser.id,
        viewType: viewType,
        isDefault: true, // 只更新當前為預設的視圖
      },
      data: {
        isDefault: false,
      },
    });

    // 2. 將指定 ID 的視圖設為預設
    const updatedView = await prisma.savedView.update({
      where: {
        id: id,
        userId: authUser.id, // 確保只有視圖的擁有者可以修改
      },
      data: {
        isDefault: true,
      },
    });

    if (!updatedView) {
      return res
        .status(404)
        .json({ message: 'Saved view not found or not owned by user' });
    }

    return res
      .status(200)
      .json({ message: 'Default view set successfully', data: updatedView });
  } catch (error) {
    console.error('Error setting default saved view:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

export default withAuth(handler);
