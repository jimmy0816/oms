import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from 'prisma-client';
import { ApiResponse, Comment, CreateCommentRequest } from 'shared-types';
import { withApiHandler } from '@/lib/api-handler';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';

export default withApiHandler(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Comment | Comment[]>>
) {
  try {
    switch (req.method) {
      case 'GET':
        return await getComments(req, res);
      case 'POST':
        return await withAuth(createComment)(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res
          .status(405)
          .json({ success: false, error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Error in tickets/comments API:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  }
});

async function getComments(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Comment[]>>
) {
  const { ticketId } = req.query;

  if (!ticketId || Array.isArray(ticketId)) {
    return res.status(400).json({
      success: false,
      error: 'Ticket ID is required',
    });
  }

  const comments = await prisma.comment.findMany({
    where: { ticketId },
    orderBy: { createdAt: 'asc' },
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

  return res.status(200).json({
    success: true,
    data: comments,
  });
}

async function createComment(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<Comment>>
) {
  const { content, ticketId } = req.body as CreateCommentRequest;
  const userId = req.user.id;

  if (!content || !ticketId) {
    return res.status(400).json({
      success: false,
      error: 'Content and ticket ID are required',
    });
  }

  // Check if ticket exists
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { creator: true, assignee: true },
  });

  if (!ticket) {
    return res.status(404).json({
      success: false,
      error: 'Ticket not found',
    });
  }

  // Create the comment
  const comment = await prisma.comment.create({
    data: {
      content,
      ticketId,
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

  // Create notifications for relevant users
  const notifyUsers = new Set<string>();

  // Notify ticket creator if the commenter is not the creator
  if (ticket.creatorId !== userId) {
    notifyUsers.add(ticket.creatorId);
  }

  // Notify ticket assignee if exists and is not the commenter
  if (ticket.assigneeId && ticket.assigneeId !== userId) {
    notifyUsers.add(ticket.assigneeId);
  }

  // Create notifications
  for (const userToNotify of notifyUsers) {
    await prisma.notification.create({
      data: {
        title: 'New Comment on Ticket',
        message: `New comment on ticket "${ticket.title}"`,
        userId: userToNotify,
        relatedTicketId: ticketId,
      },
    });
  }

  return res.status(201).json({
    success: true,
    data: comment,
  });
}
