import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from 'prisma-client';
import { ApiResponse, Notification, PaginatedResponse } from 'shared-types';
import { withApiHandler } from '@/lib/api-handler';

export default withApiHandler(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<PaginatedResponse<Notification>>>
) {
  // Run the CORS middleware
  await runMiddleware(req, res, corsMiddleware);

  try {
    switch (req.method) {
      case 'GET':
        return await getNotifications(req, res);
      default:
        res.setHeader('Allow', ['GET']);
        return res
          .status(405)
          .json({ success: false, error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Error in notifications API:', error);
    return res
      .status(500)
      .json({
        success: false,
        error: error.message || 'Internal Server Error',
      });
  }
});

async function getNotifications(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<PaginatedResponse<Notification>>>
) {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 10;
  const userId = req.query.userId as string;
  const isRead =
    req.query.isRead === 'true'
      ? true
      : req.query.isRead === 'false'
      ? false
      : undefined;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'User ID is required',
    });
  }

  const skip = (page - 1) * pageSize;

  // Build filter conditions
  const where: any = { userId };
  if (isRead !== undefined) where.isRead = isRead;

  // Get notifications with pagination
  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        relatedTicket: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    }),
    prisma.notification.count({ where }),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      items: notifications,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
