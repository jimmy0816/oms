import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from 'prisma-client';
import { ApiResponse } from 'shared-types';

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

  // Create notification for report creator if commenter is not the creator
  if (userId !== report.creatorId) {
    await prisma.notification.create({
      data: {
        title: 'New Comment on Your Report',
        message: `${user.name} commented on your report: "${report.title}"`,
        userId: report.creatorId,
        relatedReportId: reportId,
      },
    });
  }

  // Create notification for assignee if exists and commenter is not the assignee
  if (report.assigneeId && userId !== report.assigneeId) {
    await prisma.notification.create({
      data: {
        title: 'New Comment on Assigned Report',
        message: `${user.name} commented on report: "${report.title}"`,
        userId: report.assigneeId,
        relatedReportId: reportId,
      },
    });
  }

  return res.status(201).json({
    success: true,
    data: comment,
  });
}
