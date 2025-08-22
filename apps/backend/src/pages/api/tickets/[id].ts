import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import {
  ApiResponse,
  Ticket,
  UpdateTicketRequest,
  TicketStatus,
  TicketPriority,
} from 'shared-types';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { notificationService } from '@/services/notificationService';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Ticket>>
) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ success: false, error: 'Invalid ticket ID' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getTicket(id, res);
      case 'PUT':
        return await updateTicket(id, req, res);
      case 'PATCH':
        return await claimTicket(req, res);
      case 'DELETE':
        return await deleteTicket(id, res);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE']);
        return res
          .status(405)
          .json({ success: false, error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Error in ticket API:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  }
}

async function getTicket(
  id: string,
  res: NextApiResponse<ApiResponse<Ticket>>
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
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
      comments: {
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
      },
      reports: {
        include: {
          report: {
            include: {
              location: true,
              category: true,
            },
          },
        },
      },
      role: true,
      ticketReviews: {
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!ticket) {
    return res.status(404).json({ success: false, error: 'Ticket not found' });
  }

  // Fetch attachments separately using polymorphic relation
  const attachments = await prisma.attachment.findMany({
    where: {
      parentId: id,
      parentType: 'TICKET',
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

  // Manually fetch attachments for each ticket review
  if (ticket && ticket.ticketReviews) {
    for (const review of ticket.ticketReviews) {
      const reviewAttachments = await prisma.attachment.findMany({
        where: {
          parentId: review.id,
          parentType: 'TicketReview',
        },
      });
      (review as any).attachments = reviewAttachments;
    }
  }

  // 確保 status 和 priority 屬性都是正確的枚舉類型
  const ticketWithCorrectTypes: Ticket = {
    ...ticket,
    status: ticket.status as unknown as TicketStatus,
    priority: ticket.priority as unknown as TicketPriority,
    attachments,
    activityLogs,
  };

  return res.status(200).json({ success: true, data: ticketWithCorrectTypes });
}

async function updateTicket(
  id: string,
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<Ticket>>
) {
  const {
    title,
    description,
    status,
    priority,
    assigneeId,
    roleId,
    reportIds,
    attachments,
  } = req.body as UpdateTicketRequest;

  const userId = req.user.id; // 從認證請求中獲取用戶ID

  // 輔助函數：創建活動日誌
  const createActivityLog = async (
    tx: any, // Prisma Transaction client
    ticketId: string,
    actorId: string,
    content: string
  ) => {
    await tx.activityLog.create({
      data: {
        parentId: ticketId,
        parentType: 'TICKET',
        userId: actorId,
        content: content,
      },
    });
  };

  // Check if ticket exists
  const existingTicket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      reports: { select: { reportId: true } },
      role: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
    },
  });
  if (!existingTicket) {
    return res.status(404).json({ success: false, error: 'Ticket not found' });
  }

  const existingAttachments = await prisma.attachment.findMany({
    where: {
      parentId: id,
      parentType: 'TICKET',
    },
  });

  const existingReportIds = existingTicket.reports.map((r) => r.reportId);

  // Prepare update data
  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (status !== undefined) updateData.status = status;
  if (priority !== undefined) updateData.priority = priority;
  if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
  if (roleId !== undefined) updateData.roleId = roleId;

  try {
    const updatedTicket = await prisma.$transaction(async (tx) => {
      // 記錄標量欄位變更的活動日誌
      let dataChanged = false;
      const fieldsToMonitor = ['title', 'description', 'priority'];

      for (const field of fieldsToMonitor) {
        if (
          updateData[field] !== undefined &&
          updateData[field] !== (existingTicket as any)[field]
        ) {
          dataChanged = true;
          break;
        }
      }

      // 角色變更
      if (
        updateData.roleId !== undefined &&
        updateData.roleId !== existingTicket.roleId
      ) {
        dataChanged = true;
        const oldRole = existingTicket.roleId
          ? await tx.role.findUnique({ where: { id: existingTicket.roleId } })
          : null;
        const newRole = updateData.roleId
          ? await tx.role.findUnique({ where: { id: updateData.roleId } })
          : null;
        await createActivityLog(
          tx,
          id,
          userId,
          `指派角色從「${oldRole?.name || '未設定'}」變更為「${
            newRole?.name || '未設定'
          }」`
        );
      }

      if (dataChanged) {
        await createActivityLog(tx, id, userId, `工單資料已更新`);
      }

      // 處理人員變更的活動日誌
      if (
        updateData.assigneeId !== undefined &&
        updateData.assigneeId !== existingTicket.assigneeId
      ) {
        const oldAssignee = existingTicket.assigneeId
          ? await tx.user.findUnique({
              where: { id: existingTicket.assigneeId },
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
              parentType: 'TICKET', // Add parentType
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

      // Handle reportIds update
      if (reportIds !== undefined) {
        const reportsToDisconnect = existingReportIds.filter(
          (existingId: string) => !reportIds.includes(existingId)
        );
        const reportsToConnect = reportIds.filter(
          (newId: string) => !existingReportIds.includes(newId)
        );

        if (reportsToDisconnect.length > 0) {
          await tx.reportTicket.deleteMany({
            where: {
              ticketId: id,
              reportId: { in: reportsToDisconnect },
            },
          });
          await createActivityLog(
            tx,
            id,
            userId,
            `移除了與 ${reportsToDisconnect.length} 個通報的關聯`
          );
        }

        if (reportsToConnect.length > 0) {
          await tx.reportTicket.createMany({
            data: reportsToConnect.map((reportId) => ({
              reportId: reportId,
              ticketId: id,
            })),
          });
          await createActivityLog(
            tx,
            id,
            userId,
            `新增了與 ${reportsToConnect.length} 個通報的關聯`
          );
        }
      }

      // Update ticket
      const ticket = await tx.ticket.update({
        where: { id },
        data: updateData,
        include: {
          creator: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
          role: true,
        },
      });

      return ticket;
    });

    // Fetch attachments separately after update
    const updatedAttachments = await prisma.attachment.findMany({
      where: {
        parentId: id,
        parentType: 'TICKET',
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

    // Fetch activity logs separately after update
    const updatedActivityLogs = await prisma.activityLog.findMany({
      where: {
        parentId: id,
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

    // Manually attach attachments and activityLogs to the updatedTicket object
    const finalUpdatedTicket = {
      ...updatedTicket,
      attachments: updatedAttachments,
      activityLogs: updatedActivityLogs,
    };

    // Create notification for status change
    if (status && status !== existingTicket.status) {
      // await notificationService.create({
      //   title: '工單狀態更新',
      //   message: `工單「${finalUpdatedTicket.title}」的狀態已變更為 ${status}`,
      //   userId: existingTicket.creatorId,
      //   relatedId: id,
      //   relatedType: 'TICKET',
      // });
    }

    // Create notification for assignee change
    if (assigneeId && assigneeId !== existingTicket.assigneeId) {
      await notificationService.create({
        title: '工單已指派',
        message: `您已被指派到工單「${finalUpdatedTicket.title}」`,
        userId: assigneeId,
        relatedId: id,
        relatedType: 'TICKET',
      });
    }

    // Create notification if other data was changed
    let otherDataChanged = false;
    const fieldsToMonitorForNotification = ['title', 'description', 'priority'];

    for (const field of fieldsToMonitorForNotification) {
      if (
        updateData[field] !== undefined &&
        updateData[field] !== (existingTicket as any)[field]
      ) {
        otherDataChanged = true;
        break;
      }
    }

    // Check for roleId change
    if (
      updateData.roleId !== undefined &&
      updateData.roleId !== existingTicket.roleId
    ) {
      otherDataChanged = true;
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

    // Check for reportIds changes
    if (reportIds !== undefined) {
      const currentReportIds = existingReportIds.map((r) => r);
      if (
        currentReportIds.length !== reportIds.length ||
        currentReportIds.some((reportId) => !reportIds.includes(reportId))
      ) {
        otherDataChanged = true;
      }
    }

    if (otherDataChanged) {
      await notificationService.create({
        title: '工單資料已更新',
        message: `您的工單「${finalUpdatedTicket.title}」資料已更新。`,
        userId: existingTicket.creatorId,
        relatedId: id,
        relatedType: 'TICKET',
      });
    }

    return res.status(200).json({ success: true, data: finalUpdatedTicket });
  } catch (error: any) {
    console.error('Error updating ticket:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  }
}

async function deleteTicket(
  id: string,
  res: NextApiResponse<ApiResponse<Ticket>>
) {
  // Check if ticket exists
  const existingTicket = await prisma.ticket.findUnique({ where: { id } });
  if (!existingTicket) {
    return res.status(404).json({ success: false, error: 'Ticket not found' });
  }

  try {
    const deletedTicketData = await prisma.$transaction(async (tx) => {
      // 1. 刪除相關的 ActivityLog
      await tx.activityLog.deleteMany({
        where: { parentId: id, parentType: 'TICKET' },
      });

      // 2. 刪除相關的 Attachments
      await tx.attachment.deleteMany({
        where: { parentId: id, parentType: 'TICKET' },
      });

      // 3. 刪除相關的 Comments
      await tx.comment.deleteMany({
        where: { ticketId: id },
      });

      // 4. 刪除相關的 Notifications
      await tx.notification.deleteMany({
        where: { relatedId: id, relatedType: 'TICKET' },
      });

      // 5. 刪除與通報的關聯 (ReportTicket)
      await tx.reportTicket.deleteMany({
        where: { ticketId: id },
      });

      // 6. 刪除相關的 TicketReview
      await tx.ticketReview.deleteMany({
        where: { ticketId: id },
      });

      // 7. 最後，刪除工單本身
      const deletedTicket = await tx.ticket.delete({
        where: { id },
      });

      return deletedTicket;
    });

    return res.status(200).json({ success: true, data: deletedTicketData });
  } catch (error: any) {
    console.error(`Error deleting ticket ${id}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete ticket and its related data.',
    });
  }
}

async function claimTicket(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Ticket>>
) {
  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ success: false, error: 'Invalid ticket ID' });
  }
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ success: false, error: '未登入' });
  }
  const { action } = req.body;

  // 查詢工單
  const ticket = await prisma.ticket.findUnique({
    where: { id: id as string },
  });

  if (!ticket) {
    return res.status(404).json({ success: false, error: '工單不存在' });
  }

  if (action === 'claim') {
    if (ticket.assigneeId) {
      return res.status(400).json({ success: false, error: '工單已被認領' });
    }
    if (ticket.status !== 'PENDING') {
      return res
        .status(400)
        .json({ success: false, error: '工單狀態非待接單' });
    }
    // 權限判斷
    const hasClaimPermission = user.permissions?.includes('claim_tickets');
    if (!hasClaimPermission) {
      return res
        .status(403)
        .json({ success: false, error: '沒有認領工單權限' });
    }
    // 認領
    const updated = await prisma.ticket.update({
      where: { id: id as string },
      data: {
        assigneeId: user.id,
        status: 'IN_PROGRESS',
      },
    });

    // Create notification for claiming the ticket
    await notificationService.create({
      title: '工單已認領',
      message: `您已認領並被指派到工單「${updated.title}」`,
      userId: user.id,
      relatedId: updated.id,
      relatedType: 'TICKET',
    });

    return res.status(200).json({ success: true, data: updated });
  } else if (action === 'abandon') {
    if (ticket.assigneeId !== user.id) {
      return res
        .status(403)
        .json({ success: false, error: '您不是此工單的處理人' });
    }

    const updated = await prisma.ticket.update({
      where: { id: id as string },
      data: {
        assigneeId: null,
        status: 'PENDING',
      },
    });

    // Create notification for abandoning the ticket
    await notificationService.create({
      title: '工單已被放棄',
      message: `您建立的工單「${updated.title}」已被處理人員放棄，請重新指派或處理。`,
      userId: ticket.creatorId,
      relatedId: updated.id,
      relatedType: 'TICKET',
    });

    return res.status(200).json({ success: true, data: updated });
  } else {
    return res.status(400).json({ success: false, error: '不支援的操作' });
  }
}

export default withAuth(handler);
