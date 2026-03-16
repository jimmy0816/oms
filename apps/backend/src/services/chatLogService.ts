/**
 * ChatLog Service
 * 記錄所有 Google Chat 通知的日誌
 */

import { prisma } from '@/lib/prisma';

type ChatLogStatus = 'SUCCESS' | 'FAILED' | 'PENDING';
type ChatLogType = 'SPACE' | 'THREAD';
type ChatLogPlatform = 'GOOGLE_CHAT';

interface CreateChatLogParams {
  platform: ChatLogPlatform;
  type: ChatLogType;
  status: ChatLogStatus;
  request?: any;
  response: any;
  relatedId?: string;
  relatedType?: string;
}

export const chatLogService = {
  /**
   * 記錄 Chat 通知日誌
   */
  async log(params: CreateChatLogParams) {
    try {
      const chatLog = await prisma.chatLog.create({
        data: {
          platform: params.platform,
          type: params.type,
          status: params.status,
          request: params.request || {},
          response: params.response,
          relatedId: params.relatedId,
          relatedType: params.relatedType,
        },
      });

      console.log(
        `[ChatLog] 記錄成功: ${params.platform} ${params.type} ${params.status}`
      );
      return chatLog;
    } catch (error: any) {
      console.error('[ChatLog] 記錄失敗:', error.message);
      // 不拋出錯誤，避免影響主要業務流程
      return null;
    }
  },

  /**
   * 根據關聯 ID 和類型查詢日誌
   */
  async findByRelated(relatedId: string, relatedType: string) {
    try {
      return await prisma.chatLog.findMany({
        where: {
          relatedId,
          relatedType,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error: any) {
      console.error('[ChatLog] 查詢失敗:', error.message);
      return [];
    }
  },

  /**
   * 根據平台查詢日誌
   */
  async findByPlatform(platform: ChatLogPlatform, limit: number = 100) {
    try {
      return await prisma.chatLog.findMany({
        where: { platform },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });
    } catch (error: any) {
      console.error('[ChatLog] 查詢失敗:', error.message);
      return [];
    }
  },

  /**
   * 根據狀態查詢日誌
   */
  async findByStatus(status: ChatLogStatus, limit: number = 100) {
    try {
      return await prisma.chatLog.findMany({
        where: { status },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });
    } catch (error: any) {
      console.error('[ChatLog] 查詢失敗:', error.message);
      return [];
    }
  },

  /**
   * 更新日誌狀態
   */
  async updateStatus(id: string, status: ChatLogStatus) {
    try {
      return await prisma.chatLog.update({
        where: { id },
        data: { status },
      });
    } catch (error: any) {
      console.error('[ChatLog] 更新失敗:', error.message);
      return null;
    }
  },

  /**
   * 統計日誌數量
   */
  async getStats() {
    try {
      const [total, success, failed, pending] = await Promise.all([
        prisma.chatLog.count(),
        prisma.chatLog.count({ where: { status: 'SUCCESS' } }),
        prisma.chatLog.count({ where: { status: 'FAILED' } }),
        prisma.chatLog.count({ where: { status: 'PENDING' } }),
      ]);

      return {
        total,
        success,
        failed,
        pending,
        successRate: total > 0 ? ((success / total) * 100).toFixed(2) + '%' : '0%',
      };
    } catch (error: any) {
      console.error('[ChatLog] 統計失敗:', error.message);
      return {
        total: 0,
        success: 0,
        failed: 0,
        pending: 0,
        successRate: '0%',
      };
    }
  },
};
