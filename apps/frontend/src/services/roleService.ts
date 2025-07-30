import { UserRole, Permission } from 'shared-types';
import apiClient from '@/lib/apiClient';



// 獲取角色顯示名稱
export const getRoleName = (role: UserRole): string => {
  const roleNames: Partial<Record<UserRole, string>> = {
    [UserRole.ADMIN]: '系統管理員',
    [UserRole.MANAGER]: '區域總監',
    [UserRole.REPORT_PROCESSOR]: '營業專員',
    [UserRole.REPORT_REVIEWER]: '通報審核者',
    [UserRole.CUSTOMER_SERVICE]: '客服人員',
    [UserRole.MAINTENANCE_WORKER]: '維修工務',
    [UserRole.STAFF]: '管家',
    [UserRole.USER]: '一般用戶',
  };

  return roleNames[role] || role;
};

/**
 * 角色權限管理服務
 * 使用後端 API 管理角色權限
 */
export const roleService = {
  async getAllRoles(): Promise<UserRole[]> {
    try {
      const data = await apiClient.get<{ roles: UserRole[] }>('/api/roles/list');
      return data.roles || [];
    } catch (error) {
      console.error('Error fetching roles:', error);
      return [];
    }
  },
  /**
   * 獲取所有角色及其權限
   * @returns 角色權限映射
   */
  async getAllRolePermissions(): Promise<Record<string, Permission[]>> {
    try {
      const data = await apiClient.get<{ rolePermissions: Record<string, Permission[]> }>('/api/roles');
      return data.rolePermissions || {};
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      return {};
    }
  },

  /**
   * 獲取特定角色的權限
   * @param role 角色
   * @returns 權限列表
   */
  async getRolePermissions(role: UserRole): Promise<Permission[]> {
    try {
      const data = await apiClient.get<{ permissions: Permission[] }>(`/api/roles/${role}`);
      return data.permissions || [];
    } catch (error) {
      console.error(`Error fetching permissions for role ${role}:`, error);
      return [];
    }
  },

  /**
   * 更新角色權限
   * @param role 角色
   * @param permissions 權限列表
   * @returns 更新結果
   */
  async updateRolePermissions(
    role: UserRole,
    permissions: Permission[]
  ): Promise<{ success: boolean; message: string }> {
    try {
      await apiClient.put(`/api/roles/${role}`, { permissions });
      return {
        success: true,
        message: `成功更新 ${role} 角色的權限`,
      };
    } catch (error) {
      console.error(`Error updating permissions for role ${role}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '更新角色權限失敗',
      };
    }
  },

  /**
   * 重置角色權限為默認值
   * @param role 角色
   * @returns 重置結果
   */
  async resetRolePermissions(
    role: UserRole
  ): Promise<{ success: boolean; message: string }> {
    try {
      await apiClient.post(`/api/roles/${role}/reset`, {});
      return {
        success: true,
        message: `成功重置 ${role} 角色的權限`,
      };
    } catch (error) {
      console.error(`Error resetting permissions for role ${role}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '重置角色權限失敗',
      };
    }
  },
};
