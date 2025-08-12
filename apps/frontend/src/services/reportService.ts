import apiClient from '@/lib/apiClient';
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
      status?: string[];
      categoryIds?: string[];
      priority?: string[];
      search?: string;
      locationIds?: number[];
      sortField?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<PaginatedResponse<Report>> {
    try {
      const params: Record<string, any> = { page, pageSize };

      // 動態、自動化地處理所有過濾條件
      Object.keys(filters).forEach(key => {
        const value = filters[key as keyof typeof filters];
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value) && value.length > 0) {
            params[key] = value.join(',');
          } else if (!Array.isArray(value)) {
            params[key] = value;
          }
        }
      });

      const paginatedResponse = await apiClient.get<PaginatedResponse<Report>>('/api/reports', params);
      
      // 處理日期格式
      paginatedResponse.items = paginatedResponse.items.map((report: any) => ({
        ...report,
        createdAt: new Date(report.createdAt),
        updatedAt: new Date(report.updatedAt),
      }));

      return paginatedResponse;
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
      const report = await apiClient.get<Report>(`/api/reports/${id}`);
      
      // 遞歸處理日期格式
      const parseDates = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(parseDates);

        return Object.entries(obj).reduce((acc, [key, value]) => {
          if ((key === 'createdAt' || key === 'updatedAt') && typeof value === 'string') {
            acc[key] = new Date(value);
          } else {
            acc[key] = parseDates(value);
          }
          return acc;
        }, {} as any);
      };

      return parseDates(report);
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
      const report = await apiClient.post<Report>('/api/reports', reportData);
      return {
        ...report,
        createdAt: new Date(report.createdAt),
        updatedAt: new Date(report.updatedAt),
      };
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
      const report = await apiClient.put<Report>(`/api/reports/${id}`, reportData);
      return {
        ...report,
        createdAt: new Date(report.createdAt),
        updatedAt: new Date(report.updatedAt),
      };
    } catch (error) {
      console.error(`更新通報 ${id} 失敗:`, error);
      throw error;
    }
  },

  /**
   * 刪除通報
   */
  async deleteReport(id: string): Promise<void> {
    try {
      await apiClient.delete<void>(`/api/reports/${id}`);
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
      const comment = await apiClient.post<any>('/api/reports/comments', { reportId, content, userId });
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
      const activityLog = await apiClient.post<any>('/api/activitylogs', {
        content,
        userId,
        parentId: reportId,
        parentType: 'REPORT',
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
   * 分配通報給用戶
   */
  async assignReport(id: string, assigneeId: string): Promise<Report> {
    return this.updateReport(id, { assigneeId });
  },

  /**
   * 獲取公開的通報 (失物招領)
   */
  async getPublicReports(
    page = 1,
    pageSize = 10,
    filters: {
      locationIds?: string[];
      sortField?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<PaginatedPublicReportsResponse> {
    try {
      const params: Record<string, any> = { page, pageSize };

      if (filters.locationIds && filters.locationIds.length > 0) {
        params.locationIds = filters.locationIds.join(',');
      }
      if (filters.sortField) {
        params.sortField = filters.sortField;
      }
      if (filters.sortOrder) {
        params.sortOrder = filters.sortOrder;
      }

      const response = await apiClient.get<PaginatedPublicReportsResponse>('/api/public/reports', params);
      
      // 處理日期格式
      response.items = response.items.map((report: any) => ({
        ...report,
        createdAt: new Date(report.createdAt),
      }));

      return response;
    } catch (error) {
      console.error('獲取公開通報列表失敗:', error);
      throw error;
    }
  },
};
