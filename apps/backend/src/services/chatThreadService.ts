/**
 * ChatThread Service
 * 管理 Report 與 Google Chat Thread 的關聯
 */

import { prisma } from '@/lib/prisma';

export const chatThreadService = {
  /**
   * 建立 ChatThread 記錄
   */
  async create(
    reportId: string,
    chatSpaceId: string,
    chatThreadId: string,
    chatSpaceName?: string
  ) {
    try {
      const chatThread = await prisma.chatThread.create({
        data: {
          reportId,
          platform: 'GOOGLE_CHAT',
          chatSpaceId,
          chatThreadId,
          chatSpaceName,
        },
      });

      console.log(`[ChatThread] 建立成功: Report ${reportId} -> Thread ${chatThreadId}`);
      return chatThread;
    } catch (error: any) {
      console.error('[ChatThread] 建立失敗:', error.message);
      throw error;
    }
  },

  /**
   * 根據 Report ID 查詢 ChatThread
   */
  async findByReportId(reportId: string) {
    try {
      return await prisma.chatThread.findUnique({
        where: { reportId },
      });
    } catch (error: any) {
      console.error('[ChatThread] 查詢失敗:', error.message);
      return null;
    }
  },

  /**
   * 根據多個 Report ID 查詢 ChatThread
   */
  async findByReportIds(reportIds: string[]) {
    try {
      return await prisma.chatThread.findMany({
        where: {
          reportId: {
            in: reportIds,
          },
        },
      });
    } catch (error: any) {
      console.error('[ChatThread] 批次查詢失敗:', error.message);
      return [];
    }
  },

  /**
   * 更新 ChatThread 資訊
   */
  async update(
    id: string,
    data: {
      chatSpaceId?: string;
      chatThreadId?: string;
      chatSpaceName?: string;
    }
  ) {
    try {
      return await prisma.chatThread.update({
        where: { id },
        data,
      });
    } catch (error: any) {
      console.error('[ChatThread] 更新失敗:', error.message);
      throw error;
    }
  },

  /**
   * 刪除 ChatThread
   */
  async delete(id: string) {
    try {
      await prisma.chatThread.delete({
        where: { id },
      });
      console.log(`[ChatThread] 刪除成功: ${id}`);
    } catch (error: any) {
      console.error('[ChatThread] 刪除失敗:', error.message);
      throw error;
    }
  },

  /**
   * 檢查 Report 是否已有 ChatThread
   */
  async exists(reportId: string): Promise<boolean> {
    try {
      const count = await prisma.chatThread.count({
        where: { reportId },
      });
      return count > 0;
    } catch (error: any) {
      console.error('[ChatThread] 檢查失敗:', error.message);
      return false;
    }
  },
};
