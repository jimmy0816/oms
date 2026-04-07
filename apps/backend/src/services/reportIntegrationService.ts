import { prisma } from '@/lib/prisma';
import { bitbucketService } from '@/services/bitbucketService';
import { jiraService } from '@/services/jiraService';
import { chatLogService } from '@/services/chatLogService';
import { chatThreadService } from '@/services/chatThreadService';
import { googleChatService } from '@/services/googleChatService';
import { reportIntegrationPolicyService } from '@/services/reportIntegrationPolicyService';

const DEFAULT_CHAT_SPACE_NAME = 'OMS Bug Reports';

type ReportIntegrationRecord = {
  id: string;
  title: string;
  description?: string | null;
  priority?: string | null;
  bitbucketIssueId?: string | null;
  jiraIssueId?: string | null;
  jiraIssueKey?: string | null;
  creator?: {
    name?: string | null;
  } | null;
  category?: {
    id?: string;
    name?: string | null;
    parent?: {
      id?: string;
      name?: string | null;
      parent?: {
        id?: string;
        name?: string | null;
      } | null;
    } | null;
  } | null;
};

interface SendReportThreadMessageParams {
  reportId: string;
  text: string;
  relatedId?: string;
  relatedType?: string;
  successLogMessage?: string;
  failureLogMessage?: string;
}

const getThreadDetails = (chatResponse: { name: string; thread?: { name: string }; space?: { name: string } }) => {
  const spaceName = chatResponse.space?.name || chatResponse.name.split('/messages/')[0];
  const threadName = chatResponse.thread?.name || chatResponse.name;

  return {
    spaceId: spaceName.replace('spaces/', ''),
    threadId: threadName.split('/threads/')[1] || threadName,
  };
};

const createGoogleChatThreadIfNeeded = async (report: ReportIntegrationRecord) => {
  if (!reportIntegrationPolicyService.shouldEnableGoogleChat(report)) {
    return null;
  }

  const existingChatThread = await chatThreadService.findByReportId(report.id);
  if (existingChatThread) {
    return existingChatThread;
  }

  const message = googleChatService.formatReportCreateMessage(report);
  const chatResponse = await googleChatService.sendToSpace(message);

  if (!chatResponse) {
    return null;
  }

  const { spaceId, threadId } = getThreadDetails(chatResponse);
  const chatThread = await chatThreadService.create(
    report.id,
    spaceId,
    threadId,
    DEFAULT_CHAT_SPACE_NAME
  );

  await chatLogService.log({
    platform: 'GOOGLE_CHAT',
    type: 'SPACE',
    status: 'SUCCESS',
    request: message,
    response: chatResponse,
    relatedId: report.id,
    relatedType: 'REPORT',
  });

  return chatThread;
};

const logGoogleChatFailure = async (
  reportId: string,
  action: 'SPACE' | 'THREAD',
  error: Error
) => {
  await chatLogService.log({
    platform: 'GOOGLE_CHAT',
    type: action,
    status: 'FAILED',
    request: null,
    response: { error: error.message },
    relatedId: reportId,
    relatedType: 'REPORT',
  });
};

