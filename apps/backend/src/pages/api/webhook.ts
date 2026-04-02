import { NextApiRequest, NextApiResponse } from 'next';
import { ReportStatus } from 'shared-types';
import { bitbucketService } from '@/services/bitbucketService';
import { jiraService } from '@/services/jiraService';
import { reportMutationService } from '@/services/reportMutationService';
import { getBitbucketBotUserOrThrow } from '@/lib/bot-user';
import { reportCommentService } from '@/services/reportCommentService';

/**
 * Webhook 接收端點
 * @param req 請求對象
 * @param res 響應對象
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允許 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: '僅支援 POST 方法' });
  }

  const originPlatform = Array.isArray(req.query.origin_platform)
    ? req.query.origin_platform[0]
    : req.query.origin_platform;

  try {
    console.log('=== 收到 Webhook 請求 ===');
    console.log('時間:', new Date().toISOString());
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Origin Platform:', originPlatform ?? 'unknown');
    console.log('Query:', JSON.stringify(req.query, null, 2));
    console.log('========================\n');

    if (originPlatform === 'bitbucket') {
      const botUser = await getBitbucketBotUserOrThrow();
      const commentPayload = bitbucketService.extractIssueCommentFromWebhook(req.body);

      if (commentPayload) {
        await reportCommentService.syncBitbucketIssueCommentToOms({
          issueId: commentPayload.issueId,
          commentId: commentPayload.commentId,
          content: commentPayload.content,
          actorName: commentPayload.actorName,
          botUserId: botUser.id,
        });
      }

      const hasStateChange =
        typeof req.body?.changes?.state?.old === 'string' ||
        typeof req.body?.changes?.state?.new === 'string' ||
        typeof req.body?.changes?.status?.old === 'string' ||
        typeof req.body?.changes?.status?.new === 'string';

      if (commentPayload && !hasStateChange) {
        return res.status(200).json({
          success: true,
          message: 'Bitbucket comment webhook 已處理',
          originPlatform: originPlatform ?? null,
          receivedAt: new Date().toISOString(),
        });
      }

      const issue = bitbucketService.extractIssueFromWebhook(req.body);
      console.log('Bitbucket issue payload:', JSON.stringify(issue, null, 2));

      const updateReportStatusByIssue = async (targetStatus: ReportStatus) => {
        if (!issue?.id) return;

        await reportMutationService.updateReportStatusByBitbucketIssueId(
          issue.id,
          targetStatus,
          {
            actorUserId: botUser.id,
            source: 'WEBHOOK_BITBUCKET',
            syncBitbucketState: false,
            sendChatNotification: true,
            createActivityLog: true,
          }
        );
      };

      const previousIssueStateRaw =
        req.body?.changes?.state?.old ?? req.body?.changes?.status?.old;

      const previousIssueState =
        typeof previousIssueStateRaw === 'string'
          ? previousIssueStateRaw.toLowerCase()
          : null;

      const isReopenedFromClosedState =
        previousIssueState === 'resolved' ||
        previousIssueState === 'wontfix' ||
        previousIssueState === 'closed';

      const mapIssueStateToReportStatus = (state: string | null): ReportStatus | null => {
        switch (state) {
          case 'resolved':
            return ReportStatus.PENDING_REVIEW;
          case 'open':
            return ReportStatus.RETURNED;
          case 'wontfix':
            return ReportStatus.REJECTED;
          default:
            return null;
        }
      };

      if (issue?.id && issue?.state) {
        switch (issue.state) {
          case 'resolved': {
            const targetStatus = ReportStatus.PENDING_REVIEW;
            if (mapIssueStateToReportStatus(previousIssueState) === targetStatus) break;
            await updateReportStatusByIssue(targetStatus);
            break;
          }
          case 'open': {
            if (!isReopenedFromClosedState) {
              console.log(
                '[Webhook] issue.state=open 但非從關閉態重新開啟，略過同步為 RETURNED'
              );
              break;
            }

            const targetStatus = ReportStatus.RETURNED;
            if (mapIssueStateToReportStatus(previousIssueState) === targetStatus) break;
            await updateReportStatusByIssue(targetStatus);
            break;
          }
          case 'wontfix': {
            const targetStatus = ReportStatus.REJECTED;
            if (mapIssueStateToReportStatus(previousIssueState) === targetStatus) break;
            await updateReportStatusByIssue(targetStatus);
            break;
          }
        }
      }
    }

    if (originPlatform === 'jira') {
      const issue = jiraService.extractIssueFromWebhook(req.body);
      if (!issue) {
        return res.status(200).json({
          success: true,
          message: 'Jira webhook 無可處理 issue 資訊',
          originPlatform: originPlatform ?? null,
          receivedAt: new Date().toISOString(),
        });
      }

      const targetStatus = jiraService.mapJiraStatusToReportStatus(issue.statusName);
      if (!targetStatus) {
        return res.status(200).json({
          success: true,
          message: `Jira status (${issue.statusName}) 無對應 OMS 狀態，已略過`,
          originPlatform: originPlatform ?? null,
          receivedAt: new Date().toISOString(),
        });
      }

      await reportMutationService.updateReportStatusByJiraIssueId(
        issue.issueId,
        targetStatus,
        {
          source: 'WEBHOOK_JIRA',
          syncBitbucketState: false,
          syncJiraState: false,
          sendChatNotification: true,
          createActivityLog: true,
        }
      );
    }

    // 回傳成功訊息
    return res.status(200).json({ 
      success: true, 
      message: 'Webhook 已接收',
      originPlatform: originPlatform ?? null,
      receivedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('處理 Webhook 時發生錯誤:', error);
    return res.status(500).json({ 
      success: false, 
      error: '處理 Webhook 失敗' 
    });
  }
}

export default handler;
