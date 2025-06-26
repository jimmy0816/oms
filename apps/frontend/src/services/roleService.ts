import { UserRole, Permission, ROLE_PERMISSIONS } from 'shared-types';

// 獲取 API URL
const API_URL = typeof window !== 'undefined' 
  ? `http://${window.location.hostname}:3001`
  : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * 角色權限管理服務
 * 使用後端 API 管理角色權限
 */
export const roleService = {
  /**
   * 獲取所有角色及其權限
   * @returns 角色權限映射
   */
  async getAllRolePermissions(): Promise<Record<string, Permission[]>> {
    try {
      // 從後端 API 獲取權限數據
      const response = await fetch(`${API_URL}/api/roles`);
      
      if (!response.ok) {
        throw new Error(`API 錯誤: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      // 如果出錯，返回默認權限
      return { ...ROLE_PERMISSIONS };
    }
  },
  
  /**
   * 獲取特定角色的權限
   * @param role 角色
   * @returns 權限列表
   */
  async getRolePermissions(role: UserRole): Promise<Permission[]> {
    try {
      // 從後端 API 獲取特定角色的權限
      const response = await fetch(`${API_URL}/api/roles/${role}`);
      
      if (!response.ok) {
        throw new Error(`API 錯誤: ${response.status}`);
      }
      
      const data = await response.json();
      return data.permissions || [];
    } catch (error) {
      console.error(`Error fetching permissions for role ${role}:`, error);
      // 如果出錯，返回默認權限
      return [...ROLE_PERMISSIONS[role]];
    }
  },
  
  /**
   * 更新角色權限
   * @param role 角色
   * @param permissions 權限列表
   * @returns 更新結果
   */
  async updateRolePermissions(role: UserRole, permissions: Permission[]): Promise<{ success: boolean; message: string }> {
    try {
      // 將更新的權限發送到後端 API
      const response = await fetch(`${API_URL}/api/roles/${role}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions }),
      });
      
      if (!response.ok) {
        throw new Error(`API 錯誤: ${response.status}`);
      }
      
      const result = await response.json();
      
      return { 
        success: true, 
        message: `成功更新 ${role} 角色的權限`
      };
    } catch (error) {
      console.error(`Error updating permissions for role ${role}:`, error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : '更新角色權限失敗'
      };
    }
  },
  
  /**
   * 重置角色權限為默認值
   * @param role 角色
   * @returns 重置結果
   */
  async resetRolePermissions(role: UserRole): Promise<{ success: boolean; message: string }> {
    try {
      // 將重置請求發送到後端 API
      const response = await fetch(`${API_URL}/api/roles/${role}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`API 錯誤: ${response.status}`);
      }
      
      const result = await response.json();
      
      return { 
        success: true, 
        message: `成功重置 ${role} 角色的權限`
      };
    } catch (error) {
      console.error(`Error resetting permissions for role ${role}:`, error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : '重置角色權限失敗'
      };
    }
  }
};
