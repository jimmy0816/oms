import React, { useState, useEffect } from 'react';
import { UserRole, Permission } from 'shared-types';
import { PermissionGuard } from '@/components/PermissionGuard';
import { roleService, getRoleName } from '@/services/roleService';
// 暫時使用自定義的提示功能代替 react-hot-toast
const toast = {
  success: (message: string) => {
    alert(`成功: ${message}`);
  },
  error: (message: string) => {
    alert(`錯誤: ${message}`);
  },
};

import { useAuth } from '@/contexts/AuthContext';

/**
 * 角色權限管理頁面
 */
const RolesManagementPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [allPermissions] = useState<Permission[]>(Object.values(Permission));
  const { user } = useAuth(); // 獲取當前用戶
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // 當選擇角色變化時，從 API 獲取權限列表
  useEffect(() => {
    if (selectedRole) {
      fetchRolePermissions(selectedRole);
    } else {
      setRolePermissions([]);
    }
  }, [selectedRole]);

  // 從 API 獲取角色權限
  const fetchRolePermissions = async (role: UserRole) => {
    try {
      setIsLoading(true);
      // 呼叫 API 取得權限
      const permissions = await roleService.getRolePermissions(role);
      setRolePermissions(permissions);
    } catch (error) {
      console.error(`Error fetching permissions for role ${role}:`, error);
      toast.error('獲取角色權限失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // 保存權限變更到 API
  const handleSavePermissions = async () => {
    if (!selectedRole) return;

    try {
      setIsSaving(true);
      const result = await roleService.updateRolePermissions(
        selectedRole,
        rolePermissions
      );

      if (result.success) {
        toast.success('權限已成功保存');
      } else {
        toast.error(result.message || '保存權限失敗');
      }
    } catch (error) {
      console.error(
        `Error saving permissions for role ${selectedRole}:`,
        error
      );
      toast.error('保存權限失敗');
    } finally {
      setIsSaving(false);
    }
  };

  // 重置角色權限為默認值
  const handleResetPermissions = async () => {
    if (!selectedRole) return;

    if (!confirm(`確定要將 ${selectedRole} 的權限重置為默認值嗎？`)) {
      return;
    }

    try {
      setIsResetting(true);
      const result = await roleService.resetRolePermissions(selectedRole);

      if (result.success) {
        toast.success('權限已重置為默認值');
        // 重新獲取權限
        fetchRolePermissions(selectedRole);
      } else {
        toast.error(result.message || '重置權限失敗');
      }
    } catch (error) {
      console.error(
        `Error resetting permissions for role ${selectedRole}:`,
        error
      );
      toast.error('重置權限失敗');
    } finally {
      setIsResetting(false);
    }
  };

  // 處理權限變更
  const handlePermissionChange = (permission: Permission, checked: boolean) => {
    if (checked) {
      setRolePermissions([...rolePermissions, permission]);
    } else {
      setRolePermissions(rolePermissions.filter((p) => p !== permission));
    }
  };

  // 按權限類別分組
  const permissionGroups = {
    tickets: allPermissions.filter(
      (p) =>
        p.startsWith('view_all_tickets') ||
        p.startsWith('view_tickets') ||
        p.startsWith('create_tickets') ||
        p.startsWith('edit_tickets') ||
        p.startsWith('delete_tickets') ||
        p.startsWith('assign_tickets') ||
        p.startsWith('claim_tickets') ||
        p.startsWith('complete_tickets') ||
        p.startsWith('verify_tickets')
    ),
    reports: allPermissions.filter(
      (p) =>
        p.startsWith('view_all_reports') ||
        p.startsWith('view_reports') ||
        p.startsWith('create_reports') ||
        p.startsWith('edit_reports') ||
        p.startsWith('delete_reports') ||
        p.startsWith('process_reports') ||
        p.startsWith('review_reports')
    ),
    users: allPermissions.filter(
      (p) =>
        p.startsWith('view_users') ||
        p.startsWith('create_users') ||
        p.startsWith('edit_users') ||
        p.startsWith('delete_users')
    ),
    roles: allPermissions.filter(
      (p) => p.startsWith('manage_roles') || p.startsWith('assign_permissions')
    ),
  };

  return (
    <PermissionGuard
      permission={Permission.MANAGE_ROLES}
      userRole={user?.role}
      fallback={<div className="p-4 text-red-500">您沒有權限訪問此頁面</div>}
    >
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">角色權限管理</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* 角色選擇區域 */}
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold mb-4">角色列表</h2>
            <div className="space-y-2">
              {Object.values(UserRole).map((role) => (
                <div
                  key={role}
                  className={`p-2 rounded cursor-pointer ${
                    selectedRole === role
                      ? 'bg-blue-100 font-medium'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedRole(role)}
                >
                  {getRoleName(role)}
                </div>
              ))}
            </div>
          </div>

          {/* 權限編輯區域 */}
          <div className="bg-white p-4 rounded shadow md:col-span-3">
            {selectedRole ? (
              <>
                <h2 className="text-xl font-semibold mb-4">
                  {getRoleName(selectedRole)} 的權限設置
                </h2>

                {/* 工單權限 */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">工單權限</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {permissionGroups.tickets.map((permission) => (
                      <div key={permission} className="flex items-center">
                        <input
                          type="checkbox"
                          id={permission}
                          checked={rolePermissions.includes(permission)}
                          onChange={(e) =>
                            handlePermissionChange(permission, e.target.checked)
                          }
                          className="mr-2"
                        />
                        <label htmlFor={permission} className="text-sm">
                          {permission.replace(/_/g, ' ')}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 通報權限 */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">通報權限</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {permissionGroups.reports.map((permission) => (
                      <div key={permission} className="flex items-center">
                        <input
                          type="checkbox"
                          id={permission}
                          checked={rolePermissions.includes(permission)}
                          onChange={(e) =>
                            handlePermissionChange(permission, e.target.checked)
                          }
                          className="mr-2"
                        />
                        <label htmlFor={permission} className="text-sm">
                          {permission.replace(/_/g, ' ')}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 用戶管理權限 */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">用戶管理權限</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {permissionGroups.users.map((permission) => (
                      <div key={permission} className="flex items-center">
                        <input
                          type="checkbox"
                          id={permission}
                          checked={rolePermissions.includes(permission)}
                          onChange={(e) =>
                            handlePermissionChange(permission, e.target.checked)
                          }
                          className="mr-2"
                        />
                        <label htmlFor={permission} className="text-sm">
                          {permission.replace(/_/g, ' ')}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 角色管理權限 */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">角色管理權限</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {permissionGroups.roles.map((permission) => (
                      <div key={permission} className="flex items-center">
                        <input
                          type="checkbox"
                          id={permission}
                          checked={rolePermissions.includes(permission)}
                          onChange={(e) =>
                            handlePermissionChange(permission, e.target.checked)
                          }
                          className="mr-2"
                        />
                        <label htmlFor={permission} className="text-sm">
                          {permission.replace(/_/g, ' ')}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex space-x-4">
                  <button
                    onClick={handleSavePermissions}
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center"
                  >
                    {isSaving ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        保存中...
                      </>
                    ) : (
                      '保存權限設置'
                    )}
                  </button>

                  <button
                    onClick={handleResetPermissions}
                    disabled={isResetting}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
                  >
                    {isResetting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        重置中...
                      </>
                    ) : (
                      '重置為默認值'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-gray-500 text-center py-8">
                請從左側選擇一個角色以編輯其權限
              </div>
            )}
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
};

export default RolesManagementPage;