const createBitbucketIssueIfNeeded = async (report: ReportIntegrationRecord) => {
  if (
    !reportIntegrationPolicyService.shouldEnableBitbucket(report) ||
    !bitbucketService.isEnabled() ||
    report.bitbucketIssueId
  ) {
    return report;
  }

  const issue = await bitbucketService.createIssue({
    reportId: report.id,
    title: report.title,
    description: report.description,
    priority: report.priority || undefined,
    reporterName: report.creator?.name || null,
  });

  if (!issue?.id) {
    return report;
  }

  const savedReport = await prisma.report.update({
    where: { id: report.id },
    data: {
      bitbucketIssueId: issue.id,
    },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
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

  return savedReport;
};

const createJiraIssueIfNeeded = async (report: ReportIntegrationRecord) => {
  if (
    !reportIntegrationPolicyService.shouldEnableJira(report) ||
    !jiraService.isEnabled() ||
    report.jiraIssueId
  ) {
    return report;
  }

  const categoryName = report.category?.name ?? null;
  const issue = await jiraService.createIssue({
    reportId: report.id,
    description: report.description,
    priority: report.priority,
    categoryName,
  });

  if (!issue?.id) {
    return report;
  }

  const savedReport = await prisma.report.update({
    where: { id: report.id },
    data: {
      jiraIssueId: issue.id,
      jiraIssueKey: issue.key,
    },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
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

  return savedReport;
};

// 預留 Jira 解聯通道：後續若要做 transition / close / comment 清理，可集中在此擴充。
const requestJiraUnlinkIfNeeded = async (report: ReportIntegrationRecord) => {
  if (!report.jiraIssueId && !report.jiraIssueKey) {
    return;
  }

  if (!jiraService.isEnabled()) {
    console.warn(
      `[Report Integration] Jira 未啟用，略過解聯 transition (${report.id})`
    );
    return;
  }

  const issueRef = report.jiraIssueKey || report.jiraIssueId;
  if (!issueRef) {
    return;
  }

  const transitioned = await jiraService.transitionIssueForUnlink(issueRef);
  if (!transitioned) {
    console.warn(
      `[Report Integration] Jira 解聯 transition 失敗 (${report.id}) issue=${issueRef}`
    );
    return;
  }

  console.info(
    `[Report Integration] Jira 解聯完成 (${report.id}) issue=${issueRef}`
  );
};

export const reportIntegrationService = {
  shouldEnableGoogleChat(report: ReportIntegrationRecord) {
    return reportIntegrationPolicyService.shouldEnableGoogleChat(report);
  },

  shouldEnableBitbucket(report: ReportIntegrationRecord) {
    return reportIntegrationPolicyService.shouldEnableBitbucket(report);
  },

  shouldEnableJira(report: ReportIntegrationRecord) {
    return reportIntegrationPolicyService.shouldEnableJira(report);
  },

  formatReportUpdateText(report: any, changes: Record<string, { old: any; new: any }>) {
    return googleChatService.formatReportUpdateText(report, changes);
  },

  formatReportDeleteText(report: any) {
    return googleChatService.formatReportDeleteText(report);
  },

  async sendReportUpdateChatNotification(
    reportId: string,
    report: any,
    changes: Record<string, { old: any; new: any }>
  ) {
    if (!changes || Object.keys(changes).length === 0) {
      return;
    }

    const text = this.formatReportUpdateText(report, changes);
    await this.sendMessageToReportThread({
      reportId,
      text,
      relatedId: reportId,
      relatedType: 'REPORT',
      successLogMessage: `[Report Updated] Google Chat 通知發送成功: ${reportId}`,
      failureLogMessage: '[Report Updated] Google Chat 通知發送失敗:',
    });
  },

  async sendReportDeleteChatNotification(reportId: string, report: any) {
    const text = this.formatReportDeleteText(report);
    await this.sendMessageToReportThread({
      reportId,
      text,
      relatedId: reportId,
      relatedType: 'REPORT',
      successLogMessage: `[Report Deleted] Google Chat 通知發送成功: ${reportId}`,
      failureLogMessage: '[Report Deleted] Google Chat 通知發送失敗:',
    });
  },

  async sendReportDeleteChatNotificationToThread(params: {
    reportId: string;
    report: any;
    chatSpaceId: string;
    chatThreadId: string;
  }) {
    const { reportId, report, chatSpaceId, chatThreadId } = params;
    const text = this.formatReportDeleteText(report);
    const threadName = `spaces/${chatSpaceId}/threads/${chatThreadId}`;

    try {
      const chatResponse = await googleChatService.sendToThread(threadName, text);

      if (chatResponse) {
        await chatLogService.log({
          platform: 'GOOGLE_CHAT',
          type: 'THREAD',
          status: 'SUCCESS',
          request: { text, thread: { name: threadName } },
          response: chatResponse,
          relatedId: reportId,
          relatedType: 'REPORT',
        });

        console.log(`[Report Deleted] Google Chat 通知發送成功: ${reportId}`);
      }

      return chatResponse;
    } catch (error: any) {
      console.error('[Report Deleted] Google Chat 通知發送失敗:', error.message);

      await chatLogService.log({
        platform: 'GOOGLE_CHAT',
        type: 'THREAD',
        status: 'FAILED',
        request: { text, thread: { name: threadName } },
        response: { error: error.message },
        relatedId: reportId,
        relatedType: 'REPORT',
      });

      return null;
    }
  },

  async teardownExternalIntegrationsAfterReportDelete(report: ReportIntegrationRecord) {
    if (!report.bitbucketIssueId) {
      return;
    }

    if (!bitbucketService.isEnabled()) {
      console.warn(
        `[Report Integration] Bitbucket 未啟用，無法關閉 issue (${report.id})`
      );
      return;
    }

    try {
      await bitbucketService.updateIssueState(report.bitbucketIssueId, 'closed');
    } catch (error: any) {
      console.error(
        `[Report Integration] 關閉 Bitbucket issue 失敗 (${report.id}):`,
        error.message
      );
    }
  },

  formatTicketCreateText(ticket: any, report: any) {
    return googleChatService.formatTicketCreateText(ticket, report);
  },

  formatTicketUpdateText(
    ticket: any,
    report: any,
    changes: Record<string, any>
  ) {
    return googleChatService.formatTicketUpdateText(ticket, report, changes);
  },

  formatTicketDeleteText(ticket: any, report: any) {
    return googleChatService.formatTicketDeleteText(ticket, report);
  },

  async sendMessageToReportThread(params: SendReportThreadMessageParams) {
    const {
      reportId,
      text,
      relatedId = reportId,
      relatedType = 'REPORT',
      successLogMessage,
      failureLogMessage,
    } = params;

    const chatThread = await chatThreadService.findByReportId(reportId);
    if (!chatThread) {
      return null;
    }

    const threadName = `spaces/${chatThread.chatSpaceId}/threads/${chatThread.chatThreadId}`;

    try {
      const chatResponse = await googleChatService.sendToThread(threadName, text);

      if (chatResponse) {
        await chatLogService.log({
          platform: 'GOOGLE_CHAT',
          type: 'THREAD',
          status: 'SUCCESS',
          request: { text, thread: { name: threadName } },
          response: chatResponse,
          relatedId,
          relatedType,
        });

        if (successLogMessage) {
          console.log(successLogMessage);
        }
      }

      return chatResponse;
    } catch (error: any) {
      console.error(failureLogMessage || '[Report Integration] Google Chat 通知失敗:', error.message);

      await chatLogService.log({
        platform: 'GOOGLE_CHAT',
        type: 'THREAD',
        status: 'FAILED',
        request: null,
        response: { error: error.message },
        relatedId,
        relatedType,
      });

      return null;
    }
  },

  async sendMessageToMultipleReportThreads(params: {
    reportIds: string[];
    buildText: (report: any) => string;
    relatedId: string;
    relatedType?: string;
    successLogPrefix?: string;
    failureLogMessage?: string;
  }) {
    const {
      reportIds,
      buildText,
      relatedId,
      relatedType = 'TICKET',
      successLogPrefix,
      failureLogMessage,
    } = params;

    if (!reportIds || reportIds.length === 0) {
      return;
    }

    const reports = await prisma.report.findMany({
      where: { id: { in: reportIds } },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
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

    for (const report of reports) {
      const text = buildText(report);
      const response = await this.sendMessageToReportThread({
        reportId: report.id,
        text,
        relatedId,
        relatedType,
        failureLogMessage,
      });

      if (response && successLogPrefix) {
        console.log(`${successLogPrefix}: ${relatedId} -> Report ${report.id}`);
      }
    }
  },

  async handleReportCreated(report: ReportIntegrationRecord) {
    let updatedReport: any = report;

    if (this.shouldEnableGoogleChat(updatedReport)) {
      try {
        await createGoogleChatThreadIfNeeded(updatedReport);
      } catch (error: any) {
        console.error('[Report Created] Google Chat 通知發送失敗:', error);
        await logGoogleChatFailure(report.id, 'SPACE', error);
      }
    }

    if (this.shouldEnableBitbucket(updatedReport)) {
      try {
        updatedReport = await createBitbucketIssueIfNeeded(updatedReport);
      } catch (error: any) {
        console.error('[Report Created] Bitbucket issue 建立失敗:', error.message);
      }
    }

    if (this.shouldEnableJira(updatedReport)) {
      try {
        updatedReport = await createJiraIssueIfNeeded(updatedReport);
      } catch (error: any) {
        console.error('[Report Created] Jira issue 建立失敗:', error.message);
      }
    }

    return updatedReport;
  },

  async ensureIntegrations(report: ReportIntegrationRecord) {
    let updatedReport: any = report;

    if (this.shouldEnableGoogleChat(updatedReport)) {
      try {
        await createGoogleChatThreadIfNeeded(updatedReport);
      } catch (error: any) {
        console.error(
          `[Report Integration] 建立 Google Chat Thread 失敗 (${report.id}):`,
          error.message
        );
        await logGoogleChatFailure(report.id, 'SPACE', error);
      }
    }

    if (this.shouldEnableBitbucket(updatedReport)) {
      try {
        updatedReport = await createBitbucketIssueIfNeeded(updatedReport);
      } catch (error: any) {
        console.error(
          `[Report Integration] 建立 Bitbucket issue 失敗 (${report.id}):`,
          error.message
        );
      }
    }

    if (this.shouldEnableJira(updatedReport)) {
      try {
        updatedReport = await createJiraIssueIfNeeded(updatedReport);
      } catch (error: any) {
        console.error(
          `[Report Integration] 建立 Jira issue 失敗 (${report.id}):`,
          error.message
        );
      }
    }

    return updatedReport;
  },

  async teardownIntegrations(report: ReportIntegrationRecord) {
    const updatedReport: any = { ...report };

    const existingChatThread = await chatThreadService.findByReportId(report.id);
    if (existingChatThread) {
      try {
        await chatThreadService.delete(existingChatThread.id);
      } catch (error: any) {
        console.error(
          `[Report Integration] 移除 Google Chat Thread 映射失敗 (${report.id}):`,
          error.message
        );
      }
    }

    if (updatedReport.bitbucketIssueId) {
      if (bitbucketService.isEnabled()) {
        try {
          await bitbucketService.updateIssueState(updatedReport.bitbucketIssueId, 'closed');
        } catch (error: any) {
          console.error(
            `[Report Integration] 關閉 Bitbucket issue 失敗 (${report.id}):`,
            error.message
          );
        }
      } else {
        console.warn(
          `[Report Integration] Bitbucket 未啟用，無法關閉 issue (${report.id})`
        );
      }
    }

    await requestJiraUnlinkIfNeeded(updatedReport);

    if (
      updatedReport.bitbucketIssueId ||
      updatedReport.jiraIssueId ||
      updatedReport.jiraIssueKey
    ) {
      try {
        const savedReport = await prisma.report.update({
          where: { id: report.id },
          data: {
            bitbucketIssueId: null,
            jiraIssueId: null,
            jiraIssueKey: null,
          },
          include: {
            creator: { select: { id: true, name: true, email: true } },
            assignee: { select: { id: true, name: true, email: true } },
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

        return savedReport;
      } catch (error: any) {
        console.error(
          `[Report Integration] 清除外部整合綁定失敗 (${report.id}):`,
          error.message
        );
      }
    }

    return updatedReport;
  },

  async syncCategoryChange(
    previousReport: ReportIntegrationRecord,
    currentReport: ReportIntegrationRecord
  ) {
    const wasIntegrated = reportIntegrationPolicyService.shouldEnableAnyIntegration(previousReport);
    const isIntegrated = reportIntegrationPolicyService.shouldEnableAnyIntegration(currentReport);

    // 保存 currentReport 的關鍵 scalar field，確保在返回時不會遺漏
    const preservedDescription = currentReport.description;
    const preservedPriority = currentReport.priority;
    let result = currentReport;

    if (!wasIntegrated && isIntegrated) {
      result = await this.ensureIntegrations(currentReport);
    } else if (wasIntegrated && !isIntegrated) {
      result = await this.teardownIntegrations(currentReport);
    }

    // 確保返回的物件包含原始的 description 和 priority
    // 這防止在 Prisma 查詢或物件轉換過程中字段遺漏
    if (!result) {
      result = currentReport;
    }
    
    return {
      ...result,
      description: result.description ?? preservedDescription,
      priority: result.priority ?? preservedPriority,
    } as any;
  },
};

export default reportIntegrationService;