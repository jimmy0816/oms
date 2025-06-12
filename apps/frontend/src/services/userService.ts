import { User, UserRole } from 'shared-types';

// 本地存儲的鍵名
const USERS_STORAGE_KEY = 'oms-users';

// 默認用戶數據
const DEFAULT_USERS: User[] = [
  {
    id: '1',
    email: 'admin@example.com',
    name: '系統管理員',
    role: UserRole.ADMIN,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    email: 'manager@example.com',
    name: '部門經理',
    role: UserRole.MANAGER,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    email: 'processor@example.com',
    name: '通報處理員',
    role: UserRole.REPORT_PROCESSOR,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '4',
    email: 'reviewer@example.com',
    name: '通報審核員',
    role: UserRole.REPORT_REVIEWER,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '5',
    email: 'worker@example.com',
    name: '維修工務人員',
    role: UserRole.MAINTENANCE_WORKER,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '6',
    email: 'cs@example.com',
    name: '客服人員',
    role: UserRole.CUSTOMER_SERVICE,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '7',
    email: 'user@example.com',
    name: '一般用戶',
    role: UserRole.USER,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

/**
 * 用戶管理服務
 * 在原型階段直接使用 localStorage 存儲用戶數據
 */
export const userService = {
  /**
   * 獲取所有用戶
   * @returns 用戶列表
   */
  async getAllUsers(): Promise<User[]> {
    try {
      // 從 localStorage 獲取用戶數據
      const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
      if (storedUsers) {
        const parsedUsers = JSON.parse(storedUsers);
        // 確保日期格式正確
        return parsedUsers.map((user: any) => ({
          ...user,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt)
        }));
      }
      
      // 如果沒有存儲的用戶數據，保存並返回默認用戶
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      return [...DEFAULT_USERS];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [...DEFAULT_USERS];
    }
  },
  
  /**
   * 根據 ID 獲取用戶
   * @param id 用戶 ID
   * @returns 用戶對象或 null
   */
  async getUserById(id: string): Promise<User | null> {
    try {
      const users = await this.getAllUsers();
      return users.find(user => user.id === id) || null;
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
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    try {
      const users = await this.getAllUsers();
      
      // 生成新的用戶 ID
      const newId = (Math.max(...users.map(u => parseInt(u.id)), 0) + 1).toString();
      
      const now = new Date();
      const newUser: User = {
        ...userData,
        id: newId,
        createdAt: now,
        updatedAt: now
      };
      
      // 添加新用戶並保存
      const updatedUsers = [...users, newUser];
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
      
      return newUser;
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
  async updateUser(id: string, userData: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User> {
    try {
      const users = await this.getAllUsers();
      const userIndex = users.findIndex(user => user.id === id);
      
      if (userIndex === -1) {
        throw new Error(`找不到 ID 為 ${id} 的用戶`);
      }
      
      // 更新用戶數據
      const updatedUser: User = {
        ...users[userIndex],
        ...userData,
        updatedAt: new Date()
      };
      
      users[userIndex] = updatedUser;
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      
      return updatedUser;
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
      const users = await this.getAllUsers();
      const filteredUsers = users.filter(user => user.id !== id);
      
      if (filteredUsers.length === users.length) {
        // 沒有找到要刪除的用戶
        return false;
      }
      
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(filteredUsers));
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
      const users = await this.getAllUsers();
      return users.filter(user => user.role === role);
    } catch (error) {
      console.error(`Error fetching users with role ${role}:`, error);
      return [];
    }
  },
  
  /**
   * 獲取所有可用的角色
   * @returns 角色列表
   */
  async getAllRoles(): Promise<{role: UserRole, count: number}[]> {
    try {
      const users = await this.getAllUsers();
      const roleCounts = Object.values(UserRole).map(role => {
        const count = users.filter(user => user.role === role).length;
        return { role, count };
      });
      
      return roleCounts;
    } catch (error) {
      console.error('Error fetching roles:', error);
      return Object.values(UserRole).map(role => ({ role, count: 0 }));
    }
  }
};
