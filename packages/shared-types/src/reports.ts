import { User } from './models';

// Report related types
export enum ReportStatus {
  UNCONFIRMED = 'UNCONFIRMED',  // 未確認
  PROCESSING = 'PROCESSING',    // 處理中
  REJECTED = 'REJECTED',        // 不處理
  PENDING_REVIEW = 'PENDING_REVIEW',  // 待審核
  REVIEWED = 'REVIEWED',        // 審核通過
  RETURNED = 'RETURNED'         // 退回
}

export enum ReportPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum ReportCategory {
  FACILITY = 'FACILITY',        // 設施故障
  SECURITY = 'SECURITY',        // 安全問題
  ENVIRONMENT = 'ENVIRONMENT',  // 環境問題
  SERVICE = 'SERVICE',          // 服務問題
  OTHER = 'OTHER'               // 其他
}

export interface Report {
  id: string;
  title: string;
  description: string;
  status: ReportStatus;
  priority: ReportPriority;
  category: ReportCategory;
  location: string;
  createdAt: Date;
  updatedAt: Date;
  creatorId: string;
  assigneeId?: string;
  reviewerId?: string;
  images?: string[];  // URLs to images
}

export interface ReportHistory {
  id: string;
  reportId: string;
  status: ReportStatus;
  comment: string;
  createdAt: Date;
  userId: string;
}

export interface ReportWithDetails extends Report {
  creator: User;
  assignee?: User;
  reviewer?: User;
  history: ReportHistory[];
}

// API Request types
export interface CreateReportRequest {
  title: string;
  description: string;
  priority: ReportPriority;
  category: ReportCategory;
  location: string;
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
