import {
  Ticket,
  TicketStatus,
  TicketPriority,
  PaginatedResponse,
  CreateTicketRequest,
} from 'shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const getAuthHeaders = (): HeadersInit => {
  if (typeof window === 'undefined')
    return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token');
  const headeres: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headeres.Authorization = `Bearer ${token}`;
  }
  return headeres;
};

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
    pageSize = 10,
    filters: Record<string, any> = {} // Changed to 'any' to allow number[]
  ): Promise<PaginatedResponse<Ticket>> {
    try {
      // 構建查詢參數
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      // 處理 locationIds 陣列，將其轉換為逗號分隔的字串
      if (filters.locationIds && filters.locationIds.length > 0) {
        queryParams.append('locationIds', filters.locationIds.join(','));
      }

      // 將其他過濾條件添加到查詢參數中
      for (const key in filters) {
        if (key !== 'locationIds' && filters[key]) {
          if (Array.isArray(filters[key])) {
            if (filters[key].length > 0) {
              queryParams.append(key, filters[key].join(','));
            }
          } else {
            queryParams.append(key, filters[key].toString());
          }
        }
      }

      const response = await fetch(
        `${API_URL}/api/tickets?${queryParams.toString()}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '獲取工單失敗');
      }

      const result = await response.json();

      // 處理日期格式
      if (result.success && result.data.items) {
        result.data.items = result.data.items.map((ticket: any) => ({
          ...ticket,
          createdAt: new Date(ticket.createdAt),
          updatedAt: new Date(ticket.updatedAt),
        }));
      }

      return result.data;
    } catch (error) {
      console.error('獲取工單列表失敗:', error);
      throw error;
    }
  },

  /**
   * 根據 ID 獲取工單
   */
  async getTicketById(id: string): Promise<Ticket> {
    try {
      const response = await fetch(`${API_URL}/api/tickets/${id}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '獲取工單詳情失敗');
      }

      const result = await response.json();

      // 處理日期格式
      if (result.success && result.data) {
        const ticket = {
          ...result.data,
          createdAt: new Date(result.data.createdAt),
          updatedAt: new Date(result.data.updatedAt),
        };

        // 處理評論中的日期
        if (ticket.comments) {
          ticket.comments = ticket.comments.map((comment: any) => ({
            ...comment,
            createdAt: new Date(comment.createdAt),
            updatedAt: new Date(comment.updatedAt),
          }));
        }

        if (ticket.activityLogs) {
          ticket.activityLogs = ticket.activityLogs.map((activityLog: any) => ({
            ...activityLog,
            createdAt: new Date(activityLog.createdAt),
            updatedAt: new Date(activityLog.updatedAt),
          }));
        }

        return ticket;
      }

      throw new Error('獲取工單詳情失敗');
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
      const response = await fetch(`${API_URL}/api/tickets`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(ticketData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '創建工單失敗');
      }

      const result = await response.json();

      // 處理日期格式
      if (result.success && result.data) {
        return {
          ...result.data,
          createdAt: new Date(result.data.createdAt),
          updatedAt: new Date(result.data.updatedAt),
        };
      }

      throw new Error('創建工單失敗');
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
      const response = await fetch(`${API_URL}/api/tickets/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(ticketData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '更新工單失敗');
      }

      const result = await response.json();

      // 處理日期格式
      if (result.success && result.data) {
        return {
          ...result.data,
          createdAt: new Date(result.data.createdAt),
          updatedAt: new Date(result.data.updatedAt),
        };
      }

      throw new Error('更新工單失敗');
    } catch (error) {
      console.error(`更新工單 ${id} 失敗:`, error);
      throw error;
    }
  },

  /**
   * 刪除工單
   */
  async deleteTicket(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/api/tickets/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      console.log('delete ticket', response);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '刪除工單失敗');
      }

      const result = await response.json();
      return result.success;
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
      const response = await fetch(`${API_URL}/api/tickets/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ticketId, content, userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '添加評論失敗');
      }

      const result = await response.json();

      // 處理日期格式
      if (result.success && result.data) {
        return {
          ...result.data,
          createdAt: new Date(result.data.createdAt),
          updatedAt: new Date(result.data.updatedAt),
        };
      }

      throw new Error('添加評論失敗');
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
      const response = await fetch(`${API_URL}/api/activitylogs`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          content,
          userId,
          parentId: ticketId,
          parentType: 'TICKET',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '添加活動日誌失敗');
      }

      const result = await response.json();

      // 處理日期格式
      if (result.success && result.data) {
        return {
          ...result.data,
          createdAt: new Date(result.data.createdAt),
          updatedAt: new Date(result.data.updatedAt),
        };
      }

      throw new Error('添加活動日誌失敗');
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
      const response = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'claim' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '認領工單失敗');
      }

      const result = await response.json();

      // 處理日期格式
      if (result.success && result.data) {
        await this.addActivityLog(ticketId, '認領工單', userId);

        return {
          ...result.data,
          createdAt: new Date(result.data.createdAt),
          updatedAt: new Date(result.data.updatedAt),
        };
      }

      throw new Error('認領工單失敗');
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
      const response = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'abandon' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '放棄工單失敗');
      }

      const result = await response.json();

      // 處理日期格式
      if (result.success && result.data) {
        await this.addActivityLog(ticketId, '放棄工單', userId);

        return {
          ...result.data,
          createdAt: new Date(result.data.createdAt),
          updatedAt: new Date(result.data.updatedAt),
        };
      }

      throw new Error('放棄工單失敗');
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
    attachments: any[]
  ): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/api/tickets/${ticketId}/reviews`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content, attachments }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '提交審核失敗');
      }

      return await response.json();
    } catch (error) {
      console.error('提交審核失敗:', error);
      throw error;
    }
  },
};
