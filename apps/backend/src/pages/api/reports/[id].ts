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
  });

  if (!existingReport) {
    return res.status(404).json({
      success: false,
      error: 'Report not found',
    });
  }

  const existingAttachments = await prisma.attachment.findMany({
    where: {
      parentId: id,
      parentType: 'REPORT',
    },
  });

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

  const userId = req.user.id; // 從認證請求中獲取用戶ID

  // 輔助函數：創建活動日誌
  const createActivityLog = async (
    tx: any, // Prisma Transaction client
    reportId: string,
    actorId: string,
    content: string
  ) => {
    await tx.activityLog.create({
      data: {
        parentId: reportId,
        parentType: 'REPORT',
        userId: actorId,
        content: content,
      },
    });
  };

  try {
    const updatedReport = await prisma.$transaction(async (tx) => {
      // 記錄標量欄位變更的活動日誌
      let dataChanged = false;
      const fieldsToMonitor = [
        'title',
        'description',
        'locationId',
        'priority',
        'categoryId',
        'contactPhone',
        'contactEmail',
      ];

      for (const field of fieldsToMonitor) {
        if (
          updateData[field] !== undefined &&
          updateData[field] !== (existingReport as any)[field]
        ) {
          dataChanged = true;
          break;
        }
      }

      if (dataChanged) {
        await createActivityLog(tx, id, userId, `通報資料已更新`);
      }

      // 處理人員變更的活動日誌
      if (
        updateData.assigneeId !== undefined &&
        updateData.assigneeId !== existingReport.assigneeId
      ) {
        const oldAssignee = existingReport.assigneeId
          ? await tx.user.findUnique({
              where: { id: existingReport.assigneeId },
            })
          : null;
        const newAssignee = updateData.assigneeId
          ? await tx.user.findUnique({ where: { id: updateData.assigneeId } })
          : null;
        await createActivityLog(
          tx,
          id,
          userId,
          `處理人員從「${oldAssignee?.name || '未指派'}」變更為「${
            newAssignee?.name || '未指派'
          }」`
        );
      }

      // 狀態變更的活動日誌
      if (
        updateData.status !== undefined &&
        updateData.status !== existingReport.status
      ) {
        await createActivityLog(
          tx,
          id,
          userId,
          `通報狀態從「${existingReport.status}」變更為「${updateData.status}」`
        );
      }

      // Handle attachments update
      if (attachments !== undefined) {
        const currentAttachmentIds = existingAttachments.map((a) => a.id);
        const newAttachmentIds = attachments
          .map((a: any) => a.id)
          .filter(Boolean);

        const attachmentsToDelete = currentAttachmentIds.filter(
          (attId) => !newAttachmentIds.includes(attId)
        );
        const attachmentsToCreate = attachments.filter(
          (a: any) => !currentAttachmentIds.includes(a.id)
        );

        if (attachmentsToDelete.length > 0) {
          await tx.attachment.deleteMany({
            where: { id: { in: attachmentsToDelete } },
          });
          await createActivityLog(
            tx,
            id,
            userId,
            `移除了 ${attachmentsToDelete.length} 個附件`
          );
        }

        if (attachmentsToCreate.length > 0) {
          await tx.attachment.createMany({
            data: attachmentsToCreate.map((a: any) => ({
              filename: a.name,
              url: a.url,
              fileType: a.type,
              fileSize: a.size,
              createdById: userId,
              parentId: id, // Add parentId
              parentType: 'REPORT', // Add parentType
            })),
          });
          await createActivityLog(
            tx,
            id,
            userId,
            `新增了 ${attachmentsToCreate.length} 個附件`
          );
        }
      }

      // Handle ticketIds update
      if (ticketIds !== undefined) {
        const existingTicketIds = (
          await tx.reportTicket.findMany({
            where: { reportId: id },
            select: { ticketId: true },
          })
        ).map((rt: any) => rt.ticketId);

        const ticketsToDisconnect = existingTicketIds.filter(
          (existingId: string) => !ticketIds.includes(existingId)
        );
        const ticketsToConnect = ticketIds.filter(
          (newId: string) => !existingTicketIds.includes(newId)
        );

        if (ticketsToDisconnect.length > 0) {
          await tx.reportTicket.deleteMany({
            where: {
              reportId: id,
              ticketId: { in: ticketsToDisconnect },
            },
          });
          await createActivityLog(
            tx,
            id,
            userId,
            `移除了與 ${ticketsToDisconnect.length} 個工單的關聯`
          );
        }

        if (ticketsToConnect.length > 0) {
          await tx.reportTicket.createMany({
            data: ticketsToConnect.map((ticketId) => ({
              ticketId: ticketId,
              reportId: id,
            })),
          });
          await createActivityLog(
            tx,
            id,
            userId,
            `新增了與 ${ticketsToConnect.length} 個工單的關聯`
          );
        }
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
        },
      });

      return report;
    });

    // Fetch attachments separately after update
    const updatedAttachments = await prisma.attachment.findMany({
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

    // Manually attach attachments to the updatedReport object
    const finalUpdatedReport = {
      ...updatedReport,
      attachments: updatedAttachments,
    };

    // Create notification if assignee was changed
    if (assigneeId && assigneeId !== existingReport.assigneeId) {
      await notificationService.create({
        title: '通報已指派給您',
        message: `您已被指派到通報：「${finalUpdatedReport.title}」`,
        userId: assigneeId,
        relatedId: id,
        relatedType: 'REPORT',
      });
    }

    // Create notification if status was changed
    if (status && status !== existingReport.status) {
      await notificationService.create({
        title: '通報狀態更新',
        message: `您的通報「${finalUpdatedReport.title}」狀態已更新為 ${status}`,
        userId: existingReport.creatorId,
        relatedId: id,
        relatedType: 'REPORT',
      });
    }

    // Create notification if other data was changed
    let otherDataChanged = false;
    const fieldsToMonitorForNotification = [
      'title',
      'description',
      'locationId',
      'priority',
      'categoryId',
      'contactPhone',
      'contactEmail',
    ];

    for (const field of fieldsToMonitorForNotification) {
      if (
        updateData[field] !== undefined &&
        updateData[field] !== (existingReport as any)[field]
      ) {
        otherDataChanged = true;
        break;
      }
    }

    // Check for attachment changes
    if (attachments !== undefined) {
      const currentAttachmentIds = existingAttachments.map((a) => a.id);
      const newAttachmentIds = attachments
        .map((a: any) => a.id)
        .filter(Boolean);
      if (
        currentAttachmentIds.length !== newAttachmentIds.length ||
        currentAttachmentIds.some((attId) => !newAttachmentIds.includes(attId))
      ) {
        otherDataChanged = true;
      }
    }

    // Check for ticketIds changes
    if (ticketIds !== undefined) {
      const existingTicketIds = (
        await prisma.reportTicket.findMany({
          where: { reportId: id },
          select: { ticketId: true },
        })
      ).map((rt: any) => rt.ticketId);

      if (
        existingTicketIds.length !== ticketIds.length ||
        existingTicketIds.some((ticketId) => !ticketIds.includes(ticketId))
      ) {
        otherDataChanged = true;
      }
    }

    if (otherDataChanged) {
      await notificationService.create({
        title: '通報資料已更新',
        message: `您的通報「${finalUpdatedReport.title}」資料已更新。`,
        userId: existingReport.creatorId,
        relatedId: id,
        relatedType: 'REPORT',
      });
    }

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
