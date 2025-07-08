import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from 'prisma-client';
import { ApiResponse, Notification } from 'shared-types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Notification>>
) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res
      .status(400)
      .json({ success: false, error: 'Invalid notification ID' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getNotification(id, res);
      case 'PUT':
        return await updateNotification(id, req, res);
      case 'DELETE':
        return await deleteNotification(id, res);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res
          .status(405)
          .json({ success: false, error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Error in notification API:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  }
}

async function getNotification(
  id: string,
  res: NextApiResponse<ApiResponse<Notification>>
) {
  const notification = await prisma.notification.findUnique({
    where: { id },
    include: {
      relatedTicket: true,
    },
  });

  if (!notification) {
    return res
      .status(404)
      .json({ success: false, error: 'Notification not found' });
  }

  return res.status(200).json({ success: true, data: notification });
}

async function updateNotification(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Notification>>
) {
  const { isRead } = req.body;

  // Check if notification exists
  const existingNotification = await prisma.notification.findUnique({
    where: { id },
  });
  if (!existingNotification) {
    return res
      .status(404)
      .json({ success: false, error: 'Notification not found' });
  }

  // Update notification
  const updatedNotification = await prisma.notification.update({
    where: { id },
    data: { isRead },
    include: {
      relatedTicket: true,
    },
  });

  return res.status(200).json({ success: true, data: updatedNotification });
}

async function deleteNotification(
  id: string,
  res: NextApiResponse<ApiResponse<Notification>>
) {
  // Check if notification exists
  const existingNotification = await prisma.notification.findUnique({
    where: { id },
  });
  if (!existingNotification) {
    return res
      .status(404)
      .json({ success: false, error: 'Notification not found' });
  }

  // Delete the notification
  const deletedNotification = await prisma.notification.delete({
    where: { id },
  });

  return res.status(200).json({ success: true, data: deletedNotification });
}
