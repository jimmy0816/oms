import { Ticket, TicketStatus, TicketPriority, PaginatedResponse, CreateTicketRequest } from 'shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003/api';

/**
 * 工單服務 - 處理與工單相關的 API 請求
 */
export const ticketService = {
  /**
   * 獲取所有工單
   */
  async getAllTickets(page = 1, pageSize = 10, filters: Record<string, string> = {}): Promise<PaginatedResponse<Ticket>> {
    try {
      // 構建查詢參數
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...filters
      });

      const response = await fetch(`${API_URL}/tickets?${queryParams.toString()}`);
      
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
      const response = await fetch(`${API_URL}/tickets/${id}`);
      
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
      const response = await fetch(`${API_URL}/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      const response = await fetch(`${API_URL}/tickets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
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
      const response = await fetch(`${API_URL}/tickets/${id}`, {
        method: 'DELETE',
      });
      
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
  async addCommentToTicket(ticketId: string, content: string, userId: string): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/tickets/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
   * 分配工單給用戶
   */
  async assignTicket(id: string, assigneeId: string): Promise<Ticket> {
    return this.updateTicket(id, { assigneeId });
  }
};

export default ticketService;
