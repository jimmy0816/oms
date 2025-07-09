import { PaginatedResponse } from 'shared-types';
import { Ticket } from 'shared-types';

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

// Report 類型定義
export interface Report {
  id: string;
  title: string;
  description: string;
  location?: string | null;
  status: string;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
  creatorId: string;
  assigneeId?: string | null;
  images: string[];
  category?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
  } | null;
  comments?: Array<{
    id: string;
    content: string;
    createdAt: Date;
    userId: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  tickets?: Ticket[];
  attachments?: Array<{
    id: string;
    filename: string;
    url: string;
    fileType: string;
    fileSize: number;
    createdAt: Date;
    createdById?: string | null;
    createdBy?: {
      id: string;
      name: string;
      email: string;
    } | null;
  }>;
  activityLogs?: Array<{
    id: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
    parentId: string;
    parentType: string;
  }>;
}

// 創建通報請求類型
export interface CreateReportRequest {
  title: string;
  description: string;
  location?: string;
  priority?: string;
  category?: string;
  contactPhone?: string;
  contactEmail?: string;
  images?: string[];
  assigneeId?: string;
}

// 通報狀態枚舉
export enum ReportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  REJECTED = 'REJECTED',
  PENDING_REVIEW = 'PENDING_REVIEW', // 待審核
  REVIEWED = 'REVIEWED', // 已歸檔
}

// 通報優先級枚舉
export enum ReportPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/**
 * 通報服務 - 處理與通報相關的 API 請求
 */
export const reportService = {
  /**
   * 獲取所有通報
   */
  async getAllReports(
    page = 1,
    pageSize = 10,
    filters: Record<string, string> = {}
  ): Promise<PaginatedResponse<Report>> {
    try {
      // 構建查詢參數
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...filters,
      });

      const response = await fetch(
        `${API_URL}/api/reports?${queryParams.toString()}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '獲取通報失敗');
      }

      const result = await response.json();

      // 處理日期格式
      if (result.success && result.data.items) {
        result.data.items = result.data.items.map((report: any) => ({
          ...report,
          createdAt: new Date(report.createdAt),
          updatedAt: new Date(report.updatedAt),
        }));
      }

      return result.data;
    } catch (error) {
      console.error('獲取通報列表失敗:', error);
      throw error;
    }
  },

  /**
   * 根據 ID 獲取通報
   */
  async getReportById(id: string): Promise<Report> {
    try {
      const response = await fetch(`${API_URL}/api/reports/${id}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '獲取通報詳情失敗');
      }

      const result = await response.json();

      // 處理日期格式
      if (result.success && result.data) {
        const report = {
          ...result.data,
          createdAt: new Date(result.data.createdAt),
          updatedAt: new Date(result.data.updatedAt),
        };

        // 處理評論中的日期
        if (report.comments) {
          report.comments = report.comments.map((comment: any) => ({
            ...comment,
            createdAt: new Date(comment.createdAt),
            updatedAt: new Date(comment.updatedAt),
          }));
        }

        if (report.activityLogs) {
          report.activityLogs = report.activityLogs.map((activityLog: any) => ({
            ...activityLog,
            createdAt: new Date(activityLog.createdAt),
            updatedAt: new Date(activityLog.updatedAt),
          }));
        }

        console.log(report);

        return report;
      }

      throw new Error('獲取通報詳情失敗');
    } catch (error) {
      console.error(`獲取通報 ${id} 詳情失敗:`, error);
      throw error;
    }
  },

  /**
   * 創建新通報
   */
  async createReport(reportData: CreateReportRequest): Promise<Report> {
    try {
      const response = await fetch(`${API_URL}/api/reports`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(reportData),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '創建通報失敗');
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

      throw new Error('創建通報失敗');
    } catch (error) {
      console.error('創建通報失敗:', error);
      throw error;
    }
  },

  /**
   * 更新通報
   */
  async updateReport(id: string, reportData: Partial<Report>): Promise<Report> {
    try {
      const response = await fetch(`${API_URL}/api/reports/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(reportData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '更新通報失敗');
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

      throw new Error('更新通報失敗');
    } catch (error) {
      console.error(`更新通報 ${id} 失敗:`, error);
      throw error;
    }
  },

  /**
   * 刪除通報
   */
  async deleteReport(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/api/reports/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '刪除通報失敗');
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error(`刪除通報 ${id} 失敗:`, error);
      throw error;
    }
  },

  /**
   * 添加評論到通報
   */
  async addCommentToReport(
    reportId: string,
    content: string,
    userId: string
  ): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/api/reports/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reportId, content, userId }),
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
   * 更新通報狀態
   */
  async updateReportStatus(id: string, status: ReportStatus): Promise<Report> {
    return this.updateReport(id, { status });
  },

  /**
   * 添加活動日誌
   */
  async addActivityLog(
    reportId: string,
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
          parentId: reportId,
          parentType: 'REPORT',
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
   * 分配通報給用戶
   */
  async assignReport(id: string, assigneeId: string): Promise<Report> {
    return this.updateReport(id, { assigneeId });
  },
};

export default reportService;
