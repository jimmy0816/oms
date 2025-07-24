import { NextApiRequest, NextApiResponse } from 'next';
import { ApiResponse } from 'shared-types';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';

interface SavedView {
  id: string;
  name: string;
  userId: string;
  filters: any; // JSON type for filters
  createdAt: Date;
  updatedAt: Date;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<SavedView>>
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Saved view ID is required' });
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
        return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error(`Error in saved-views/[id] API for ID ${id}:`, error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
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
    return res.status(404).json({ success: false, error: 'Saved view not found or unauthorized' });
  }

  return res.status(200).json({ success: true, data: savedView });
}

async function updateSavedView(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<SavedView>>
) {
  const { id } = req.query;
  const userId = req.user.id;
  const { name, filters } = req.body;

  if (!name && !filters) {
    return res.status(400).json({ success: false, error: 'Name or filters are required for update' });
  }

  try {
    const updatedSavedView = await prisma.savedView.update({
      where: { id: id as string, userId },
      data: {
        ...(name && { name }),
        ...(filters && { filters }),
      },
    });
    return res.status(200).json({ success: true, data: updatedSavedView });
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
      return res.status(409).json({ success: false, error: '視圖名稱已存在，請使用不同的名稱。' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Saved view not found or unauthorized' });
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
      return res.status(404).json({ success: false, error: 'Saved view not found or unauthorized' });
    }
    throw error;
  }
}
