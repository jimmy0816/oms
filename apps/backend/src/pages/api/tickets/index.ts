import { IdService } from '@/services/idService';
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import {
  ApiResponse,
  PaginatedResponse,
  Ticket,
  TicketStatus,
  TicketPriority,
  Permission,
} from 'shared-types';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { ActivityLogService } from '@/services/activityLogService';
import { notificationService } from '@/services/notificationService';
import { Prisma } from '@prisma/client'; // Corrected import path

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
  const pageSize = Number(req.query.pageSize) || 20;
  const status = req.query.status as string | string[] | undefined;
  const priority = req.query.priority as string | string[] | undefined;
  const assigneeIds = req.query.assigneeIds as string | string[] | undefined;
  const creatorIds = req.query.creatorIds as string | string[] | undefined;
  const search = req.query.search as string | undefined;
  const locationIds = req.query.locationIds as string | string[] | undefined;
  const roleIds = req.query.roleIds as string | string[] | undefined;
  const sortField = req.query.sortField as string | undefined;
  const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;

  const skip = (page - 1) * pageSize;

  // --- Start of location sort specific logic ---
  if (sortField === 'location') {
    const rawWhereClausesSql: Prisma.Sql[] = []; // Changed type back to Prisma.Sql[]

    if (status) {
      const parsedStatus = Array.isArray(status) ? status : status.split(',');
      if (parsedStatus.length > 0) {
        rawWhereClausesSql.push(
          Prisma.sql`t.status IN (${Prisma.join(parsedStatus)})`
        );
      }
    }
    if (priority) {
      const parsedPriority = Array.isArray(priority)
        ? priority
        : priority.split(',');
      if (parsedPriority.length > 0) {
        rawWhereClausesSql.push(
          Prisma.sql`t.priority IN (${Prisma.join(parsedPriority)})`
        );
      }
    }
    if (assigneeIds) {
      const parsedAssigneeIds = Array.isArray(assigneeIds)
        ? assigneeIds
        : assigneeIds.split(',');
      if (parsedAssigneeIds.length > 0) {
        const hasUnassigned = parsedAssigneeIds.includes('UNASSIGNED');
        const filteredAssigneeIds = parsedAssigneeIds.filter(id => id !== 'UNASSIGNED');

        if (hasUnassigned && filteredAssigneeIds.length > 0) {
          rawWhereClausesSql.push(Prisma.sql`(t."assigneeId" IS NULL OR t."assigneeId" IN (${Prisma.join(filteredAssigneeIds)}))`);
        } else if (hasUnassigned) {
          rawWhereClausesSql.push(Prisma.sql`t."assigneeId" IS NULL`);
        } else if (filteredAssigneeIds.length > 0) {
          rawWhereClausesSql.push(Prisma.sql`t."assigneeId" IN (${Prisma.join(filteredAssigneeIds)})`);
        }
      }
    }
    if (creatorIds) {
      const parsedCreatorIds = Array.isArray(creatorIds)
        ? creatorIds
        : creatorIds.split(',');
      if (parsedCreatorIds.length > 0) {
        rawWhereClausesSql.push(Prisma.sql`t."creatorId" IN (${Prisma.join(parsedCreatorIds)})`);
      }
    }

    if (locationIds) {
      let parsedLocationIds: string[] = [];
      if (Array.isArray(locationIds)) {
        parsedLocationIds = locationIds;
      } else if (typeof locationIds === 'string') {
        parsedLocationIds = locationIds.split(',');
      }

      if (parsedLocationIds.length > 0) {
        rawWhereClausesSql.push(Prisma.sql`EXISTS (
          SELECT 1
          FROM "ReportTicket" rt_filter
          JOIN "Report" r_filter ON rt_filter."reportId" = r.id
          WHERE rt_filter."ticketId" = t.id AND r_filter."locationId" IN (${Prisma.join(
            parsedLocationIds
          )})
        )`);
      }
    }

    if (roleIds) {
      const parsedRoleIds = Array.isArray(roleIds)
        ? roleIds
        : roleIds.split(',');
      if (parsedRoleIds.length > 0) {
        rawWhereClausesSql.push(
          Prisma.sql`t."roleId" IN (${Prisma.join(parsedRoleIds)})`
        );
      }
    }

    if (search) {
      const searchPattern = `%${search}%`;
      rawWhereClausesSql.push(Prisma.sql`(
        t.title ILIKE ${searchPattern} OR
        t.id ILIKE ${searchPattern} OR
        creator.name ILIKE ${searchPattern} OR
        assignee.name ILIKE ${searchPattern} OR
        role.name ILIKE ${searchPattern}
      )`);
    }

    const userId = req.user.id;
    const userPermissions = req.user.permissions || [];
    const canViewAllTickets = userPermissions.includes(
      Permission.VIEW_ALL_TICKETS
    );

    if (!canViewAllTickets) {
      const userRoles = await prisma.userRole.findMany({
        where: { userId: userId },
        select: { roleId: true },
      });
      const userRoleIds = userRoles.map((ur) => ur.roleId);

      if (userRoleIds.length > 0) {
        rawWhereClausesSql.push(Prisma.sql`(
          t."assigneeId" = ${userId} OR
          (t."roleId" IN (${Prisma.join(userRoleIds)}) AND t.status = ${
            TicketStatus.PENDING
          })
        )`);
      } else {
        rawWhereClausesSql.push(Prisma.sql`t."assigneeId" = ${userId}`);
      }
    }

    const whereSql =
      rawWhereClausesSql.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(rawWhereClausesSql, ' AND ')}`
        : Prisma.empty;

    const fromAndJoins = Prisma.sql`
      FROM "Ticket" AS t
      LEFT JOIN (
        SELECT DISTINCT ON ("ticketId")
          rt."ticketId",
          l.name as "locationName"
        FROM "ReportTicket" rt
        JOIN "Report" r ON rt."reportId" = r.id
        JOIN "Location" l ON r."locationId" = l.id
        ORDER BY rt."ticketId", r."createdAt" DESC
      ) AS loc ON t.id = loc."ticketId"
      LEFT JOIN "User" AS creator ON t."creatorId" = creator.id
      LEFT JOIN "User" AS assignee ON t."assigneeId" = assignee.id
      LEFT JOIN "Role" AS role ON t."roleId" = role.id
    `;

    const countQuery = Prisma.sql`SELECT COUNT(t.id) ${fromAndJoins} ${whereSql}`;
    const sortOrderSql =
      sortOrder === 'asc'
        ? Prisma.sql`ASC NULLS LAST`
        : Prisma.sql`DESC NULLS LAST`;

    const sortedTicketsQuery = Prisma.sql`
      SELECT t.id
      ${fromAndJoins}
      ${whereSql}
      ORDER BY loc."locationName" ${sortOrderSql}
      LIMIT ${pageSize}
      OFFSET ${skip}
    `;

    const [totalResult, sortedTicketsResult] = await Promise.all([
      prisma.$queryRaw<[{ count: bigint }]>(countQuery),
      prisma.$queryRaw<{ id: string }[]>(sortedTicketsQuery),
    ]);

    const total = Number(totalResult[0].count);
    const ticketIds = sortedTicketsResult.map((t) => t.id);

    if (ticketIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          items: [],
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    }

    const tickets = await prisma.ticket.findMany({
      where: { id: { in: ticketIds } },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        role: { select: { id: true, name: true } },
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
    });

    const sortedTickets = ticketIds
      .map((id) => tickets.find((t) => t.id === id))
      .filter((t): t is NonNullable<typeof t> => t !== undefined);

    const ticketsWithCorrectTypes = sortedTickets.map((ticket) => ({
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
  // --- End of location sort specific logic ---

  // Original logic for other sort fields
  const orderByClause: any = {};
  if (sortField && sortOrder) {
    if (
      sortField === 'creator' ||
      sortField === 'assignee' ||
      sortField === 'role'
    ) {
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
  if (assigneeIds) {
    const parsedAssigneeIds = Array.isArray(assigneeIds)
      ? assigneeIds
      : assigneeIds.split(',');
    if (parsedAssigneeIds.length > 0) {
      const hasUnassigned = parsedAssigneeIds.includes('UNASSIGNED');
      const filteredAssigneeIds = parsedAssigneeIds.filter(id => id !== 'UNASSIGNED');

      if (hasUnassigned && filteredAssigneeIds.length > 0) {
        andClauses.push({
          OR: [
            { assigneeId: null },
            { assigneeId: { in: filteredAssigneeIds } },
          ],
        });
      } else if (hasUnassigned) {
        andClauses.push({ assigneeId: null });
      } else if (filteredAssigneeIds.length > 0) {
        andClauses.push({ assigneeId: { in: filteredAssigneeIds } });
      }
    }
  }
  if (creatorIds) {
    const parsedCreatorIds = Array.isArray(creatorIds)
      ? creatorIds
      : creatorIds.split(',');
    if (parsedCreatorIds.length > 0) {
      andClauses.push({ creatorId: { in: parsedCreatorIds } });
    }
  }

  if (locationIds) {
    let parsedLocationIds: string[] = [];
    if (Array.isArray(locationIds)) {
      parsedLocationIds = locationIds;
    } else if (typeof locationIds === 'string') {
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

  if (roleIds) {
    const parsedRoleIds = Array.isArray(roleIds) ? roleIds : roleIds.split(',');
    if (parsedRoleIds.length > 0) {
      andClauses.push({ roleId: { in: parsedRoleIds } });
    }
  }

  if (search) {
    andClauses.push({
      OR: [
        { id: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { creator: { name: { contains: search, mode: 'insensitive' } } },
        { assignee: { name: { contains: search, mode: 'insensitive' } } },
        { role: { name: { contains: search, mode: 'insensitive' } } },
      ],
    });
  }

  const userId = req.user.id;
  const userPermissions = req.user.permissions || [];

  const canViewAllTickets = userPermissions.includes(
    Permission.VIEW_ALL_TICKETS
  );

  if (!canViewAllTickets) {
    const userRoles = await prisma.userRole.findMany({
      where: { userId: userId },
      select: { roleId: true },
    });
    const userRoleIds = userRoles.map((ur) => ur.roleId);

    andClauses.push({
      OR: [
        { assigneeId: userId },
        {
          roleId: { in: userRoleIds },
          status: TicketStatus.PENDING,
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
        role: { select: { id: true, name: true } },
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
  const newId = await IdService.generateId('W');

  if (!title || !description) {
    return res.status(400).json({
      success: false,
      error: 'Title and description are required',
    });
  }

  const ticket = await prisma.ticket.create({
    data: {
      id: newId,
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
