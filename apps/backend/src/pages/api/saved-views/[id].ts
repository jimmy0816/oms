import { NextApiRequest, NextApiResponse } from 'next';
import { ApiResponse, SavedView } from 'shared-types';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<SavedView>>
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res
      .status(400)
      .json({ success: false, error: 'Saved view ID is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await withAuth(getSavedViewById)(req, res);
      case 'PUT':
        return await withAuth(updateSavedView)(req, res);
      case 'DELETE':
        return await withAuth(deleteSavedView)(req, res);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res
          .status(405)
          .json({ success: false, error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error(`Error in saved-views/[id] API for ID ${id}:`, error);
    return res
      .status(500)
      .json({
        success: false,
        error: error.message || 'Internal Server Error',
      });
  }
}

async function getSavedViewById(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<SavedView>>
) {
  const { id } = req.query;
  const userId = req.user.id;

  const savedView = await prisma.savedView.findUnique({
    where: { id: id as string, userId },
  });

  if (!savedView) {
    return res
      .status(404)
      .json({ success: false, error: 'Saved view not found or unauthorized' });
  }

  return res.status(200).json({ success: true, data: savedView });
}

async function updateSavedView(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<SavedView>>
) {
  const { id } = req.query;
  const userId = req.user.id;
  const { name, filters, isDefault } = req.body;

  if (!name && !filters && isDefault === undefined) {
    return res
      .status(400)
      .json({
        success: false,
        error: 'Name, filters, or isDefault are required for update',
      });
  }

  try {
    // 如果 isDefault 被明確設定為 true，則需要先將該用戶和該視圖類型下的所有其他視圖的 isDefault 設為 false
    if (isDefault === true) {
      const existingView = await prisma.savedView.findUnique({
        where: { id: id as string },
        select: { viewType: true, userId: true },
      });

      if (existingView) {
        await prisma.savedView.updateMany({
          where: {
            userId: existingView.userId,
            viewType: existingView.viewType,
            isDefault: true,
            NOT: { id: id as string }, // 排除當前正在更新的視圖
          },
          data: {
            isDefault: false,
          },
        });
      }
    }

    const updatedSavedView = await prisma.savedView.update({
      where: { id: id as string, userId },
      data: {
        ...(name && { name }),
        ...(filters && { filters }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });
    return res.status(200).json({ success: true, data: updatedSavedView });
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
      return res
        .status(409)
        .json({ success: false, error: '視圖名稱已存在，請使用不同的名稱。' });
    }
    if (
      error.code === 'P2002' &&
      error.meta?.target?.includes('UniqueDefaultView')
    ) {
      return res
        .status(409)
        .json({ success: false, error: '每個視圖類型只能有一個預設視圖。' });
    }
    if (error.code === 'P2025') {
      return res
        .status(404)
        .json({
          success: false,
          error: 'Saved view not found or unauthorized',
        });
    }
    throw error;
  }
}

async function deleteSavedView(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<SavedView>>
) {
  const { id } = req.query;
  const userId = req.user.id;

  try {
    await prisma.savedView.delete({
      where: { id: id as string, userId },
    });
    return res.status(200).json({ success: true, data: null });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res
        .status(404)
        .json({
          success: false,
          error: 'Saved view not found or unauthorized',
        });
    }
    throw error;
  }
}
