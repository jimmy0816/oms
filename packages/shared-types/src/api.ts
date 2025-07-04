import {
  Notification,
  Ticket,
  Comment,
  User,
  TicketStatus,
  TicketPriority,
  FileInfo,
} from './models';

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
  reportIds?: string[];
}

export interface CreateCommentRequest {
  content: string;
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
  comments: Comment[];
  attachments?: FileInfo[]; // New attachments field
}

export interface NotificationWithDetails extends Notification {
  user: User;
  relatedTicket?: Ticket;
}
