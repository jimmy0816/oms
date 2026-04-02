import { prisma } from '@/lib/prisma';
import { notificationService } from '@/services/notificationService';
import {
  bitbucketService,
  type BitbucketIssueState,
} from '@/services/bitbucketService';
import { jiraService } from '@/services/jiraService';
import { ReportStatus } from 'shared-types';
import { reportIntegrationService } from '@/services/reportIntegrationService';

export interface ReportAttachmentInput {
  id?: string;
  name?: string;
  filename?: string;
  url: string;
  type?: string;
  fileType?: string;
  size?: number;
  fileSize?: number;
}

export interface UpdateReportPayload {
  title?: string;
  description?: string;
  locationId?: number;
  priority?: string;
  assigneeId?: string | null;
  categoryId?: string;
  contactPhone?: string;
  contactEmail?: string;
  trackingDate?: Date;
  attachments?: ReportAttachmentInput[];
  ticketIds?: string[];
}

interface ExistingReportSnapshot {
  id: string;
  title: string;
  description: string;
  locationId?: string | null;
  status: string;
  priority: string;
  assigneeId?: string | null;
  bitbucketIssueId?: string | null;
  jiraIssueId?: string | null;
  jiraIssueKey?: string | null;
  categoryId?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  creatorId: string;
}

interface ApplyReportUpdateParams {
  reportId: string;
  userId: string;
  existingReport: ExistingReportSnapshot;
  payload: UpdateReportPayload;
}

export interface UpdateReportStatusOptions {
  reportId: string;
  targetStatus: ReportStatus;
  actorUserId?: string;
  source?: 'REPORT_API' | 'WEBHOOK_BITBUCKET' | 'WEBHOOK_JIRA' | 'SYSTEM';
  syncBitbucketState?: boolean;
  syncJiraState?: boolean;
  sendChatNotification?: boolean;
  createActivityLog?: boolean;
}

const NESTED_CATEGORY_SELECT = {
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
};

const REPORT_INCLUDE = {
  location: true,
  creator: { select: { id: true, name: true, email: true } },
  assignee: { select: { id: true, name: true, email: true } },
  tickets: { include: { ticket: true } },
  category: NESTED_CATEGORY_SELECT,
};

const REPORT_STATUS_INCLUDE = {
  creator: { select: { id: true, name: true, email: true } },
  assignee: { select: { id: true, name: true, email: true } },
  category: NESTED_CATEGORY_SELECT,
};

const ACTIVITY_FIELDS_TO_MONITOR = [
  'title',
  'description',
  'locationId',
  'priority',
  'categoryId',
  'contactPhone',
  'contactEmail',
];

const mapReportStatusToBitbucketState = (
  status: ReportStatus
): BitbucketIssueState | null => {
  if (status === ReportStatus.PENDING_REVIEW) return 'resolved';
  if (status === ReportStatus.REJECTED) return 'wontfix';
  if (
    status === ReportStatus.PROCESSING ||
    status === ReportStatus.RETURNED ||
    status === ReportStatus.UNCONFIRMED
  ) {
    return 'open';
  }

  return null;
};

const buildStatusLogMessage = (
  oldStatus: string,
  newStatus: string,
  source: UpdateReportStatusOptions['source']
) => {
  if (source === 'WEBHOOK_BITBUCKET') {
    return `通報狀態由 Bitbucket 同步：${oldStatus} → ${newStatus}`;
  }

  if (source === 'WEBHOOK_JIRA') {
    return `通報狀態由 Jira 同步：${oldStatus} → ${newStatus}`;
  }

  return `通報狀態從「${oldStatus}」變更為「${newStatus}」`;
};

