// 系統權限定義
export enum Permission {
  // 工單權限
  VIEW_ALL_TICKETS = 'view_all_tickets', // 查看所有工單
  VIEW_TICKETS = 'view_tickets', // 查看工單
  CREATE_TICKETS = 'create_tickets', // 創建工單
  EDIT_TICKETS = 'edit_tickets', // 編輯工單
  DELETE_TICKETS = 'delete_tickets', // 刪除工單
  ASSIGN_TICKETS = 'assign_tickets', // 分配工單
  CLAIM_TICKETS = 'claim_tickets', // 認領工單
  COMPLETE_TICKETS = 'complete_tickets', // 完成工單
  VERIFY_TICKETS = 'verify_tickets', // 驗收工單
  EXPORT_TICKETS = 'export_tickets', // 匯出工單

  // 通報權限
  VIEW_ALL_REPORTS = 'view_all_reports', // 查看所有通報
  VIEW_REPORTS = 'view_reports', // 查看通報
  CREATE_REPORTS = 'create_reports', // 創建通報
  EDIT_REPORTS = 'edit_reports', // 編輯通報
  DELETE_REPORTS = 'delete_reports', // 刪除通報
  PROCESS_REPORTS = 'process_reports', // 處理通報
  REVIEW_REPORTS = 'review_reports', // 審核通報
  EXPORT_REPORTS = 'export_reports', // 匯出通報

  // 用戶管理權限
  VIEW_USERS = 'view_users', // 查看用戶
  CREATE_USERS = 'create_users', // 創建用戶
  EDIT_USERS = 'edit_users', // 編輯用戶
  DELETE_USERS = 'delete_users', // 刪除用戶

  // 角色權限管理
  MANAGE_ROLES = 'manage_roles', // 管理角色
  ASSIGN_PERMISSIONS = 'assign_permissions', // 分配權限

  // 系統設定
  MANAGE_SETTINGS = 'manage_settings', // 管理系統設定
  MANAGE_CATEGORIES = 'manage_categories', // 管理分類
  MANAGE_LOCATIONS = 'manage_locations', // 管理空間
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

// 角色權限映射(預設)
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // 管理員擁有所有權限
    Permission.VIEW_ALL_TICKETS,
    Permission.VIEW_TICKETS,
    Permission.CREATE_TICKETS,
    Permission.EDIT_TICKETS,
    Permission.DELETE_TICKETS,
    Permission.ASSIGN_TICKETS,
    Permission.CLAIM_TICKETS,
    Permission.COMPLETE_TICKETS,
    Permission.VERIFY_TICKETS,
    Permission.EXPORT_TICKETS,
    Permission.VIEW_ALL_REPORTS,
    Permission.VIEW_REPORTS,
    Permission.CREATE_REPORTS,
    Permission.EDIT_REPORTS,
    Permission.DELETE_REPORTS,
    Permission.PROCESS_REPORTS,
    Permission.REVIEW_REPORTS,
    Permission.EXPORT_REPORTS,
    Permission.VIEW_USERS,
    Permission.CREATE_USERS,
    Permission.EDIT_USERS,
    Permission.DELETE_USERS,
    Permission.MANAGE_ROLES,
    Permission.ASSIGN_PERMISSIONS,
    Permission.MANAGE_SETTINGS,
    Permission.MANAGE_CATEGORIES,
    Permission.MANAGE_LOCATIONS,
  ],
  [UserRole.MANAGER]: [
    Permission.VIEW_ALL_TICKETS,
    Permission.VIEW_TICKETS,
    Permission.CREATE_TICKETS,
    Permission.EDIT_TICKETS,
    Permission.ASSIGN_TICKETS,
    Permission.VERIFY_TICKETS,
    Permission.EXPORT_TICKETS,
    Permission.VIEW_ALL_REPORTS,
    Permission.VIEW_REPORTS,
    Permission.EDIT_REPORTS,
    Permission.DELETE_REPORTS,
    Permission.PROCESS_REPORTS,
    Permission.REVIEW_REPORTS,
    Permission.EXPORT_REPORTS,
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
    Permission.VIEW_ALL_TICKETS,
    Permission.VIEW_TICKETS,
    Permission.VIEW_REPORTS,
    Permission.VIEW_ALL_REPORTS,
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
