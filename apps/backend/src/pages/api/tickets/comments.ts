import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { ApiResponse, Comment, CreateCommentRequest } from 'shared-types';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { notificationService } from '@/services/notificationService';

export default async function handler(
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
}

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

  // --- Start Notification Logic ---
  const commenterName = comment.user.name || '有人';
  const notificationMessage = `${commenterName} 在工單「${ticket.title}」留言`;

  const recipients = new Set<string>();
  
  // Notify ticket creator if the commenter is not the creator
  if (ticket.creatorId !== userId) {
    recipients.add(ticket.creatorId);
  }
  // Notify ticket assignee if exists and is not the commenter
  if (ticket.assigneeId && ticket.assigneeId !== userId) {
    recipients.add(ticket.assigneeId);
  }

  // Notify all previous commenters on this ticket
  const previousCommenters = await prisma.comment.findMany({
    where: { ticketId: ticket.id },
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
      title: '工單新留言',
      message: notificationMessage,
      userId: recipientId,
      relatedId: ticketId,
      relatedType: 'TICKET',
    })
  );

  await Promise.all(notificationPromises);
  // --- End Notification Logic ---

  return res.status(201).json({
    success: true,
    data: comment,
  });
}