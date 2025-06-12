import { UserRole } from 'shared-types';

// 定義權限枚舉
export enum Permission {
  // 工單權限
  VIEW_TICKETS = 'view_tickets',
  CREATE_TICKETS = 'create_tickets',
  EDIT_TICKETS = 'edit_tickets',
  DELETE_TICKETS = 'delete_tickets',
  ASSIGN_TICKETS = 'assign_tickets',
  CLAIM_TICKETS = 'claim_tickets',
  COMPLETE_TICKETS = 'complete_tickets',
  VERIFY_TICKETS = 'verify_tickets',
  
  // 通報權限
  VIEW_REPORTS = 'view_reports',
  CREATE_REPORTS = 'create_reports',
  PROCESS_REPORTS = 'process_reports',
  REVIEW_REPORTS = 'review_reports',
  
  // 用戶管理權限
  VIEW_USERS = 'view_users',
  CREATE_USERS = 'create_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',
  
  // 角色權限管理
  MANAGE_ROLES = 'manage_roles',
  ASSIGN_PERMISSIONS = 'assign_permissions'
}

// 定義角色權限映射
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    Permission.VIEW_TICKETS, Permission.CREATE_TICKETS, Permission.EDIT_TICKETS,
    Permission.DELETE_TICKETS, Permission.ASSIGN_TICKETS, Permission.CLAIM_TICKETS,
    Permission.COMPLETE_TICKETS, Permission.VERIFY_TICKETS, Permission.VIEW_REPORTS,
    Permission.CREATE_REPORTS, Permission.PROCESS_REPORTS, Permission.REVIEW_REPORTS,
    Permission.VIEW_USERS, Permission.CREATE_USERS, Permission.EDIT_USERS,
    Permission.DELETE_USERS, Permission.MANAGE_ROLES, Permission.ASSIGN_PERMISSIONS
  ],
  [UserRole.MANAGER]: [
    Permission.VIEW_TICKETS, Permission.CREATE_TICKETS, Permission.EDIT_TICKETS,
    Permission.ASSIGN_TICKETS, Permission.VERIFY_TICKETS, Permission.VIEW_REPORTS,
    Permission.PROCESS_REPORTS, Permission.REVIEW_REPORTS, Permission.VIEW_USERS
  ],
  [UserRole.REPORT_PROCESSOR]: [
    Permission.VIEW_TICKETS, Permission.CREATE_TICKETS, Permission.EDIT_TICKETS,
    Permission.ASSIGN_TICKETS, Permission.VIEW_REPORTS, Permission.CREATE_REPORTS,
    Permission.PROCESS_REPORTS
  ],
  [UserRole.REPORT_REVIEWER]: [
    Permission.VIEW_TICKETS, Permission.VIEW_REPORTS, Permission.REVIEW_REPORTS,
    Permission.VERIFY_TICKETS
  ],
  [UserRole.MAINTENANCE_WORKER]: [
    Permission.VIEW_TICKETS, Permission.CLAIM_TICKETS, Permission.COMPLETE_TICKETS
  ],
  [UserRole.CUSTOMER_SERVICE]: [
    Permission.VIEW_TICKETS, Permission.CREATE_TICKETS, Permission.VIEW_REPORTS,
    Permission.CREATE_REPORTS
  ],
  [UserRole.USER]: [
    Permission.VIEW_TICKETS, Permission.CREATE_REPORTS
  ]
};

/**
 * 檢查用戶是否擁有特定權限
 * @param userRole 用戶角色
 * @param permission 需要檢查的權限
 * @returns 是否擁有權限
 */
export const hasPermission = (userRole: UserRole, permission: Permission): boolean => {
  if (!userRole || !permission) return false;
  
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
};

/**
 * 檢查用戶是否擁有多個權限中的任意一個
 * @param userRole 用戶角色
 * @param permissions 需要檢查的權限列表
 * @returns 是否擁有任一權限
 */
export const hasAnyPermission = (userRole: UserRole, permissions: Permission[]): boolean => {
  return permissions.some(permission => hasPermission(userRole, permission));
};

/**
 * 檢查用戶是否擁有所有指定的權限
 * @param userRole 用戶角色
 * @param permissions 需要檢查的權限列表
 * @returns 是否擁有所有權限
 */
export const hasAllPermissions = (userRole: UserRole, permissions: Permission[]): boolean => {
  return permissions.every(permission => hasPermission(userRole, permission));
};

/**
 * 獲取用戶角色的所有權限
 * @param userRole 用戶角色
 * @returns 權限列表
 */
export const getUserPermissions = (userRole: UserRole): Permission[] => {
  return ROLE_PERMISSIONS[userRole] || [];
};
