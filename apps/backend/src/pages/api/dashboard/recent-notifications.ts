
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { AuthenticatedRequest, withAuth } from '@/middleware/auth';
import { ApiResponse, Notification } from 'shared-types';

async function getRecentNotifications(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<Notification[]>>
) {
  const userId = req.user.id;

  try {
    const recentNotifications = await prisma.notification.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5, // 只取最近的 5 筆
    });

    return res.status(200).json({ success: true, data: recentNotifications });
  } catch (error: any) {
    console.error('Error fetching recent notifications:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  }
}

export default withAuth(getRecentNotifications);
