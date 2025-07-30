import { User, UserRole } from 'shared-types';
import apiClient from '@/lib/apiClient';



/**
 * 用戶管理服務
 * 通過 API 與後端通信
 */
export const userService = {
  /**
   * 獲取所有用戶
   * @returns 用戶列表
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const users = await apiClient.get<User[]>('/api/users');
      // 確保日期格式正確
      return users.map((user: any) => ({
        ...user,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },

  /**
   * 根據 ID 獲取用戶
   * @param id 用戶 ID
   * @returns 用戶對象或 null
   */
  async getUserById(id: string): Promise<User | null> {
    try {
      const user = await apiClient.get<User>(`/api/users/${id}`);
      // 確保日期格式正確
      return {
        ...user,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      };
    } catch (error: any) {
      if (error.message.includes('404')) {
        return null;
      }
      console.error(`Error fetching user with ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * 創建新用戶
   * @param userData 用戶數據（不包含 ID、創建時間和更新時間）
   * @returns 創建的用戶對象
   */
  async createUser(
    userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<User> {
    try {
      const newUser = await apiClient.post<User>('/api/users', userData);
      // 確保日期格式正確
      return {
        ...newUser,
        createdAt: new Date(newUser.createdAt),
        updatedAt: new Date(newUser.updatedAt),
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('創建用戶失敗');
    }
  },

  /**
   * 更新用戶
   * @param id 用戶 ID
   * @param userData 要更新的用戶數據
   * @returns 更新後的用戶對象
   */
  async updateUser(
    id: string,
    userData: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<User> {
    try {
      const updatedUser = await apiClient.put<User>(`/api/users/${id}`, userData);
      // 確保日期格式正確
      return {
        ...updatedUser,
        createdAt: new Date(updatedUser.createdAt),
        updatedAt: new Date(updatedUser.updatedAt),
      };
    } catch (error) {
      console.error(`Error updating user with ID ${id}:`, error);
      throw new Error('更新用戶失敗');
    }
  },

  /**
   * 刪除用戶
   * @param id 用戶 ID
   * @returns 是否成功刪除
   */
  async deleteUser(id: string): Promise<boolean> {
    try {
      await apiClient.delete<void>(`/api/users/${id}`);
      return true;
    } catch (error: any) {
      if (error.message.includes('404')) {
        return false;
      }
      console.error(`Error deleting user with ID ${id}:`, error);
      return false;
    }
  },

  /**
   * 更新用戶角色
   * @param id 用戶 ID
   * @param role 新角色
   * @returns 更新後的用戶對象
   */
  async updateUserRole(id: string, role: UserRole): Promise<User> {
    return this.updateUser(id, { role });
  },

  /**
   * 獲取特定角色的所有用戶
   * @param role 角色
   * @returns 用戶列表
   */
  async getUsersByRole(role: UserRole): Promise<User[]> {
    try {
      const users = await apiClient.get<User[]>('/api/users', { role });
      // 確保日期格式正確
      return users.map((user: any) => ({
        ...user,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      }));
    } catch (error) {
      console.error(`Error fetching users with role ${role}:`, error);
      return [];
    }
  },

  /**
   * 獲取所有可用的角色
   * @returns 角色列表
   */
  async getAllRoles(): Promise<{ role: UserRole; count: number }[]> {
    try {
      const data = await apiClient.get<{ roles: { name: UserRole; count: number }[] }>('/api/users/roles');
      // Transform the enhanced role format to the simple format if needed
      if (data.roles && Array.isArray(data.roles)) {
        return data.roles.map((role) => ({
          role: role.name,
          count: role.count,
        }));
      }
      return []; // Return empty array if data.roles is not as expected
    } catch (error) {
      console.error('Error fetching roles:', error);
      return Object.values(UserRole).map((role) => ({ role, count: 0 }));
    }
  },

  /**
   * 獲取角色詳細資訊，包含權限和描述
   * @returns 角色詳細資訊
   */
  async getRoleDetails(): Promise<
    {
      id: string;
      name: string;
      description: string;
      count: number;
      permissions: string[];
    }[]
  > {
    try {
      const data = await apiClient.get<{ roles: any[] }>('/api/users/roles');
      return data.roles || [];
    } catch (error) {
      console.error('Error fetching role details:', error);
      return [];
    }
  },

  /**
   * 更新用戶的多個角色
   * @param id 用戶 ID
   * @param roleIds 角色 ID 列表
   * @returns 更新後的用戶對象
   */
  async updateUserRoles(id: string, roleIds: string[]): Promise<User> {
    try {
      const updatedUser = await apiClient.put<User>(`/api/users/${id}/roles`, { roleIds });
      // 確保日期格式正確
      return {
        ...updatedUser,
        createdAt: new Date(updatedUser.createdAt),
        updatedAt: new Date(updatedUser.updatedAt),
      };
    } catch (error) {
      console.error(`Error updating roles for user with ID ${id}:`, error);
      throw new Error('更新用戶角色失敗');
    }
  },

  /**
   * 更改用戶密碼
   * @param currentPassword 當前密碼
   * @param newPassword 新密碼
   */
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      await apiClient.put<void>(
        '/api/users/change-password',
        { currentPassword, newPassword }
      );
    } catch (error) {
      console.error('Error changing password:', error);
      throw error; // Re-throw to be caught by the component
    }
  },
};

export default userService;
