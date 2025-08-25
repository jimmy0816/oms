import apiClient from '@/lib/apiClient';
import {
  Ticket,
  TicketStatus,
  TicketPriority,
  PaginatedResponse,
  CreateTicketRequest,
} from 'shared-types';

// 取得狀態文字說明
export const getStatusText = (status: TicketStatus) => {
  switch (status) {
    case TicketStatus.PENDING:
      return '待處理';
    case TicketStatus.IN_PROGRESS:
      return '進行中';
    case TicketStatus.COMPLETED:
      return '已完工';
    case TicketStatus.VERIFIED:
      return '已驗收';
    case TicketStatus.FAILED:
      return '無法完工';
    case TicketStatus.VERIFICATION_FAILED:
      return '驗收失敗';
    default:
      return status;
  }
};

// 取得優先級文字說明
export const getPriorityText = (priority: TicketPriority) => {
  switch (priority) {
    case TicketPriority.LOW:
      return '低';
    case TicketPriority.MEDIUM:
      return '中';
    case TicketPriority.HIGH:
      return '高';
    case TicketPriority.URGENT:
      return '緊急';
    default:
      return priority;
  }
};

export const getStatusColor = (status: TicketStatus) => {
  switch (status) {
    case TicketStatus.PENDING:
      return 'bg-gray-100 text-gray-800'; // 待處理
    case TicketStatus.IN_PROGRESS:
      return 'bg-blue-100 text-blue-800'; // 進行中
    case TicketStatus.COMPLETED:
      return 'bg-purple-100 text-purple-800'; // 已完工
    case TicketStatus.VERIFIED:
      return 'bg-green-100 text-green-800'; // 已驗收
    case TicketStatus.FAILED:
      return 'bg-red-100 text-red-800'; // 無法完工
    case TicketStatus.VERIFICATION_FAILED:
      return 'bg-orange-100 text-orange-800'; // 驗收失敗
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getPriorityColor = (priority: TicketPriority) => {
  switch (priority) {
    case TicketPriority.LOW:
      return 'bg-green-100 text-green-800';
    case TicketPriority.MEDIUM:
      return 'bg-blue-100 text-blue-800';
    case TicketPriority.HIGH:
      return 'bg-orange-100 text-orange-800';
    case TicketPriority.URGENT:
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * 工單服務 - 處理與工單相關的 API 請求
 */
/**
 *  ticketService   API
 * @module ticketService
 */
export const ticketService = {
  /**
   * 獲取所有工單
   */
  async getAllTickets(
    page = 1,
    pageSize = 20,
    filters: {
      status?: string[];
      priority?: string[];
      search?: string;
      locationIds?: string[];
      roleIds?: string[];
      creatorIds?: string[];
      assigneeIds?: string[];
      sortField?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<PaginatedResponse<Ticket>> {
    try {
      const params: Record<string, any> = { page, pageSize };

      // 動態、自動化地處理所有過濾條件
      Object.keys(filters).forEach((key) => {
        const value = filters[key as keyof typeof filters];
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value) && value.length > 0) {
            params[key] = value.join(',');
          } else if (!Array.isArray(value)) {
            params[key] = value;
          }
        }
      });

      const paginatedResponse = await apiClient.get<PaginatedResponse<Ticket>>(
        '/api/tickets',
        params
      );

      // 處理日期格式
      paginatedResponse.items = paginatedResponse.items.map((ticket: any) => ({
        ...ticket,
        createdAt: new Date(ticket.createdAt),
        updatedAt: new Date(ticket.updatedAt),
      }));

      return paginatedResponse;
    } catch (error) {
      console.error('獲取工單列表失敗:', error);
      throw error;
    }
  },

  /**
   * 匯出工單
   */
  async exportTickets(filters: any): Promise<Blob> {
    try {
      const response = await apiClient.post<Blob>('/api/tickets/export', filters, {
        responseType: 'blob',
        headers: { 'Content-Type': 'application/json' },
      });
      return response;
    } catch (error) {
      console.error('匯出工單失敗:', error);
      throw error;
    }
  },

  /**
   * 根據 ID 獲取工單
   */
  async getTicketById(id: string): Promise<Ticket> {
    try {
      const ticket = await apiClient.get<Ticket>(`/api/tickets/${id}`);

      // 遞歸處理日期格式
      const parseDates = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(parseDates);

        return Object.entries(obj).reduce((acc, [key, value]) => {
          if (
            (key === 'createdAt' || key === 'updatedAt') &&
            typeof value === 'string'
          ) {
            acc[key] = new Date(value);
          } else {
            acc[key] = parseDates(value);
          }
          return acc;
        }, {} as any);
      };

      return parseDates(ticket);
    } catch (error) {
      console.error(`獲取工單 ${id} 詳情失敗:`, error);
      throw error;
    }
  },

  /**
   * 創建新工單
   */
  async createTicket(ticketData: CreateTicketRequest): Promise<Ticket> {
    try {
      const ticket = await apiClient.post<Ticket>('/api/tickets', ticketData);
      return {
        ...ticket,
        createdAt: new Date(ticket.createdAt),
        updatedAt: new Date(ticket.updatedAt),
      };
    } catch (error) {
      console.error('創建工單失敗:', error);
      throw error;
    }
  },

  /**
   * 更新工單
   */
  async updateTicket(id: string, ticketData: Partial<Ticket>): Promise<Ticket> {
    try {
      const ticket = await apiClient.put<Ticket>(
        `/api/tickets/${id}`,
        ticketData
      );
      return {
        ...ticket,
        createdAt: new Date(ticket.createdAt),
        updatedAt: new Date(ticket.updatedAt),
      };
    } catch (error) {
      console.error(`更新工單 ${id} 失敗:`, error);
      throw error;
    }
  },

  /**
   * 刪除工單
   */
  async deleteTicket(id: string): Promise<void> {
    try {
      await apiClient.delete<void>(`/api/tickets/${id}`);
    } catch (error) {
      console.error(`刪除工單 ${id} 失敗:`, error);
      throw error;
    }
  },

  /**
   * 添加評論到工單
   */
  async addCommentToTicket(
    ticketId: string,
    content: string,
    userId: string
  ): Promise<any> {
    try {
      const comment = await apiClient.post<any>('/api/tickets/comments', {
        ticketId,
        content,
        userId,
      });
      return {
        ...comment,
        createdAt: new Date(comment.createdAt),
        updatedAt: new Date(comment.updatedAt),
      };
    } catch (error) {
      console.error('添加評論失敗:', error);
      throw error;
    }
  },

  /**
   * 更新工單狀態
   */
  async updateTicketStatus(id: string, status: TicketStatus): Promise<Ticket> {
    return this.updateTicket(id, { status });
  },

  /**
   * 添加活動日誌
   */
  async addActivityLog(
    ticketId: string,
    content: string,
    userId: string
  ): Promise<any> {
    try {
      const activityLog = await apiClient.post<any>('/api/activitylogs', {
        content,
        userId,
        parentId: ticketId,
        parentType: 'TICKET',
      });
      return {
        ...activityLog,
        createdAt: new Date(activityLog.createdAt),
        updatedAt: new Date(activityLog.updatedAt),
      };
    } catch (error) {
      console.error('添加活動日誌失敗:', error);
      throw error;
    }
  },

  /**
   * 認領工單
   */
  async claimTicket(ticketId: string, userId: string): Promise<Ticket> {
    try {
      const ticket = await apiClient.patch<Ticket>(`/api/tickets/${ticketId}`, {
        action: 'claim',
      });
      await this.addActivityLog(ticketId, '認領工單', userId);
      return {
        ...ticket,
        createdAt: new Date(ticket.createdAt),
        updatedAt: new Date(ticket.updatedAt),
      };
    } catch (error) {
      console.error('認領工單失敗:', error);
      throw error;
    }
  },

  /**
   * 放棄工單
   */
  async abandonTicket(ticketId: string, userId: string): Promise<Ticket> {
    try {
      const ticket = await apiClient.patch<Ticket>(`/api/tickets/${ticketId}`, {
        action: 'abandon',
      });
      await this.addActivityLog(ticketId, '放棄工單', userId);
      return {
        ...ticket,
        createdAt: new Date(ticket.createdAt),
        updatedAt: new Date(ticket.updatedAt),
      };
    } catch (error) {
      console.error('放棄工單失敗:', error);
      throw error;
    }
  },

  /**
   * 提交工單審核
   */
  async submitTicketReview(
    ticketId: string,
    content: string,
    attachments: any[],
    finalStatus: 'COMPLETED' | 'FAILED'
  ): Promise<any> {
    try {
      return await apiClient.post<any>(`/api/tickets/${ticketId}/reviews`, {
        content,
        attachments,
        finalStatus,
      });
    } catch (error) {
      console.error('提交審核失敗:', error);
      throw error;
    }
  },
};
