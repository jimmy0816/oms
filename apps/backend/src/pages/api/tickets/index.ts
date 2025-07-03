import { NextApiRequest, NextApiResponse } from 'next';
import { prisma, getPrismaClientWithAudit } from '@/lib/prisma';
import {
  ApiResponse,
  CreateTicketRequest,
  PaginatedResponse,
  Ticket,
  TicketStatus,
  TicketPriority,
  FileInfo,
} from 'shared-types';
import { withApiHandler } from '@/lib/api-handler';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';

export default withApiHandler(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Ticket | PaginatedResponse<Ticket>>>
) {
  try {
    switch (req.method) {
      case 'GET':
        return await getTickets(req, res);
      case 'POST':
        return await withAuth(createTicket)(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res
          .status(405)
          .json({ success: false, error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Error in tickets API:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  }
});

async function getTickets(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<PaginatedResponse<Ticket>>>
) {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 10;
  const status = req.query.status as string | undefined;
  const priority = req.query.priority as string | undefined;
  const assigneeId = req.query.assigneeId as string | undefined;
  const creatorId = req.query.creatorId as string | undefined;

  const skip = (page - 1) * pageSize;

  // Build filter conditions
  const where: any = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assigneeId) where.assigneeId = assigneeId;
  if (creatorId) where.creatorId = creatorId;

  // Get tickets with pagination
  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
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
    }),
    prisma.ticket.count({ where }),
  ]);

  // 確保每個 ticket 的 status 和 priority 屬性都是正確的枚舉類型
  const ticketsWithCorrectTypes = tickets.map((ticket) => ({
    ...ticket,
    status: ticket.status as unknown as TicketStatus,
    priority: ticket.priority as unknown as TicketPriority,
  }));

  return res.status(200).json({
    success: true,
    data: {
      items: ticketsWithCorrectTypes,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

async function createTicket(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<Ticket>>
) {
  const { title, description, priority, assigneeId, attachments = [] } =
    req.body as CreateTicketRequest;

  const creatorId = req.user.id;
  const actor = req.user;

  if (!title || !description) {
    return res.status(400).json({
      success: false,
      error: 'Title and description are required',
    });
  }

  const prismaWithAudit = getPrismaClientWithAudit(actor);

  const ticket = await prismaWithAudit.ticket.create({
    data: {
      title,
      description,
      priority,
      status: TicketStatus.PENDING, // 設置默認狀態為待接單
      creatorId,
      assigneeId,
    },
  });

  // Create attachments if any
  if (attachments.length > 0) {
    const attachmentData = attachments.map((att) => ({
      filename: att.name,
      url: att.url,
      fileType: att.type,
      fileSize: att.size,
      uploadedById: creatorId,
      parentId: ticket.id,
      parentType: 'TICKET',
    }));
    await prismaWithAudit.attachment.createMany({
      data: attachmentData,
    });
  }

  // Create a notification for the assignee if one is assigned
  if (assigneeId) {
    await prismaWithAudit.notification.create({
      data: {
        title: 'New Ticket Assigned',
        message: `You have been assigned a new ticket: ${title}`,
        userId: assigneeId,
        relatedTicketId: ticket.id,
      },
    });
  }

  // 確保 status 和 priority 屬性都是正確的枚舉類型
  const ticketWithCorrectTypes: Ticket = {
    ...ticket,
    status: ticket.status as unknown as TicketStatus,
    priority: ticket.priority as unknown as TicketPriority,
  };

  return res.status(201).json({
    success: true,
    data: ticketWithCorrectTypes,
  });
}
