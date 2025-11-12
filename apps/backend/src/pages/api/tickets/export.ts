import {
  Permission,
  TicketStatus,
  TicketPriority,
} from 'shared-types';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';

// Helper functions to map values
const getStatusText = (status: TicketStatus) => {
  switch (status) {
    case TicketStatus.PENDING:
      return '待處理';
    case TicketStatus.IN_PROGRESS:
      return '進行中';
    case TicketStatus.COMPLETED:
      return '已完工';
    case TicketStatus.VERIFIED:
      return '已驗收';
    case TicketStatus.FAILED:
      return '無法完工';
    case TicketStatus.VERIFICATION_FAILED:
      return '驗收失敗';
    default:
      return status;
  }
};

const getPriorityText = (priority: TicketPriority) => {
  switch (priority) {
    case TicketPriority.LOW:
      return '低';
    case TicketPriority.MEDIUM:
      return '中';
    case TicketPriority.HIGH:
      return '高';
    case TicketPriority.URGENT:
      return '緊急';
    default:
      return priority;
  }
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const {
      status,
      priority,
      assigneeIds,
      creatorIds,
      search,
      locationIds,
      roleIds,
      sortField,
      sortOrder,
      startDate,
      endDate,
    } = req.body;

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
        const filteredAssigneeIds = parsedAssigneeIds.filter(
          (id) => id !== 'UNASSIGNED'
        );

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
      const parsedRoleIds = Array.isArray(roleIds)
        ? roleIds
        : roleIds.split(',');
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

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const tickets = await prisma.ticket.findMany({
      where,
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
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Tickets');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 15 },
      { header: '標題', key: 'title', width: 30 },
      { header: '描述', key: 'description', width: 50 },
      { header: '狀態', key: 'status', width: 15 },
      { header: '優先級', key: 'priority', width: 15 },
      { header: '位置', key: 'location', width: 20 },
      { header: '負責單位', key: 'role', width: 20 },
      { header: '負責人', key: 'assignee', width: 20 },
      { header: '建立者', key: 'creator', width: 20 },
      { header: '建立時間', key: 'createdAt', width: 25 },
      { header: '更新日期', key: 'updatedAt', width: 25 },
    ];

    tickets.forEach((ticket) => {
      const locations = ticket.reports
        .map((r) => r.report.location?.name)
        .filter(Boolean)
        .join(', ');
      const descriptions = ticket.reports
        .map((r) => r.report.description)
        .filter(Boolean)
        .join('\n');

      worksheet.addRow({
        id: ticket.id,
        title: ticket.title,
        description: descriptions || 'N/A',
        status: getStatusText(ticket.status as TicketStatus),
        priority: getPriorityText(ticket.priority as TicketPriority),
        location: locations || 'N/A',
        role: ticket.role?.name || 'N/A',
        assignee: ticket.assignee?.name || 'N/A',
        creator: ticket.creator?.name || 'N/A',
        createdAt: format(new Date(ticket.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        updatedAt: format(new Date(ticket.updatedAt), 'yyyy-MM-dd HH:mm:ss'),
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + 'tickets.xlsx'
    );

    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);
  } catch (error: any) {
    console.error('Error in tickets export API:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  }
}

export default withPermission(Permission.EXPORT_TICKETS)(handler);
