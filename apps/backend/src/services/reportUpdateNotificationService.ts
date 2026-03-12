import { reportIntegrationService } from '@/services/reportIntegrationService';

export async function sendReportUpdateChatNotification(
  reportId: string,
  report: any,
  changes: Record<string, { old: any; new: any }>
) {
  if (!changes || Object.keys(changes).length === 0) return;

  const text = reportIntegrationService.formatReportUpdateText(report, changes);
  await reportIntegrationService.sendMessageToReportThread({
    reportId,
    text,
    relatedId: reportId,
    relatedType: 'REPORT',
    successLogMessage: `[Report Updated] Google Chat 通知發送成功: ${reportId}`,
    failureLogMessage: '[Report Updated] Google Chat 通知發送失敗:',
  });
}

export async function sendReportDeleteChatNotification(
  reportId: string,
  report: any
) {
  const text = reportIntegrationService.formatReportDeleteText(report);
  await reportIntegrationService.sendMessageToReportThread({
    reportId,
    text,
    relatedId: reportId,
    relatedType: 'REPORT',
    successLogMessage: `[Report Deleted] Google Chat 通知發送成功: ${reportId}`,
    failureLogMessage: '[Report Deleted] Google Chat 通知發送失敗:',
  });
}
