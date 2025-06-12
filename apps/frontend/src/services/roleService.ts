import { UserRole, Permission, ROLE_PERMISSIONS } from 'shared-types';

// 本地存儲的鍵名
const STORAGE_KEY = 'oms-role-permissions';

/**
 * 角色權限管理服務
 * 在原型階段直接使用 localStorage 存儲權限數據
 */
export const roleService = {
  /**
   * 獲取所有角色及其權限
   * @returns 角色權限映射
   */
  async getAllRolePermissions(): Promise<Record<string, Permission[]>> {
    try {
      // 從 localStorage 獲取權限，如果不存在則使用默認值
      const storedPermissions = localStorage.getItem(STORAGE_KEY);
      if (storedPermissions) {
        return JSON.parse(storedPermissions);
      }
      
      // 如果沒有存儲的權限，返回默認值
      return { ...ROLE_PERMISSIONS };
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
      // 從 localStorage 獲取所有角色權限
      const allPermissions = await this.getAllRolePermissions();
      
      // 返回特定角色的權限，如果不存在則返回空數組
      return allPermissions[role] || [];
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
      // 獲取當前所有角色權限
      const allPermissions = await this.getAllRolePermissions();
      
      // 更新特定角色的權限
      allPermissions[role] = permissions;
      
      // 保存到 localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allPermissions));
      
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
      // 獲取當前所有角色權限
      const allPermissions = await this.getAllRolePermissions();
      
      // 重置為默認值
      allPermissions[role] = [...ROLE_PERMISSIONS[role]];
      
      // 保存到 localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allPermissions));
      
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
