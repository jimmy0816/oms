import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import {
  ApiResponse,
  ReportTicket,
  ReportStatus,
  Permission,
} from 'shared-types';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import {
  reportMutationService,
  type UpdateReportPayload,
} from '@/services/reportMutationService';
import { reportIntegrationService } from '@/services/reportIntegrationService';

// Define Report type based on Prisma schema
interface Report {
  id: string;
  title: string;
  description: string;
  location?: string | null;
  status: string;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
  creatorId: string;
  assigneeId?: string | null;
  bitbucketIssueId?: string | null;
  jiraIssueId?: string | null;
  jiraIssueKey?: string | null;
  category?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
  } | null;
  comments?: Array<{
    id: string;
    content: string;
    createdAt: Date;
    userId: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  tickets?: ReportTicket[];
  attachments?: Array<{
    id: string;
    filename: string;
    url: string;
    fileType: string;
    fileSize: number;
    createdAt: Date;
    createdById?: string | null;
    createdBy?: {
      id: string;
      name: string;
      email: string;
    } | null;
  }>;
  activityLogs?: Array<{
    id: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
    parentId: string;
    parentType: string;
  }>;
}

// Define UpdateReportRequest type
interface UpdateReportRequest extends UpdateReportPayload {
  status?: ReportStatus;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Report>>
) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid report ID',
    });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getReportById(id, req, res);
      case 'PUT':
        return await updateReport(id, req, res);
      case 'DELETE':
        return await deleteReport(id, req, res);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res
          .status(405)
          .json({ success: false, error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error(`Error in reports/${id} API:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  }
}

async function getReportById(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Report>>
) {
  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      location: true, // Include location data
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
      },
      tickets: {
        include: {
          ticket: {
            include: {
              assignee: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              creator: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!report) {
    return res.status(404).json({
      success: false,
      error: 'Report not found',
    });
  }

  // Fetch attachments separately using polymorphic relation
  const attachments = await prisma.attachment.findMany({
    where: {
      parentId: id,
      parentType: 'REPORT',
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
      parentType: 'REPORT',
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

  // Manually fetch activity logs for each ticket
  if (report.tickets) {
    for (const reportTicket of report.tickets) {
      const ticketLogs = await prisma.activityLog.findMany({
        where: {
          parentId: reportTicket.ticket.id,
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
      (reportTicket.ticket as any).activityLogs = ticketLogs;
    }
  }

  // Manually attach attachments and activityLogs to the report object
  const reportWithRelations = {
    ...report,
    attachments,
    activityLogs,
  };

  // console.log('report', reportWithRelations);

  return res.status(200).json({
    success: true,
    data: reportWithRelations,
  });
}

async function updateReport(
  id: string,
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<Report>>
) {
  const {
    title,
    description,
    locationId,
    status,
    priority,
    assigneeId,
    categoryId,
    contactPhone,
    contactEmail,
    trackingDate,
    attachments,
    ticketIds,
  } = req.body as UpdateReportRequest;

  const existingReport = await prisma.report.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          parent: {
            select: {
              id: true,
              name: true,
              parent: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!existingReport) {
    return res.status(404).json({
      success: false,
      error: 'Report not found',
    });
  }

  const userId = req.user.id; // 從認證請求中獲取用戶ID

  // Check for REJECTED -> UNCONFIRMED transition
  if (
    status === ReportStatus.UNCONFIRMED &&
    existingReport.status === ReportStatus.REJECTED
  ) {
    const userPermissions = (req.user.permissions as string[]) || [];
    if (!userPermissions.includes(Permission.REVIEW_REPORTS)) {
      return res.status(403).json({
        success: false,
        error: '您沒有權限執行此操作 (需具備審核通報權限)',
      });
    }
  }

  const shouldUpdateStatus =
    status !== undefined && status !== existingReport.status;

  try {
    const nonStatusUpdateResult = await reportMutationService.applyNonStatusUpdate({
      reportId: id,
      userId,
      existingReport,
      payload: {
        title,
        description,
        locationId,
        priority,
        assigneeId,
        categoryId,
        contactPhone,
        contactEmail,
        trackingDate,
        attachments,
        ticketIds,
      },
    });

    let finalUpdatedReport = nonStatusUpdateResult.report;
    const oldCategoryName = existingReport.category?.name || null;
    const newCategoryName = finalUpdatedReport.category?.name || null;

    if (shouldUpdateStatus && status) {
      const statusUpdateResult = await reportMutationService.updateReportStatus({
        reportId: id,
        targetStatus: status,
        actorUserId: userId,
        source: 'REPORT_API',
        syncBitbucketState: true,
        syncJiraState: true,
        sendChatNotification: false,
        createActivityLog: true,
      });

      if (statusUpdateResult.changed && statusUpdateResult.report) {
        finalUpdatedReport = {
          ...finalUpdatedReport,
          status: statusUpdateResult.report.status,
          updatedAt: (statusUpdateResult.report as any).updatedAt,
        };
      }
    }

    finalUpdatedReport = await reportIntegrationService.syncCategoryChange(
      existingReport as any,
      finalUpdatedReport as any
    );

    // 發送 Google Chat 更新通知
    const changes: Record<string, { old: any; new: any }> = {
      ...nonStatusUpdateResult.changes,
    };

    if (status !== undefined && status !== existingReport.status) {
      changes.status = { old: existingReport.status, new: status };
    }

    if (oldCategoryName !== newCategoryName) {
      changes.category = {
        old: oldCategoryName || '未分類',
        new: newCategoryName || '未分類',
      };
    }

    await reportIntegrationService.sendReportUpdateChatNotification(
      id,
      finalUpdatedReport,
      changes
    );

    return res.status(200).json({
      success: true,
      data: finalUpdatedReport,
    });
  } catch (error: any) {
    console.error(`Error updating report ${id}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update report.',
    });
  }
}

