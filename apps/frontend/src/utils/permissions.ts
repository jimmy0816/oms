import { UserRole, Permission, ROLE_PERMISSIONS } from 'shared-types';

/**
 * 檢查用戶是否擁有特定權限
 * @param userRole 用戶角色
 * @param permission 需要檢查的權限
 * @returns 是否擁有權限
 */
export const hasPermission = (userRole: UserRole | string, permission: Permission): boolean => {
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
export const hasAnyPermission = (userRole: UserRole | string, permissions: Permission[]): boolean => {
  return permissions.some(permission => hasPermission(userRole, permission));
};

/**
 * 檢查用戶是否擁有所有指定的權限
 * @param userRole 用戶角色
 * @param permissions 需要檢查的權限列表
 * @returns 是否擁有所有權限
 */
export const hasAllPermissions = (userRole: UserRole | string, permissions: Permission[]): boolean => {
  return permissions.every(permission => hasPermission(userRole, permission));
};

/**
 * 獲取用戶角色的所有權限
 * @param userRole 用戶角色
 * @returns 權限列表
 */
export const getUserPermissions = (userRole: UserRole | string): Permission[] => {
  return ROLE_PERMISSIONS[userRole] || [];
};
