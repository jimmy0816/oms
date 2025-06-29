import { User, UserRole } from 'shared-types';

// API 基礎 URL
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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
      const response = await fetch(`${API_BASE_URL}/users`);

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const users = await response.json();

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
      const response = await fetch(`${API_BASE_URL}/users/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Error: ${response.status}`);
      }

      const user = await response.json();

      // 確保日期格式正確
      return {
        ...user,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      };
    } catch (error) {
      console.error(`Error fetching user with ID ${id}:`, error);
      return null;
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
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }

      const newUser = await response.json();

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
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }

      const updatedUser = await response.json();

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
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        if (response.status === 404) {
          return false;
        }
        throw new Error(`Error: ${response.status}`);
      }

      return true;
    } catch (error) {
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
      const response = await fetch(`${API_BASE_URL}/users?role=${role}`);

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const users = await response.json();

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
      const response = await fetch(`${API_BASE_URL}/users/roles`);

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      // Transform the enhanced role format to the simple format if needed
      if (data.roles && Array.isArray(data.roles)) {
        return data.roles.map(role => ({ role: role.name, count: role.count }));
      }
      return data;
    } catch (error) {
      console.error('Error fetching roles:', error);
      return Object.values(UserRole).map((role) => ({ role, count: 0 }));
    }
  },
  
  /**
   * 獲取角色詳細資訊，包含權限和描述
   * @returns 角色詳細資訊
   */
  async getRoleDetails(): Promise<{id: string, name: string, description: string, count: number, permissions: string[]}[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/roles`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
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
      const response = await fetch(`${API_BASE_URL}/users/${id}/roles`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roleIds }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }
      
      const updatedUser = await response.json();
      
      // 確保日期格式正確
      return {
        ...updatedUser,
        createdAt: new Date(updatedUser.createdAt),
        updatedAt: new Date(updatedUser.updatedAt)
      };
    } catch (error) {
      console.error(`Error updating roles for user with ID ${id}:`, error);
      throw new Error('更新用戶角色失敗');
    }
    }
  },
};

export default userService;
