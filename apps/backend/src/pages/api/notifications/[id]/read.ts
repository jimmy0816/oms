import { NextApiRequest, NextApiResponse } from 'next';
import { notificationService } from '@/services/notificationService';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const user = req.user;
  const { id } = req.query;

  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    try {
      const notificationId = Array.isArray(id) ? id[0] : id;
      if (!notificationId) {
        return res.status(400).json({ message: 'Notification ID is required' });
      }

      const updatedNotification = await notificationService.markAsRead(
        notificationId,
        user.id
      );
      res.status(200).json(updatedNotification);
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      res
        .status(500)
        .json({ message: error.message || 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default withAuth(handler);
