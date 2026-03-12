import { prisma } from '@/lib/prisma';
import { bitbucketService } from '@/services/bitbucketService';
import { notificationService } from '@/services/notificationService';
import { reportIntegrationService } from '@/services/reportIntegrationService';

const OMS_SYNC_MARKER = '<!-- OMS_SYNC_ORIGIN:OMS -->';

interface CreateReportCommentParams {
  reportId: string;
  userId: string;
  content: string;
  source: 'OMS' | 'BITBUCKET';
  bitbucketActorName?: string;
}

interface SyncBitbucketCommentToOmsParams {
  issueId: string;
  commentId: string;
  content: string;
  actorName?: string;
  botUserId: string;
}

const formatBitbucketCommentForOms = (actorName: string, content: string) => {
  return `[Bitbucket] ${actorName}\n${content.trim()}`;
};

const formatOmsCommentForBitbucket = (commenterName: string, content: string) => {
  return `**OMS 留言 - ${commenterName}**\n\n${content.trim()}\n\n${OMS_SYNC_MARKER}`;
};

const formatCommentThreadText = (report: { id: string; title: string }, comment: { content: string; user?: { name?: string | null } }, source: 'OMS' | 'BITBUCKET') => {
  const omsUrl = process.env.PUBLIC_FRONTEND_URL || 'http://localhost:3000';
  const reportUrl = `${omsUrl}/reports/${report.id}`;
  const sender =
    source === 'BITBUCKET'
      ? comment.user?.name || 'Bitbucket User'
      : comment.user?.name || '有人';

  return [
    '💬 *通報新留言*',
    `通報編號: ${report.id}`,
    `標題: ${report.title}`,
    `來源: ${source === 'BITBUCKET' ? 'Bitbucket' : 'OMS'}`,
    `留言者: ${sender}`,
    '',
    comment.content,
    '',
    `查看通報: ${reportUrl}`,
  ].join('\n');
};

const notifyReportComment = async (
  report: { id: string; title: string; creatorId: string; assigneeId?: string | null },
  commenterUserId: string,
  commenterName: string
) => {
  const notificationMessage = `${commenterName} 在通報「${report.title}」留言`;
  const recipients = new Set<string>();

  if (report.creatorId !== commenterUserId) {
    recipients.add(report.creatorId);
  }

  if (report.assigneeId && report.assigneeId !== commenterUserId) {
    recipients.add(report.assigneeId);
  }

  const previousCommenters = await prisma.comment.findMany({
    where: { reportId: report.id },
    select: { userId: true },
    distinct: ['userId'],
  });

  previousCommenters.forEach((commenter) => {
    if (commenter.userId !== commenterUserId) {
      recipients.add(commenter.userId);
    }
  });

  if (recipients.size === 0) return;

  await Promise.all(
    Array.from(recipients).map((recipientId) =>
      notificationService.create({
        title: '通報新留言',
        message: notificationMessage,
        userId: recipientId,
        relatedId: report.id,
        relatedType: 'REPORT',
      })
    )
  );
};

const notifyReportCommentToGoogleChat = async (
  report: any,
  comment: any,
  source: 'OMS' | 'BITBUCKET'
) => {
  const text = formatCommentThreadText(report, comment, source);
  await reportIntegrationService.sendMessageToReportThread({
    reportId: report.id,
    text,
    relatedId: report.id,
    relatedType: 'REPORT',
    failureLogMessage: '[Report Comment] Google Chat 通知失敗:',
  });
};

export const reportCommentService = {
  isOmsSyncedBitbucketComment(content: string) {
    return content.includes(OMS_SYNC_MARKER);
  },

  stripOmsSyncMarker(content: string) {
    return content.replace(OMS_SYNC_MARKER, '').trim();
  },

  async createReportComment(params: CreateReportCommentParams) {
    const { reportId, userId, content, source, bitbucketActorName } = params;

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const storedContent =
      source === 'BITBUCKET'
        ? formatBitbucketCommentForOms(bitbucketActorName || 'Bitbucket User', content)
        : content;

    const comment = await prisma.comment.create({
      data: {
        content: storedContent,
        reportId,
        userId,
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

    const commenterName = user.name || '有人';

    await notifyReportComment(report, userId, commenterName);
    await notifyReportCommentToGoogleChat(report, comment, source);

    if (
      source === 'OMS' &&
      report.bitbucketIssueId &&
      bitbucketService.isEnabled()
    ) {
      try {
        const bitbucketComment = formatOmsCommentForBitbucket(commenterName, content);
        await bitbucketService.createIssueComment(report.bitbucketIssueId, bitbucketComment);
      } catch (error: any) {
        console.error('[Report Comment] 同步 Bitbucket 留言失敗:', error.message);
      }
    }

    return comment;
  },

  async syncBitbucketIssueCommentToOms(params: SyncBitbucketCommentToOmsParams) {
    const { issueId, commentId, content, actorName, botUserId } = params;

    if (this.isOmsSyncedBitbucketComment(content)) {
      return { created: false, reason: 'skip_oms_origin_comment' as const };
    }

    const report = await prisma.report.findFirst({
      where: { bitbucketIssueId: issueId },
      select: {
        id: true,
      },
    });

    if (!report) {
      return { created: false, reason: 'report_not_found' as const };
    }

    const contentForOms = formatBitbucketCommentForOms(
      actorName || 'Bitbucket User',
      content
    );

    const existingComment = await prisma.comment.findFirst({
      where: {
        reportId: report.id,
        userId: botUserId,
        content: contentForOms,
      },
      select: { id: true },
    });

    if (existingComment) {
      return { created: false, reason: 'duplicate_comment' as const };
    }

    const comment = await this.createReportComment({
      reportId: report.id,
      userId: botUserId,
      content,
      source: 'BITBUCKET',
      bitbucketActorName: actorName,
    });

    return {
      created: true,
      comment,
      reportId: report.id,
      commentId,
    };
  },
};
