import {
  Notification,
  Ticket,
  Comment,
  User,
  TicketStatus,
  TicketPriority,
  FileInfo,
  ActivityLog,
} from './models';
import { Report } from './reports';

// API Request types
export interface CreateTicketRequest {
  title: string;
  description: string;
  priority: TicketPriority;
  assigneeId?: string;
  attachments?: FileInfo[]; // New attachments field
  reportIds?: string[];
}

export interface UpdateTicketRequest {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: string;
  roleId?: string;
  reportIds?: string[];
  attachments?: FileInfo[];
}

export interface CreateCommentRequest {
  content: string;
  userId: string;
  ticketId?: string;
  reportId?: string;
}

export interface MarkNotificationReadRequest {
  notificationId: string;
}

export interface CreateActivityLogRequest {
  content: string;
  parentId: string;
  parentType: 'TICKET' | 'REPORT';
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TicketWithDetails extends Ticket {
  creator: User;
  assignee?: User;
  role?: {
    id: string;
    name: string;
  };
  comments: Comment[];
  attachments?: FileInfo[]; // New attachments field
  activityLogs?: ActivityLog[];
}

export interface NotificationWithDetails extends Notification {
  user: User;
  relatedTicket?: Ticket;
  relatedReport?: Report;
}
