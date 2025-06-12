// User related types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  REPORT_PROCESSOR = 'REPORT_PROCESSOR', // 通報處理者
  REPORT_REVIEWER = 'REPORT_REVIEWER', // 通報審核者
  CUSTOMER_SERVICE = 'CUSTOMER_SERVICE', // 客服人員
  MAINTENANCE_WORKER = 'MAINTENANCE_WORKER' // 維修工務
}

// Notification related types
export interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  userId: string;
  relatedTicketId?: string;
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
  assigneeId?: string;
}

export enum TicketStatus {
  PENDING = 'PENDING', // 待接單
  IN_PROGRESS = 'IN_PROGRESS', // 處理中
  COMPLETED = 'COMPLETED', // 已完成
  FAILED = 'FAILED', // 無法完成
  VERIFIED = 'VERIFIED', // 驗收通過
  VERIFICATION_FAILED = 'VERIFICATION_FAILED' // 驗收不通過
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

// 工單操作權限
export enum TicketPermission {
  VIEW_ORDERS = 'view_orders', // 檢視所有工單
  CREATE_WORK_ORDERS = 'create_work_orders', // 建立工單
  CLAIM_WORK_ORDERS = 'claim_work_orders', // 認領工單
  COMPLETE_OR_FAIL_WORK_ORDERS = 'complete_or_fail_work_orders', // 完成或無法完成工單
  VERIFY_ORDERS = 'verify_orders' // 驗收工單
}

// 角色權限映射
export const RolePermissions: Record<UserRole, TicketPermission[]> = {
  [UserRole.USER]: [],
  [UserRole.ADMIN]: [
    TicketPermission.VIEW_ORDERS,
    TicketPermission.CREATE_WORK_ORDERS,
    TicketPermission.CLAIM_WORK_ORDERS,
    TicketPermission.COMPLETE_OR_FAIL_WORK_ORDERS,
    TicketPermission.VERIFY_ORDERS
  ],
  [UserRole.MANAGER]: [
    TicketPermission.VIEW_ORDERS,
    TicketPermission.CREATE_WORK_ORDERS,
    TicketPermission.VERIFY_ORDERS
  ],
  [UserRole.REPORT_PROCESSOR]: [
    TicketPermission.VIEW_ORDERS,
    TicketPermission.CREATE_WORK_ORDERS,
    TicketPermission.VERIFY_ORDERS
  ],
  [UserRole.REPORT_REVIEWER]: [
    TicketPermission.VIEW_ORDERS
  ],
  [UserRole.CUSTOMER_SERVICE]: [
    TicketPermission.CREATE_WORK_ORDERS
  ],
  [UserRole.MAINTENANCE_WORKER]: [
    TicketPermission.CLAIM_WORK_ORDERS,
    TicketPermission.COMPLETE_OR_FAIL_WORK_ORDERS
  ]
}

// Comment related types
export interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  ticketId: string;
  userId: string;
}