async function deleteReport(
  id: string,
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<Report>>
) {
  // 先取得完整的通報資料（包含相關聯的資料）用於發送刪除通知
  const existingReport = await prisma.report.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      chatThread: {
        select: {
          chatSpaceId: true,
          chatThreadId: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          parent: {
            select: {
              id: true,
              name: true,
              parent: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!existingReport) {
    return res.status(404).json({
      success: false,
      error: 'Report not found',
    });
  }

  try {
    // 先快照 thread，刪除成功後再做外部副作用，避免刪除失敗時需要 rollback
    const threadSnapshot = existingReport.chatThread
      ? {
          chatSpaceId: existingReport.chatThread.chatSpaceId,
          chatThreadId: existingReport.chatThread.chatThreadId,
        }
      : null;

    const deletedReportData = await prisma.$transaction(async (tx) => {
      // 1. 刪除相關的 ActivityLog (for the report itself)
      await tx.activityLog.deleteMany({
        where: { parentId: id, parentType: 'REPORT' },
      });

      // 2. 刪除相關的 Attachments
      await tx.attachment.deleteMany({
        where: { parentId: id, parentType: 'REPORT' },
      });

      // 3. 刪除相關的 Comments
      await tx.comment.deleteMany({
        where: { reportId: id },
      });

      // 4. 刪除相關的 Notifications
      await tx.notification.deleteMany({
        where: { relatedId: id, relatedType: 'REPORT' },
      });

      // 5. 刪除與工單的關聯 (ReportTicket)
      await tx.reportTicket.deleteMany({
        where: { reportId: id },
      });

      // 6. 最後，刪除通報本身
      const deletedReport = await tx.report.delete({
        where: { id },
      });

      return deletedReport;
    });

    try {
      await reportIntegrationService.teardownExternalIntegrationsAfterReportDelete(
        existingReport as any
      );
    } catch (error: any) {
      console.error('[Report Deleted] Bitbucket 解聯失敗:', error.message);
    }

    try {
      if (threadSnapshot) {
        await reportIntegrationService.sendReportDeleteChatNotificationToThread({
          reportId: id,
          report: existingReport,
          chatSpaceId: threadSnapshot.chatSpaceId,
          chatThreadId: threadSnapshot.chatThreadId,
        });
      }
    } catch (error: any) {
      console.error('[Report Deleted] Google Chat 通知發送失敗:', error.message);
      // 不阻斷主流程，維持刪除成功
    }

    return res.status(200).json({
      success: true,
      data: deletedReportData,
    });
  } catch (error: any) {
    console.error(`Error deleting report ${id}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete report and its related data.',
    });
  }
}

export default withAuth(handler);
