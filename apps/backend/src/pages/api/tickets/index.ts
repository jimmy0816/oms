import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import {
  ApiResponse,
  PaginatedResponse,
  Ticket,
  TicketStatus,
  TicketPriority,
  Permission,
  UserRole,
} from 'shared-types';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { ActivityLogService } from '@/services/activityLogService';
import { notificationService } from '@/services/notificationService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Ticket | PaginatedResponse<Ticket>>>
) {
  try {
    switch (req.method) {
      case 'GET':
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
}

async function getTickets(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<PaginatedResponse<Ticket>>>
) {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 10;
  const status = req.query.status as string | string[] | undefined;
  const priority = req.query.priority as string | string[] | undefined;
  const assigneeId = req.query.assigneeId as string | undefined;
  const creatorId = req.query.creatorId as string | undefined;
  const search = req.query.search as string | undefined;
  const locationIds = req.query.locationIds as string | string[] | undefined;
  const sortField = req.query.sortField as string | undefined;
  const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;

  const skip = (page - 1) * pageSize;

  const orderByClause: any = {};
  if (sortField && sortOrder) {
    if (sortField === 'creator' || sortField === 'assignee') {
      orderByClause[sortField] = { name: sortOrder };
    } else {
      orderByClause[sortField] = sortOrder;
    }
  } else {
    orderByClause.createdAt = 'desc';
  }

  const where: any = {};
  const andClauses = [];

  if (status) {
    const parsedStatus = Array.isArray(status) ? status : status.split(',');
    if (parsedStatus.length > 0) {
      andClauses.push({ status: { in: parsedStatus } });
    }
  }
  if (priority) {
    const parsedPriority = Array.isArray(priority)
      ? priority
      : priority.split(',');
    if (parsedPriority.length > 0) {
      andClauses.push({ priority: { in: parsedPriority } });
    }
  }
  if (assigneeId) andClauses.push({ assigneeId });
  if (creatorId) andClauses.push({ creatorId });

  if (locationIds) {
    let parsedLocationIds: string[] = [];
    if (Array.isArray(locationIds)) {
      parsedLocationIds = locationIds;
    } else if (typeof locationIds === 'string') {
      // 如果是逗號分隔的字串，則分割
      parsedLocationIds = locationIds.split(',');
    }

    if (parsedLocationIds.length > 0) {
      andClauses.push({
        reports: {
          some: {
            report: {
              locationId: {
                in: parsedLocationIds,
              },
            },
          },
        },
      });
    }
  }

  if (search) {
    andClauses.push({
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { creator: { name: { contains: search, mode: 'insensitive' } } },
        { assignee: { name: { contains: search, mode: 'insensitive' } } },
      ],
    });
  }

  const userId = req.user.id;
  const userPermissions = req.user.permissions || [];

  // 檢查用戶是否擁有 VIEW_ALL_TICKETS 權限
  const canViewAllTickets = userPermissions.includes(
    Permission.VIEW_ALL_TICKETS
  );

  if (!canViewAllTickets) {
    // 如果沒有 VIEW_ALL_TICKETS 權限，則應用過濾規則
    const userRoles = await prisma.userRole.findMany({
      where: { userId: userId },
      select: { roleId: true },
    });
    const userRoleIds = userRoles.map((ur) => ur.roleId);

    andClauses.push({
      OR: [
        { assigneeId: userId }, // 自己認領的工單
        {
          // 被分配到該角色，且未接單待處理的工單
          roleId: { in: userRoleIds },
          status: TicketStatus.PENDING, // 假設 'PENDING' 表示未接單待處理
        },
      ],
    });
  }

  if (andClauses.length > 0) {
    where.AND = andClauses;
  }

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: orderByClause,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        reports: {
          include: {
            report: {
              include: {
                location: true,
              },
            },
          },
        },
      },
    }),
    prisma.ticket.count({ where }),
  ]);

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
  const {
    title,
    description,
    priority,
    roleId,
    attachments = [],
    reportIds = [],
  } = req.body as any;

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
      roleId,
      reports: {
        create: reportIds.map((reportId: string) => ({
          report: { connect: { id: reportId } },
        })),
      },
    },
  });

  await ActivityLogService.createActivityLog(
    `建立工單`,
    creatorId,
    ticket.id,
    'TICKET'
  );

  if (attachments.length > 0) {
    const attachmentData = attachments.map((att: any) => ({
      filename: att.name,
      url: att.url,
      fileType: att.type,
      fileSize: att.size,
      createdById: creatorId,
      parentId: ticket.id,
      parentType: 'TICKET',
    }));
    await prisma.attachment.createMany({ data: attachmentData });
  }

  // --- Add Notification Logic ---
  if (roleId) {
    const usersInRole = await prisma.userRole.findMany({
      where: { roleId },
      select: { userId: true },
    });

    const notificationPromises = usersInRole.map((userRole) =>
      notificationService.create({
        userId: userRole.userId,
        title: '新工單指派給您的角色',
        message: `新工單「${ticket.title}」已指派給您的角色。`,
        relatedId: ticket.id,
        relatedType: 'TICKET',
      })
    );

    await Promise.all(notificationPromises);
  }
  // --- End Notification Logic ---

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
