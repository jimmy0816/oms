import {
  PaginatedResponse,
  ReportStatus,
  ReportPriority,
  Ticket,
  ReportTicket,
} from 'shared-types';
import {
  ExclamationCircleIcon,
  ClockIcon,
  XCircleIcon,
  CheckCircleIcon,
  ArrowUturnLeftIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

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
  location?: {
    id: number;
    name: string;
  } | null;
  status: string;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
  creatorId: string;
  assigneeId?: string | null;
  images: string[];
  categoryId?: string | null;
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
  tickets?: ReportTicket[];
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
  locationId?: number;
  priority?: string;
  categoryId: string;
  contactPhone?: string;
  contactEmail?: string;
  images?: string[];
  assigneeId?: string;
}

export interface UpdateReportRequest {
  title?: string;
  description?: string;
  locationId?: number;
  priority?: string;
  categoryId: string;
  attachments?: any[];
}

export const getPriorityText = (priority: ReportPriority) => {
  switch (priority) {
    case ReportPriority.LOW:
      return '低';
    case ReportPriority.MEDIUM:
      return '中';
    case ReportPriority.HIGH:
      return '高';
    case ReportPriority.URGENT:
      return '緊急';
    default:
      return priority;
  }
};

// 取得狀態名稱
export const getStatusName = (status: string) => {
  switch (status) {
    case ReportStatus.UNCONFIRMED:
      return '未確認';
    case ReportStatus.PROCESSING:
      return '處理中';
    case ReportStatus.REJECTED:
      return '不處理';
    case ReportStatus.PENDING_REVIEW:
      return '待審核';
    case ReportStatus.REVIEWED:
      return '已歸檔';
    case ReportStatus.RETURNED:
      return '已退回';
    default:
      return '未知狀態';
  }
};

// 取得狀態顏色
export const getStatusColor = (status: string) => {
  switch (status) {
    case ReportStatus.UNCONFIRMED:
      return 'bg-yellow-100 text-yellow-800';
    case ReportStatus.PROCESSING:
      return 'bg-blue-100 text-blue-800';
    case ReportStatus.REJECTED:
      return 'bg-gray-100 text-gray-700';
    case ReportStatus.PENDING_REVIEW:
      return 'bg-purple-100 text-purple-800';
    case ReportStatus.REVIEWED:
      return 'bg-green-100 text-green-800';
    case ReportStatus.RETURNED:
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// 取得狀態圖標
export const getStatusIcon = (status: string) => {
  switch (status) {
    case ReportStatus.UNCONFIRMED:
      return ExclamationCircleIcon;
    case ReportStatus.PROCESSING:
      return ClockIcon;
    case ReportStatus.REJECTED:
      return XCircleIcon;
    case ReportStatus.PENDING_REVIEW:
      return ExclamationCircleIcon;
    case ReportStatus.REVIEWED:
      return CheckCircleIcon;
    case ReportStatus.RETURNED:
      return ArrowUturnLeftIcon;
    default:
      return QuestionMarkCircleIcon;
  }
};

export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case ReportPriority.LOW:
      return 'bg-gray-100 text-gray-800';
    case ReportPriority.MEDIUM:
      return 'bg-yellow-100 text-yellow-800';
    case ReportPriority.HIGH:
      return 'bg-orange-100 text-orange-800';
    case ReportPriority.URGENT:
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

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
    filters: {
      status?: string;
      category?: string;
      priority?: string;
      search?: string;
      locationIds?: number[];
    } = {}
  ): Promise<PaginatedResponse<Report>> {
    try {
      // 構建查詢參數
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (filters.status) queryParams.append('status', filters.status);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.priority) queryParams.append('priority', filters.priority);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.locationIds && filters.locationIds.length > 0) {
        queryParams.append('locationIds', filters.locationIds.join(','));
      }

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

      console.log('result.data', result.data);

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

        if (report.tickets) {
          for (const reportTickets of report.tickets) {
            reportTickets.ticket.activityLogs =
              reportTickets.ticket.activityLogs.map((activityLog: any) => ({
                ...activityLog,
                createdAt: new Date(activityLog.createdAt),
                updatedAt: new Date(activityLog.updatedAt),
              }));
          }
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
  async updateReport(
    id: string,
    reportData: Partial<UpdateReportRequest>
  ): Promise<Report> {
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
