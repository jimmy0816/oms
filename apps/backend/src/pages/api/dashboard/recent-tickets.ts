
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { AuthenticatedRequest, withAuth } from '@/middleware/auth';
import { ApiResponse, Permission, Ticket, TicketStatus } from 'shared-types';

async function getRecentTickets(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<Ticket[]>>
) {
  const userId = req.user.id;
  const userPermissions = req.user.permissions || [];

  const canViewAllTickets = userPermissions.includes(Permission.VIEW_ALL_TICKETS);

  let whereCondition: any = {};

  if (!canViewAllTickets) {
    const userRoles = await prisma.userRole.findMany({
      where: { userId: userId },
      select: { roleId: true },
    });
    const userRoleIds = userRoles.map(ur => ur.roleId);

    whereCondition.OR = [
      { creatorId: userId },
      { assigneeId: userId },
      {
        roleId: { in: userRoleIds },
        status: TicketStatus.PENDING,
      },
    ];
  }

  try {
    const recentTickets = await prisma.ticket.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      take: 5, // 只取最近的 5 筆
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(200).json({ success: true, data: recentTickets });
  } catch (error: any) {
    console.error('Error fetching recent tickets:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  }
}

export default withAuth(getRecentTickets);
