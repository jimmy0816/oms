import React from 'react';
import { UserRole, Permission } from 'shared-types';
import { hasPermission, hasAnyPermission } from '../utils/permissions';

interface PermissionGuardProps {
  permission: Permission | Permission[];
  userRole: UserRole;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * 權限守衛組件
 * 用於根據用戶角色和所需權限來控制內容的顯示
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  userRole,
  fallback = null,
  children
}) => {
  if (!userRole) return fallback;
  
  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasAccess = hasAnyPermission(userRole, permissions);
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

// 保留默認導出以保持兼容性
export default PermissionGuard;
