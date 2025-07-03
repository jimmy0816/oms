// User related types
export interface User {
  id: string;
  email: string;
  name: string;
  password?: string; // 密碼欄位，在前端操作時可選，在後端必須存在
  role: UserRole;
  additionalRoles?: string[]; // 用戶的額外角色列表
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  REPORT_PROCESSOR = 'REPORT_PROCESSOR', // 通報處理者
  REPORT_REVIEWER = 'REPORT_REVIEWER', // 通報審核者
  CUSTOMER_SERVICE = 'CUSTOMER_SERVICE', // 客服人員
  MAINTENANCE_WORKER = 'MAINTENANCE_WORKER', // 維修工務
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
  VERIFICATION_FAILED = 'VERIFICATION_FAILED', // 驗收不通過
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// 系統權限定義
export enum Permission {
  // 工單權限
  VIEW_TICKETS = 'view_tickets', // 查看工單
  CREATE_TICKETS = 'create_tickets', // 創建工單
  EDIT_TICKETS = 'edit_tickets', // 編輯工單
  DELETE_TICKETS = 'delete_tickets', // 刪除工單
  ASSIGN_TICKETS = 'assign_tickets', // 分配工單
  CLAIM_TICKETS = 'claim_tickets', // 認領工單
  COMPLETE_TICKETS = 'complete_tickets', // 完成工單
  VERIFY_TICKETS = 'verify_tickets', // 驗收工單

  // 通報權限
  VIEW_REPORTS = 'view_reports', // 查看通報
  CREATE_REPORTS = 'create_reports', // 創建通報
  PROCESS_REPORTS = 'process_reports', // 處理通報
  REVIEW_REPORTS = 'review_reports', // 審核通報

  // 用戶管理權限
  VIEW_USERS = 'view_users', // 查看用戶
  CREATE_USERS = 'create_users', // 創建用戶
  EDIT_USERS = 'edit_users', // 編輯用戶
  DELETE_USERS = 'delete_users', // 刪除用戶

  // 角色權限管理
  MANAGE_ROLES = 'manage_roles', // 管理角色
  ASSIGN_PERMISSIONS = 'assign_permissions', // 分配權限
}

// 保留舊的工單權限枚舉以保持兼容性
export enum TicketPermission {
  VIEW_TICKETS = 'view_tickets', // 檢視所有工單
  CREATE_TICKETS = 'create_tickets', // 建立工單
  CLAIM_TICKETS = 'claim_tickets', // 認領工單
  COMPLETE_TICKETS = 'complete_tickets', // 完成工單
  VERIFY_TICKETS = 'verify_tickets', // 驗收工單
}

// 舊的角色工單權限映射 (保留以保持兼容性)
export const RolePermissions: Record<UserRole, TicketPermission[]> = {
  [UserRole.USER]: [],
  [UserRole.ADMIN]: [
    TicketPermission.VIEW_TICKETS,
    TicketPermission.CREATE_TICKETS,
    TicketPermission.CLAIM_TICKETS,
    TicketPermission.COMPLETE_TICKETS,
    TicketPermission.VERIFY_TICKETS,
  ],
  [UserRole.MANAGER]: [
    TicketPermission.VIEW_TICKETS,
    TicketPermission.CREATE_TICKETS,
    TicketPermission.VERIFY_TICKETS,
  ],
  [UserRole.STAFF]: [
    TicketPermission.CLAIM_TICKETS,
    TicketPermission.COMPLETE_TICKETS,
  ],
  [UserRole.REPORT_PROCESSOR]: [
    TicketPermission.VIEW_TICKETS,
    TicketPermission.CREATE_TICKETS,
    TicketPermission.VERIFY_TICKETS,
  ],
  [UserRole.REPORT_REVIEWER]: [TicketPermission.VIEW_TICKETS],
  [UserRole.CUSTOMER_SERVICE]: [TicketPermission.CREATE_TICKETS],
  [UserRole.MAINTENANCE_WORKER]: [
    TicketPermission.CLAIM_TICKETS,
    TicketPermission.COMPLETE_TICKETS,
  ],
};

// 新的完整角色權限映射
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // 管理員擁有所有權限
    Permission.VIEW_TICKETS,
    Permission.CREATE_TICKETS,
    Permission.EDIT_TICKETS,
    Permission.DELETE_TICKETS,
    Permission.ASSIGN_TICKETS,
    Permission.CLAIM_TICKETS,
    Permission.COMPLETE_TICKETS,
    Permission.VERIFY_TICKETS,
    Permission.VIEW_REPORTS,
    Permission.CREATE_REPORTS,
    Permission.PROCESS_REPORTS,
    Permission.REVIEW_REPORTS,
    Permission.VIEW_USERS,
    Permission.CREATE_USERS,
    Permission.EDIT_USERS,
    Permission.DELETE_USERS,
    Permission.MANAGE_ROLES,
    Permission.ASSIGN_PERMISSIONS,
  ],
  [UserRole.MANAGER]: [
    Permission.VIEW_TICKETS,
    Permission.CREATE_TICKETS,
    Permission.EDIT_TICKETS,
    Permission.ASSIGN_TICKETS,
    Permission.VERIFY_TICKETS,
    Permission.VIEW_REPORTS,
    Permission.PROCESS_REPORTS,
    Permission.REVIEW_REPORTS,
    Permission.VIEW_USERS,
  ],
  [UserRole.REPORT_PROCESSOR]: [
    Permission.VIEW_TICKETS,
    Permission.CREATE_TICKETS,
    Permission.EDIT_TICKETS,
    Permission.ASSIGN_TICKETS,
    Permission.VIEW_REPORTS,
    Permission.CREATE_REPORTS,
    Permission.PROCESS_REPORTS,
  ],
  [UserRole.REPORT_REVIEWER]: [
    Permission.VIEW_TICKETS,
    Permission.VIEW_REPORTS,
    Permission.REVIEW_REPORTS,
    Permission.VERIFY_TICKETS,
  ],
  [UserRole.MAINTENANCE_WORKER]: [
    Permission.VIEW_TICKETS,
    Permission.CLAIM_TICKETS,
    Permission.COMPLETE_TICKETS,
  ],
  [UserRole.CUSTOMER_SERVICE]: [
    Permission.VIEW_TICKETS,
    Permission.CREATE_TICKETS,
    Permission.VIEW_REPORTS,
    Permission.CREATE_REPORTS,
  ],
  [UserRole.STAFF]: [
    Permission.VIEW_TICKETS,
    Permission.CLAIM_TICKETS,
    Permission.COMPLETE_TICKETS,
  ],
  [UserRole.USER]: [Permission.VIEW_TICKETS, Permission.CREATE_REPORTS],
};
