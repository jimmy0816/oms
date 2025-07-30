import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from 'shared-types';

interface PermissionGuardProps {
  required: Permission | Permission[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * 新的權限守衛組件
 * 根據當前用戶的權限來決定是否渲染子組件
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  required,
  fallback = null,
  children,
}) => {
  const { hasPermission } = useAuth();

  const requiredPermissions = Array.isArray(required) ? required : [required];

  // 檢查使用者是否擁有所有必要的權限
  const hasRequiredPermissions = requiredPermissions.every((p) =>
    hasPermission(p)
  );

  return hasRequiredPermissions ? <>{children}</> : <>{fallback}</>;
};

export default PermissionGuard;

