import { Notification, Ticket, User, TicketStatus, TicketPriority } from './models';

// API Request types
export interface CreateTicketRequest {
  title: string;
  description: string;
  priority: TicketPriority;
  assigneeId?: string;
}

export interface UpdateTicketRequest {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: string;
}

export interface CreateCommentRequest {
  content: string;
  ticketId: string;
}

export interface MarkNotificationReadRequest {
  notificationId: string;
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
}

export interface NotificationWithDetails extends Notification {
  user: User;
  relatedTicket?: Ticket;
}

// Comment interface needed for TicketWithDetails
export interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  ticketId: string;
  userId: string;
  user: User;
}
