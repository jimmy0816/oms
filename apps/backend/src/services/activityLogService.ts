import { prisma } from 'prisma-client';
import { ActivityLog, CreateActivityLogRequest } from 'shared-types';

export class ActivityLogService {
  static async createActivityLog(
    content: string,
    userId: string,
    parentId: string,
    parentType: 'TICKET' | 'REPORT'
  ): Promise<ActivityLog> {
    const activityLog = await prisma.activityLog.create({
      data: {
        content,
        userId,
        parentId,
        parentType,
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
    return activityLog;
  }

  static async getActivityLogs(
    parentId: string,
    parentType: 'TICKET' | 'REPORT'
  ): Promise<ActivityLog[]> {
    const activityLogs = await prisma.activityLog.findMany({
      where: {
        parentId,
        parentType,
      },
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
    return activityLogs;
  }
}
