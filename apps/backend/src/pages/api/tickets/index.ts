import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
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
        // GET 請求也應該經過認證，以獲取 req.user
        return await withAuth(getTickets)(req, res);
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
  req: AuthenticatedRequest,
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
    // 直接使用導入的 prisma 實例
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
  req: AuthenticatedRequest, // <-- 這裡必須是 AuthenticatedRequest
  res: NextApiResponse<ApiResponse<Ticket>>
) {
  const {
    title,
    description,
    priority,
    roleId, // 改為 roleId
    attachments = [],
    reportIds = [],
  } = req.body as any; // 型別同步調整

  const creatorId = req.user.id;

  if (!title || !description) {
    return res.status(400).json({
      success: false,
      error: 'Title and description are required',
    });
  }

  const ticket = await prisma.ticket.create({
    data: {
      title,
      description,
      priority,
      status: TicketStatus.PENDING,
      creatorId,
      roleId, // 存 roleId
      // assigneeId 預設為空
      reports: {
        create: reportIds.map((reportId) => ({
          report: {
            connect: { id: reportId },
          },
        })),
      },
    },
  });

  // 建立附件
  if (attachments.length > 0) {
    const attachmentData = attachments.map((att) => ({
      filename: att.name,
      url: att.url,
      fileType: att.type,
      fileSize: att.size,
      createdById: creatorId,
      parentId: ticket.id,
      parentType: 'TICKET',
    }));
    await prisma.attachment.createMany({
      data: attachmentData,
    });
  }

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
