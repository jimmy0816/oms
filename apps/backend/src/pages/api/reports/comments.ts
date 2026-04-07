import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { ApiResponse, Comment, CreateCommentRequest } from 'shared-types';
import { reportCommentService } from '@/services/reportCommentService';
import { AuthenticatedRequest, withAuth } from '@/middleware/auth';



export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Comment | { id: string }>>
) {
  try {
    switch (req.method) {
      case 'POST':
        return await withAuth(addCommentToReport)(req, res);
      case 'DELETE':
        return await withAuth(deleteCommentFromReport)(req, res);
      default:
        res.setHeader('Allow', ['POST', 'DELETE']);
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
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<Comment>>
) {
  const { content, reportId } = req.body as CreateCommentRequest;
  const userId = req.user?.id;

  if (!content || !reportId) {
    return res.status(400).json({
      success: false,
      error: 'Content and reportId are required',
    });
  }

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: '未授權訪問，請先登入',
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

  const comment = await reportCommentService.createReportComment({
    reportId,
    userId,
    content,
    source: 'OMS',
  });

  return res.status(201).json({
    success: true,
    data: comment,
  });
}

async function deleteCommentFromReport(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<{ id: string }>>
) {
  const userId = req.user?.id;
  const commentId =
    typeof req.query.commentId === 'string'
      ? req.query.commentId
      : typeof req.body?.commentId === 'string'
        ? req.body.commentId
        : null;

  if (!commentId) {
    return res.status(400).json({
      success: false,
      error: 'commentId is required',
    });
  }

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: '未授權訪問，請先登入',
    });
  }

  const result = await reportCommentService.deleteReportComment({
    commentId,
    userId,
  });

  return res.status(200).json({
    success: true,
    data: { id: result.id },
  });
}