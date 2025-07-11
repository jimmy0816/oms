import { NextApiRequest, NextApiResponse } from 'next';
import { notificationService } from '@/services/notificationService';
import { withAuth } from '@/middleware/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    try {
      const result = await notificationService.markAllAsRead(user.id);
      res
        .status(200)
        .json({
          message: `Successfully marked ${result.count} notifications as read.`,
        });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default withAuth(handler);
