import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { ReportStatus } from 'shared-types';
import { bitbucketService } from '@/services/bitbucketService';
import { sendReportUpdateChatNotification } from '@/services/reportUpdateNotificationService';

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
      const issue = bitbucketService.extractIssueFromWebhook(req.body);
      console.log('Bitbucket issue payload:', JSON.stringify(issue, null, 2));

      if (issue?.id && issue?.state?.toLowerCase() === 'resolved') {
        const report = await prisma.report.findFirst({
          where: { bitbucketIssueId: issue.id },
          include: {
            creator: { select: { id: true, name: true, email: true } },
            assignee: { select: { id: true, name: true, email: true } },
            category: { select: { id: true, name: true } },
          },
        });

        if (report && report.status !== ReportStatus.REVIEWED) {
          const updatedReport = await prisma.report.update({
            where: { id: report.id },
            data: { status: ReportStatus.REVIEWED },
            include: {
              creator: { select: { id: true, name: true, email: true } },
              assignee: { select: { id: true, name: true, email: true } },
              category: { select: { id: true, name: true } },
            },
          });

          await sendReportUpdateChatNotification(report.id, updatedReport, {
            status: { old: report.status, new: ReportStatus.REVIEWED },
          });
        }
      }
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
