import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { AuthenticatedRequest, withAuth } from '@/middleware/auth';
import {
  ApiResponse,
  Permission,
  TicketStatus,
  TicketPriority,
} from 'shared-types';

interface DashboardMetrics {
  totalTickets: number;
  pendingTickets: number;
  resolvedTodayTickets: number;
  urgentTickets: number;
  // 可以根據需要添加更多指標
}

async function getDashboardMetrics(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<DashboardMetrics>>
) {
  const userId = req.user.id;
  const userPermissions = req.user.permissions || [];

  const canViewAllTickets = userPermissions.includes(
    Permission.VIEW_ALL_TICKETS
  );

  let whereCondition: any = {};

  if (!canViewAllTickets) {
    // 對於沒有 VIEW_ALL_TICKETS 權限的用戶，應用過濾規則
    const userRoles = await prisma.userRole.findMany({
      where: { userId: userId },
      select: { roleId: true },
    });
    const userRoleIds = userRoles.map((ur) => ur.roleId);

    whereCondition.OR = [
      { creatorId: userId }, // 自己建立的工單
      { assigneeId: userId }, // 自己認領的工單
      {
        // 被分配到該角色，且未接單待處理的工單
        roleId: { in: userRoleIds },
        status: TicketStatus.PENDING,
      },
    ];
  }

  try {
    const totalTickets = await prisma.ticket.count({
      where: whereCondition,
    });

    const pendingTickets = await prisma.ticket.count({
      where: {
        ...whereCondition,
        status: TicketStatus.PENDING,
      },
    });

    // 今日已解決的工單
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resolvedTodayTickets = await prisma.ticket.count({
      where: {
        ...whereCondition,
        status: TicketStatus.COMPLETED, // 假設 COMPLETED 表示已解決
        updatedAt: { gte: today },
      },
    });

    const urgentTickets = await prisma.ticket.count({
      where: {
        ...whereCondition,
        priority: TicketPriority.URGENT,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        totalTickets,
        pendingTickets,
        resolvedTodayTickets,
        urgentTickets,
      },
    });
  } catch (error: any) {
    console.error('Error fetching dashboard metrics:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  }
}

export default withAuth(getDashboardMetrics);
