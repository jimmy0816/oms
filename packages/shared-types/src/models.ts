import { UserRole } from './permissions';
import { ReportTicket } from './reports';

// User related types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  password?: string; // 密碼欄位，創建用戶時必須，但在返回給前端時應該被移除
  additionalRoles?: string[]; // 用戶的額外角色列表
  isOidcLinked?: boolean; // Added to indicate if the account is linked to OIDC
  createdAt: Date;
  updatedAt: Date;
}

// Notification related types
export interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  userId: string;
  relatedId?: string;
  relatedType?: string;
}

// Ticket related types
export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: Date;
  updatedAt: Date;
  creatorId: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  assigneeId?: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  reports: ReportTicket[];
  roleId: string;
  role?: {
    id: string;
    name: string;
  };
  comments?: Comment[];
  attachments?: FileInfo[]; // New attachments field
  activityLogs?: ActivityLog[];
}

export enum TicketStatus {
  PENDING = 'PENDING', // 待接單
  IN_PROGRESS = 'IN_PROGRESS', // 處理中
  COMPLETED = 'COMPLETED', // 已完成
  FAILED = 'FAILED', // 無法完成
  VERIFIED = 'VERIFIED', // 驗收通過
  VERIFICATION_FAILED = 'VERIFICATION_FAILED', // 驗收不通過
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// Define FileInfo interface for attachments
export interface FileInfo {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'document' | 'other'; // 更通用的類型
  size?: number;
}

export interface Attachments {
  id: string;
  filename: string;
  url: string;
  fileType: string;
  fileSize: number;
  createdAt: Date;
  createdById?: string | null;
  createdBy: {
    id: string;
    name: string;
    email: string;
  } | null;
}

// Comment related types
export interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  ticketId?: string;
  reportId?: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ActivityLog {
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
  parentType: 'TICKET' | 'REPORT';
}

// Category related types
export interface Category {
  id: string;
  name: string;
  level: number;
  parentId?: string | null;
  children?: Category[];
}

export interface Location {
  id: string;
  externalId?: number; // 新增：用於儲存來自外部系統的原始數字 ID
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface SavedView {
  id: string;
  name: string;
  userId: string;
  filters: {
    searchTerm?: string;
    statusFilter?: string;
    categoryFilter?: string;
    priorityFilter?: string;
    locationFilter?: number[];
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }; // This will be a JSON object storing filter criteria
  viewType: 'REPORT' | 'TICKET'; // Add viewType to the interface
  isDefault?: boolean; // New field to indicate if this is the default view
  createdAt: Date;
  updatedAt: Date;
}
