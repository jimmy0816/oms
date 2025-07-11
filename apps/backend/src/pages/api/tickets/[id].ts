import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import {
  ApiResponse,
  Ticket,
  UpdateTicketRequest,
  TicketStatus,
  TicketPriority,
} from 'shared-types';
import { withAuth } from '@/middleware/auth';
import { notificationService } from '@/services/notificationService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Ticket>>
) {
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
      case 'PATCH':
        return await withAuth(claimTicket)(req, res);
      case 'DELETE':
        return await deleteTicket(id, res);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE']);
        return res
          .status(405)
          .json({ success: false, error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Error in ticket API:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  }
}

async function getTicket(
  id: string,
  res: NextApiResponse<ApiResponse<Ticket>>
) {
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
      reports: {
        include: {
          report: true,
        },
      },
      role: true,
    },
  });

  if (!ticket) {
    return res.status(404).json({ success: false, error: 'Ticket not found' });
  }

  // Fetch attachments separately using polymorphic relation
  const attachments = await prisma.attachment.findMany({
    where: {
      parentId: id,
      parentType: 'TICKET',
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Fetch activity logs separately using polymorphic relation
  const activityLogs = await prisma.activityLog.findMany({
    where: {
      parentId: id,
      parentType: 'TICKET',
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
    orderBy: { createdAt: 'asc' },
  });

  // 確保 status 和 priority 屬性都是正確的枚舉類型
  const ticketWithCorrectTypes: Ticket = {
    ...ticket,
    status: ticket.status as unknown as TicketStatus,
    priority: ticket.priority as unknown as TicketPriority,
    attachments,
    activityLogs,
  };

  return res.status(200).json({ success: true, data: ticketWithCorrectTypes });
}

async function updateTicket(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Ticket>>
) {
  const { title, description, status, priority, assigneeId, reportIds } =
    req.body as UpdateTicketRequest;

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

  // Handle reportIds update
  if (reportIds !== undefined) {
    updateData.reports = {
      set: reportIds.map((reportId) => ({
        reportId: reportId,
        ticketId: id,
      })),
    };
  }

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
      reports: {
        // Include reports in the response
        include: {
          report: true,
        },
      },
    },
  });

  // Create notification for status change
  if (status && status !== existingTicket.status) {
    await notificationService.create({
      title: '工單狀態更新',
      message: `工單「${updatedTicket.title}」的狀態已變更為 ${status}`,
      userId: existingTicket.creatorId,
      relatedId: id,
      relatedType: 'TICKET',
    });
  }

  // Create notification for assignee change
  if (assigneeId && assigneeId !== existingTicket.assigneeId) {
    await notificationService.create({
      title: '工單已指派',
      message: `您已被指派到工單「${updatedTicket.title}」`,
      userId: assigneeId,
      relatedId: id,
      relatedType: 'TICKET',
    });
  }

  // 確保 status 和 priority 屬性都是正確的枚舉類型
  const ticketWithCorrectTypes: Ticket = {
    ...updatedTicket,
    status: updatedTicket.status as unknown as TicketStatus,
    priority: updatedTicket.priority as unknown as TicketPriority,
  };

  return res.status(200).json({ success: true, data: ticketWithCorrectTypes });
}

async function deleteTicket(
  id: string,
  res: NextApiResponse<ApiResponse<Ticket>>
) {
  // Check if ticket exists
  const existingTicket = await prisma.ticket.findUnique({ where: { id } });
  if (!existingTicket) {
    return res.status(404).json({ success: false, error: 'Ticket not found' });
  }

  // Delete related notifications
  await prisma.notification.deleteMany({
    where: { relatedId: id, relatedType: 'TICKET' },
  });

  // Delete related comments
  await prisma.comment.deleteMany({
    where: { ticketId: id },
  });

  // Delete the ticket
  const deletedTicket = await prisma.ticket.delete({
    where: { id },
  });

  // 確保 status 和 priority 屬性都是正確的枚舉類型
  const ticketWithCorrectTypes: Ticket = {
    ...deletedTicket,
    status: deletedTicket.status as unknown as TicketStatus,
    priority: deletedTicket.priority as unknown as TicketPriority,
  };

  return res.status(200).json({ success: true, data: ticketWithCorrectTypes });
}

async function claimTicket(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Ticket>>
) {
  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ success: false, error: 'Invalid ticket ID' });
  }
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ success: false, error: '未登入' });
  }
  const { action } = req.body;
  if (action !== 'claim') {
    return res.status(400).json({ success: false, error: '不支援的操作' });
  }
  // 查詢工單
  const ticket = await prisma.ticket.findUnique({
    where: { id: id as string },
  });
  if (!ticket) {
    return res.status(404).json({ success: false, error: '工單不存在' });
  }
  if (ticket.assigneeId) {
    return res.status(400).json({ success: false, error: '工單已被認領' });
  }
  if (ticket.status !== 'PENDING') {
    return res.status(400).json({ success: false, error: '工單狀態非待接單' });
  }
  // 權限判斷
  const hasClaimPermission = user.permissions?.includes('claim_tickets');
  if (!hasClaimPermission) {
    return res.status(403).json({ success: false, error: '沒有認領工單權限' });
  }
  // 認領
  const updated = await prisma.ticket.update({
    where: { id: id as string },
    data: {
      assigneeId: user.id,
      status: 'IN_PROGRESS',
    },
  });

  // Create notification for claiming the ticket
  await notificationService.create({
    title: '工單已認領',
    message: `您已認領並被指派到工單「${updated.title}」`,
    userId: user.id,
    relatedId: updated.id,
    relatedType: 'TICKET',
  });

  return res.status(200).json({ success: true, data: updated });
}
