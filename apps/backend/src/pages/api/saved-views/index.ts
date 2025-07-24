import { NextApiRequest, NextApiResponse } from 'next';
import { ApiResponse, PaginatedResponse, SavedView } from 'shared-types';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';

// interface SavedView {
//   id: string;
//   name: string;
//   userId: string;
//   filters: any; // JSON type for filters
//   createdAt: Date;
//   updatedAt: Date;
// }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    ApiResponse<SavedView | SavedView[] | PaginatedResponse<SavedView>>
  >
) {
  try {
    switch (req.method) {
      case 'GET':
        return await withAuth(getSavedViews)(req, res);
      case 'POST':
        return await withAuth(createSavedView)(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res
          .status(405)
          .json({ success: false, error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Error in saved-views API:', error);
    return res
      .status(500)
      .json({
        success: false,
        error: error.message || 'Internal Server Error',
      });
  }
}

async function getSavedViews(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<SavedView[]>>
) {
  const userId = req.user.id;
  const type = req.query.type as string | undefined;

  const where: any = { userId };
  if (type) {
    where.type = type;
  }

  const savedViews = await prisma.savedView.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return res.status(200).json({ success: true, data: savedViews });
}

async function createSavedView(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<SavedView>>
) {
  const { name, filters, type } = req.body;
  const userId = req.user.id;

  if (!name || !filters || !type) {
    return res
      .status(400)
      .json({ success: false, error: 'Name, filters, and type are required' });
  }

  try {
    const newSavedView = await prisma.savedView.create({
      data: {
        name,
        userId,
        filters,
        type,
      },
    });
    return res.status(201).json({ success: true, data: newSavedView });
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
      return res
        .status(409)
        .json({ success: false, error: '視圖名稱已存在，請使用不同的名稱。' });
    }
    throw error;
  }
}