export const reportMutationService = {
  async applyNonStatusUpdate(params: ApplyReportUpdateParams) {
    const { reportId, userId, existingReport, payload } = params;
    const {
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
    } = payload;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (locationId !== undefined) updateData.locationId = locationId;
    if (priority !== undefined) updateData.priority = priority;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (trackingDate !== undefined) updateData.trackingDate = trackingDate;

    const existingAttachments = await prisma.attachment.findMany({
      where: {
        parentId: reportId,
        parentType: 'REPORT',
      },
    });

    let assigneeOldName = '未指派';
    let assigneeNewName = '未指派';
    let attachmentChanged = false;
    let ticketChanged = false;

    const createActivityLog = async (tx: any, content: string) => {
      await tx.activityLog.create({
        data: {
          parentId: reportId,
          parentType: 'REPORT',
          userId,
          content,
        },
      });
    };

    const updatedReport = await prisma.$transaction(async (tx) => {
      let scalarDataChanged = false;

      for (const field of ACTIVITY_FIELDS_TO_MONITOR) {
        if (
          updateData[field] !== undefined &&
          updateData[field] !== existingReport[field as keyof ExistingReportSnapshot]
        ) {
          scalarDataChanged = true;
          break;
        }
      }

      if (scalarDataChanged) {
        await createActivityLog(tx, '通報資料已更新');
      }

      if (
        updateData.assigneeId !== undefined &&
        updateData.assigneeId !== existingReport.assigneeId
      ) {
        const oldAssignee = existingReport.assigneeId
          ? await tx.user.findUnique({ where: { id: existingReport.assigneeId } })
          : null;
        const newAssignee = updateData.assigneeId
          ? await tx.user.findUnique({ where: { id: updateData.assigneeId } })
          : null;

        assigneeOldName = oldAssignee?.name || '未指派';
        assigneeNewName = newAssignee?.name || '未指派';

        await createActivityLog(
          tx,
          `處理人員從「${assigneeOldName}」變更為「${assigneeNewName}」`
        );
      }

      if (attachments !== undefined) {
        const currentAttachmentIds = existingAttachments.map((a) => a.id);
        const newAttachmentIds = attachments
          .map((a) => a.id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0);

        const attachmentsToDelete = currentAttachmentIds.filter(
          (attId) => !newAttachmentIds.includes(attId)
        );
        const attachmentsToCreate = attachments.filter(
          (attachment) =>
            !attachment.id || !currentAttachmentIds.includes(attachment.id)
        );

        if (attachmentsToDelete.length > 0) {
          attachmentChanged = true;
          await tx.attachment.deleteMany({
            where: { id: { in: attachmentsToDelete } },
          });
          await createActivityLog(tx, `移除了 ${attachmentsToDelete.length} 個附件`);
        }

        if (attachmentsToCreate.length > 0) {
          attachmentChanged = true;
          await tx.attachment.createMany({
            data: attachmentsToCreate.map((attachment) => ({
              filename: attachment.name || attachment.filename || 'unknown',
              url: attachment.url,
              fileType: attachment.type || attachment.fileType || 'unknown',
              fileSize: attachment.size ?? attachment.fileSize ?? 0,
              createdById: userId,
              parentId: reportId,
              parentType: 'REPORT',
            })),
          });
          await createActivityLog(tx, `新增了 ${attachmentsToCreate.length} 個附件`);
        }
      }

      if (ticketIds !== undefined) {
        const existingTicketIds = (
          await tx.reportTicket.findMany({
            where: { reportId },
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
          ticketChanged = true;
          await tx.reportTicket.deleteMany({
            where: {
              reportId,
              ticketId: { in: ticketsToDisconnect },
            },
          });
          await createActivityLog(
            tx,
            `移除了與 ${ticketsToDisconnect.length} 個工單的關聯`
          );
        }

        if (ticketsToConnect.length > 0) {
          ticketChanged = true;
          await tx.reportTicket.createMany({
            data: ticketsToConnect.map((ticketId) => ({
              ticketId,
              reportId,
            })),
          });
          await createActivityLog(tx, `新增了與 ${ticketsToConnect.length} 個工單的關聯`);
        }
      }

      const report =
        Object.keys(updateData).length > 0
          ? await tx.report.update({
              where: { id: reportId },
              data: updateData,
              include: REPORT_INCLUDE,
            })
          : await tx.report.findUnique({
              where: { id: reportId },
              include: REPORT_INCLUDE,
            });

      if (!report) {
        throw new Error('Report not found during update transaction');
      }

      return report;
    });

    const updatedAttachments = await prisma.attachment.findMany({
      where: {
        parentId: reportId,
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

    const finalUpdatedReport = {
      ...updatedReport,
      attachments: updatedAttachments,
    };

    if (assigneeId && assigneeId !== existingReport.assigneeId) {
      await notificationService.create({
        title: '通報已指派給您',
        message: `您已被指派到通報：「${finalUpdatedReport.title}」`,
        userId: assigneeId,
        relatedId: reportId,
        relatedType: 'REPORT',
      });
    }

    let otherDataChanged = false;
    for (const field of ACTIVITY_FIELDS_TO_MONITOR) {
      if (
        updateData[field] !== undefined &&
        updateData[field] !== existingReport[field as keyof ExistingReportSnapshot]
      ) {
        otherDataChanged = true;
        break;
      }
    }

    if (attachmentChanged || ticketChanged) {
      otherDataChanged = true;
    }

    if (otherDataChanged) {
      await notificationService.create({
        title: '通報資料已更新',
        message: `您的通報「${finalUpdatedReport.title}」資料已更新。`,
        userId: existingReport.creatorId,
        relatedId: reportId,
        relatedType: 'REPORT',
      });
    }

    const changes: Record<string, { old: any; new: any }> = {};

    if (priority && priority !== existingReport.priority) {
      changes.priority = { old: existingReport.priority, new: priority };
    }

    if (assigneeId !== undefined && assigneeId !== existingReport.assigneeId) {
      changes.assigneeId = {
        old: assigneeOldName,
        new: assigneeNewName,
      };
    }

    if (title && title !== existingReport.title) {
      changes.title = { old: existingReport.title, new: title };
    }

    if (description && description !== existingReport.description) {
      changes.description = { old: existingReport.description, new: description };
    }

    return {
      report: finalUpdatedReport,
      changes,
    };
  },

  async updateReportStatus(options: UpdateReportStatusOptions) {
    const {
      reportId,
      targetStatus,
      actorUserId,
      source = 'SYSTEM',
      syncBitbucketState = false,
      syncJiraState = false,
      sendChatNotification = true,
      createActivityLog = true,
    } = options;

    const existingReport = await prisma.report.findUnique({
      where: { id: reportId },
      include: REPORT_STATUS_INCLUDE,
    });

    if (!existingReport) {
      return {
        changed: false,
        report: null,
        previousStatus: null,
      };
    }

    if (existingReport.status === targetStatus) {
      return {
        changed: false,
        report: existingReport,
        previousStatus: existingReport.status,
      };
    }

    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: { status: targetStatus },
      include: REPORT_STATUS_INCLUDE,
    });

    const resolvedActorUserId =
      source === 'WEBHOOK_BITBUCKET'
        ? actorUserId
        : actorUserId || existingReport.assigneeId || existingReport.creatorId;

    if (createActivityLog && source === 'WEBHOOK_BITBUCKET' && !resolvedActorUserId) {
      console.warn('[Report Status Update] WEBHOOK_BITBUCKET 缺少 actorUserId，略過活動日誌寫入');
    }

    if (createActivityLog && source === 'WEBHOOK_JIRA' && !resolvedActorUserId) {
      console.warn('[Report Status Update] WEBHOOK_JIRA 缺少 actorUserId，略過活動日誌寫入');
    }

    if (createActivityLog && resolvedActorUserId) {
      try {
        await prisma.activityLog.create({
          data: {
            parentId: reportId,
            parentType: 'REPORT',
            userId: resolvedActorUserId,
            content: buildStatusLogMessage(
              existingReport.status,
              targetStatus,
              source
            ),
          },
        });
      } catch (error: any) {
        console.error('[Report Status Update] 活動日誌寫入失敗:', error.message);
      }
    }

    if (sendChatNotification) {
      await reportIntegrationService.sendReportUpdateChatNotification(reportId, updatedReport, {
        status: { old: existingReport.status, new: targetStatus },
      });
    }

    if (
      syncBitbucketState &&
      existingReport.bitbucketIssueId &&
      bitbucketService.isEnabled()
    ) {
      const bitbucketState = mapReportStatusToBitbucketState(targetStatus);

      if (bitbucketState) {
        try {
          await bitbucketService.updateIssueState(
            existingReport.bitbucketIssueId,
            bitbucketState
          );
        } catch (error: any) {
          console.error(
            '[Report Status Update] Bitbucket 狀態同步失敗:',
            error.message
          );
        }
      }
    }

    if (syncJiraState && existingReport.jiraIssueKey && jiraService.isEnabled()) {
      try {
        await jiraService.syncStatusByReportStatus(
          existingReport.jiraIssueKey,
          targetStatus
        );
      } catch (error: any) {
        console.error('[Report Status Update] Jira transition 失敗:', error.message);
      }
    }

    return {
      changed: true,
      report: updatedReport,
      previousStatus: existingReport.status,
    };
  },

  async updateReportStatusByBitbucketIssueId(
    bitbucketIssueId: string,
    targetStatus: ReportStatus,
    options?: Omit<UpdateReportStatusOptions, 'reportId' | 'targetStatus'>
  ) {
    const report = await prisma.report.findFirst({
      where: { bitbucketIssueId },
      select: { id: true },
    });

    if (!report) {
      return {
        changed: false,
        report: null,
        previousStatus: null,
      };
    }

    return this.updateReportStatus({
      reportId: report.id,
      targetStatus,
      ...options,
    });
  },

  async updateReportStatusByJiraIssueId(
    jiraIssueId: string,
    targetStatus: ReportStatus,
    options?: Omit<UpdateReportStatusOptions, 'reportId' | 'targetStatus'>
  ) {
    const report = await prisma.report.findFirst({
      where: { jiraIssueId },
      select: { id: true },
    });

    if (!report) {
      return {
        changed: false,
        report: null,
        previousStatus: null,
      };
    }

    return this.updateReportStatus({
      reportId: report.id,
      targetStatus,
      ...options,
    });
  },
};
