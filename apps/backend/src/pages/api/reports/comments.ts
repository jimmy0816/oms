import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from 'shared-types';
import { notificationService } from '@/services/notificationService';

// Define Comment type
interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  reportId: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

// Define CreateCommentRequest type
interface CreateCommentRequest {
  content: string;
  reportId: string;
  userId: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Comment>>
) {
  try {
    switch (req.method) {
      case 'POST':
        return await addCommentToReport(req, res);
      default:
        res.setHeader('Allow', ['POST']);
        return res
          .status(405)
          .json({ success: false, error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Error in reports/comments API:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  }
}

async function addCommentToReport(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Comment>>
) {
  const { content, reportId, userId } = req.body as CreateCommentRequest;

  if (!content || !reportId || !userId) {
    return res.status(400).json({
      success: false,
      error: 'Content, reportId, and userId are required',
    });
  }

  // Check if report exists
  const report = await prisma.report.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    return res.status(404).json({
      success: false,
      error: 'Report not found',
    });
  }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  // Create comment
  const comment = await prisma.comment.create({
    data: {
      content,
      reportId,
      userId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // --- Start Notification Logic ---
  const commenterName = user.name || '有人';
  const notificationMessage = `${commenterName} 在通報「${report.title}」留言`;

  const recipients = new Set<string>();

  // Notify report creator if the commenter is not the creator
  if (report.creatorId !== userId) {
    recipients.add(report.creatorId);
  }
  // Notify report assignee if exists and commenter is not the assignee
  if (report.assigneeId && report.assigneeId !== userId) {
    recipients.add(report.assigneeId);
  }

  // Notify all previous commenters on this report
  const previousCommenters = await prisma.comment.findMany({
    where: { reportId: report.id },
    select: { userId: true },
    distinct: ['userId'], // Get unique user IDs
  });

  previousCommenters.forEach(c => {
    if (c.userId !== userId) { // Don't notify the current commenter again
      recipients.add(c.userId);
    }
  });

  const notificationPromises = Array.from(recipients).map((recipientId) =>
    notificationService.create({
      title: '通報新留言',
      message: notificationMessage,
      userId: recipientId,
      relatedId: reportId,
      relatedType: 'REPORT',
    })
  );

  await Promise.all(notificationPromises);
  // --- End Notification Logic ---

  return res.status(201).json({
    success: true,
    data: comment,
  });
}