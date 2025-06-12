import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from 'prisma-client';
import { ApiResponse, Ticket, UpdateTicketRequest } from 'shared-types';
import cors from 'cors';

// Helper function to run middleware
const runMiddleware = (req: NextApiRequest, res: NextApiResponse, fn: Function) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
};

// Initialize CORS middleware
const corsMiddleware = cors({
  methods: ['GET', 'PUT', 'DELETE'],
  origin: '*', // In production, specify your frontend URL
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Ticket>>
) {
  // Run the CORS middleware
  await runMiddleware(req, res, corsMiddleware);

  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ success: false, error: 'Invalid ticket ID' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getTicket(id, res);
      case 'PUT':
        return await updateTicket(id, req, res);
      case 'DELETE':
        return await deleteTicket(id, res);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Error in ticket API:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}

async function getTicket(id: string, res: NextApiResponse<ApiResponse<Ticket>>) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      comments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!ticket) {
    return res.status(404).json({ success: false, error: 'Ticket not found' });
  }

  return res.status(200).json({ success: true, data: ticket });
}

async function updateTicket(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Ticket>>
) {
  const { title, description, status, priority, assigneeId } = req.body as UpdateTicketRequest;
  
  // Check if ticket exists
  const existingTicket = await prisma.ticket.findUnique({ where: { id } });
  if (!existingTicket) {
    return res.status(404).json({ success: false, error: 'Ticket not found' });
  }

  // Prepare update data
  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (status !== undefined) updateData.status = status;
  if (priority !== undefined) updateData.priority = priority;
  if (assigneeId !== undefined) updateData.assigneeId = assigneeId;

  // Update ticket
  const updatedTicket = await prisma.ticket.update({
    where: { id },
    data: updateData,
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Create notification for status change
  if (status && status !== existingTicket.status) {
    await prisma.notification.create({
      data: {
        title: 'Ticket Status Updated',
        message: `Ticket "${updatedTicket.title}" status changed to ${status}`,
        userId: existingTicket.creatorId,
        relatedTicketId: id,
      },
    });
  }

  // Create notification for assignee change
  if (assigneeId && assigneeId !== existingTicket.assigneeId) {
    await prisma.notification.create({
      data: {
        title: 'Ticket Assigned',
        message: `You have been assigned to ticket "${updatedTicket.title}"`,
        userId: assigneeId,
        relatedTicketId: id,
      },
    });
  }

  return res.status(200).json({ success: true, data: updatedTicket });
}

async function deleteTicket(id: string, res: NextApiResponse<ApiResponse<Ticket>>) {
  // Check if ticket exists
  const existingTicket = await prisma.ticket.findUnique({ where: { id } });
  if (!existingTicket) {
    return res.status(404).json({ success: false, error: 'Ticket not found' });
  }

  // Delete related notifications
  await prisma.notification.deleteMany({
    where: { relatedTicketId: id },
  });

  // Delete related comments
  await prisma.comment.deleteMany({
    where: { ticketId: id },
  });

  // Delete the ticket
  const deletedTicket = await prisma.ticket.delete({
    where: { id },
  });

  return res.status(200).json({ success: true, data: deletedTicket });
}
