import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { ApiResponse, Ticket, ReportTicket, ReportStatus } from 'shared-types';
import { notificationService } from '@/services/notificationService';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';

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
interface UpdateReportRequest {
  title?: string;
  description?: string;
  locationId?: number;
  status?: ReportStatus;
  priority?: string;
  assigneeId?: string | null;
  categoryId?: string;
  contactPhone?: string;
  contactEmail?: string;
  ticketIds?: string[];
  attachments?: any[];
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
    attachments,
    ticketIds,
  } = req.body as UpdateReportRequest;

  const existingReport = await prisma.report.findUnique({
    where: { id },
    include: { attachments: true },
  });

  if (!existingReport) {
    return res.status(404).json({
      success: false,
      error: 'Report not found',
    });
  }

  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (locationId !== undefined) updateData.locationId = locationId;
  if (status !== undefined) updateData.status = status;
  if (priority !== undefined) updateData.priority = priority;
  if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
  if (categoryId !== undefined) updateData.categoryId = categoryId;
  if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
  if (contactEmail !== undefined) updateData.contactEmail = contactEmail;

  try {
    const updatedReport = await prisma.$transaction(async (tx) => {
      // Handle attachments update
      if (attachments !== undefined) {
        const currentAttachmentIds = existingReport.attachments.map(
          (a) => a.id
        );
        const newAttachmentIds = attachments
          .map((a: any) => a.id)
          .filter(Boolean);

        const attachmentsToDelete = currentAttachmentIds.filter(
          (id) => !newAttachmentIds.includes(id)
        );
        const attachmentsToCreate = attachments.filter((a: any) => !a.id);

        if (attachmentsToDelete.length > 0) {
          await tx.attachment.deleteMany({
            where: { id: { in: attachmentsToDelete } },
          });
        }

        if (attachmentsToCreate.length > 0) {
          await tx.attachment.createMany({
            data: attachmentsToCreate.map((a: any) => ({
              ...a,
            })),
          });
        }
      }

      // Handle ticketIds update
      if (ticketIds !== undefined) {
        updateData.tickets = {
          set: ticketIds.map((ticketId) => ({
            ticketId: ticketId,
            reportId: id,
          })),
        };
      }

      // Update report
      const report = await tx.report.update({
        where: { id },
        data: updateData,
        include: {
          location: true,
          creator: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
          tickets: { include: { ticket: true } },
          attachments: true,
        },
      });

      return report;
    });

    // Create notification if assignee was changed
    if (assigneeId && assigneeId !== existingReport.assigneeId) {
      await notificationService.create({
        title: '通報已指派給您',
        message: `您已被指派到通報：「${updatedReport.title}」`,
        userId: assigneeId,
        relatedId: id,
        relatedType: 'REPORT',
      });
    }

    // Create notification if status was changed
    if (status && status !== existingReport.status) {
      await notificationService.create({
        title: '通報狀態更新',
        message: `您的通報「${updatedReport.title}」狀態已更新為 ${status}`,
        userId: existingReport.creatorId,
        relatedId: id,
        relatedType: 'REPORT',
      });
    }

    return res.status(200).json({
      success: true,
      data: updatedReport,
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
  const existingReport = await prisma.report.findUnique({
    where: { id },
  });

  if (!existingReport) {
    return res.status(404).json({
      success: false,
      error: 'Report not found',
    });
  }

  try {
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
