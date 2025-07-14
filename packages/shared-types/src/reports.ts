import { User, FileInfo, Ticket, Comment, ActivityLog } from './models';

// Report related types
export enum ReportStatus {
  UNCONFIRMED = 'UNCONFIRMED', // 未確認
  PROCESSING = 'PROCESSING', // 處理中
  REJECTED = 'REJECTED', // 不處理
  PENDING_REVIEW = 'PENDING_REVIEW', // 待審核
  REVIEWED = 'REVIEWED', // 審核通過
  RETURNED = 'RETURNED', // 退回
}

export enum ReportPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum ReportCategory {
  FACILITY = 'FACILITY', // 設施故障
  SECURITY = 'SECURITY', // 安全問題
  ENVIRONMENT = 'ENVIRONMENT', // 環境問題
  SERVICE = 'SERVICE', // 服務問題
  OTHER = 'OTHER', // 其他
}

export interface Report {
  id: string;
  title: string;
  description: string;
  status: ReportStatus;
  priority: ReportPriority;
  category?: ReportCategory; // Make optional as it's not always required
  location?: string; // Make optional
  createdAt: Date;
  updatedAt: Date;
  creatorId: string;
  assigneeId?: string;
  reviewerId?: string;
  images?: string[]; // URLs to images
  attachments?: FileInfo[]; // Add attachments
  tickets?: ReportTicket[]; // Add tickets
  comments?: Comment[]; // Add comments
  activityLogs?: ActivityLog[]; // Add activity logs
}

export interface ReportTicket {
  reportId: string;
  ticketId: string;
  assignedAt: Date;
  report?: Report;
  ticket?: Ticket;
}

export interface ReportWithDetails extends Report {
  creator: User;
  assignee?: User;
  reviewer?: User;
}

// API Request types
export interface CreateReportRequest {
  title: string;
  description: string;
  priority?: ReportPriority; // Make optional
  category?: ReportCategory; // Make optional
  location?: string; // Make optional
  images?: string[];
  attachments?: FileInfo[];
  assigneeId?: string;
  ticketIds?: string[];
}

export interface UpdateReportRequest {
  title?: string;
  description?: string;
  status?: ReportStatus;
  priority?: ReportPriority;
  category?: ReportCategory;
  location?: string;
  assigneeId?: string;
  reviewerId?: string;
  images?: string[];
}

export interface ProcessReportRequest {
  action: 'START_PROCESSING' | 'REJECT';
  comment: string;
  assigneeId?: string;
}

export interface CloseReportRequest {
  comment: string;
}

export interface ReviewReportRequest {
  action: 'APPROVE' | 'RETURN';
  comment: string;
}