import { chatThreadService } from '@/services/chatThreadService';
import { googleChatService } from '@/services/googleChatService';
import { chatLogService } from '@/services/chatLogService';

export async function sendReportUpdateChatNotification(
  reportId: string,
  report: any,
  changes: Record<string, { old: any; new: any }>
) {
  if (!changes || Object.keys(changes).length === 0) return;

  try {
    const chatThread = await chatThreadService.findByReportId(reportId);

    if (!chatThread) return;

    const threadName = `spaces/${chatThread.chatSpaceId}/threads/${chatThread.chatThreadId}`;
    const text = googleChatService.formatReportUpdateText(report, changes);
    const chatResponse = await googleChatService.sendToThread(threadName, text, report);

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

      console.log(`[Report Updated] Google Chat 通知發送成功: ${reportId}`);
    }
  } catch (error: any) {
    console.error('[Report Updated] Google Chat 通知發送失敗:', error.message);

    await chatLogService.log({
      platform: 'GOOGLE_CHAT',
      type: 'THREAD',
      status: 'FAILED',
      request: null,
      response: { error: error.message },
      relatedId: reportId,
      relatedType: 'REPORT',
    });
  }
}

export async function sendReportDeleteChatNotification(
  reportId: string,
  report: any
) {
  try {
    const chatThread = await chatThreadService.findByReportId(reportId);

    if (!chatThread) return;

    const threadName = `spaces/${chatThread.chatSpaceId}/threads/${chatThread.chatThreadId}`;
    const text = googleChatService.formatReportDeleteText(report);
    const chatResponse = await googleChatService.sendToThread(threadName, text, report);

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
  } catch (error: any) {
    console.error('[Report Deleted] Google Chat 通知發送失敗:', error.message);

    await chatLogService.log({
      platform: 'GOOGLE_CHAT',
      type: 'THREAD',
      status: 'FAILED',
      request: null,
      response: { error: error.message },
      relatedId: reportId,
      relatedType: 'REPORT',
    });
  }
}
