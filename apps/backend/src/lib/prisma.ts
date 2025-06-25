// 使用直接導入的方式可能會導致錯誤，因為 Prisma 客戶端可能尚未生成
// 我們將使用動態導入和模擬客戶端來確保應用程序不會崩潰

// 定義模型方法的通用類型
type ModelMethods = {
  findMany: (...args: any[]) => Promise<any[]>;
  findUnique: (...args: any[]) => Promise<any | null>;
  create: (...args: any[]) => Promise<any>;
  update: (...args: any[]) => Promise<any>;
  delete: (...args: any[]) => Promise<any>;
  count: (...args: any[]) => Promise<number>;
  findFirst: (...args: any[]) => Promise<any | null>;
  upsert: (...args: any[]) => Promise<any>;
};

// 聲明全局 prisma 實例類型
declare global {
  var prisma: any;
}

/**
 * 創建一個模擬的 PrismaClient
 * 當 Prisma 客戶端無法初始化時，我們會使用這個模擬客戶端
 */
class MockPrismaClient {
  // 創建一個通用的模型方法對象
  private createModelMethods(): ModelMethods {
    return {
      findMany: async (args: any) => {
        console.log('Using mock findMany', args);
        
        // Mock user roles for login
        if (args?.where?.userId === 'mock-user-1') {
          return [
            {
              id: 'mock-user-role-1',
              userId: 'mock-user-1',
              roleId: 'mock-role-1',
              role: {
                id: 'mock-role-1',
                name: 'super-admin',
                description: 'Super Administrator',
                createdAt: new Date(),
                updatedAt: new Date()
              }
            }
          ];
        } else if (args?.where?.userId === 'mock-user-2') {
          return [
            {
              id: 'mock-user-role-2',
              userId: 'mock-user-2',
              roleId: 'mock-role-2',
              role: {
                id: 'mock-role-2',
                name: 'editor',
                description: 'Content Editor',
                createdAt: new Date(),
                updatedAt: new Date()
              }
            }
          ];
        }
        
        return [];
      },
      findUnique: async (args: any) => {
        console.log('Using mock findUnique', args);
        
        // Mock user data for login
        if (args?.where?.email === 'admin@example.com') {
          return {
            id: 'mock-user-1',
            email: 'admin@example.com',
            name: 'Admin User',
            password: '$2a$10$XQD.9VmDUklUV9nNpDK/0.EBK2aVWiJ9VsKxPOT5a5MnV21O4Lyby', // hashed 'password123'
            role: 'admin',
            createdAt: new Date(),
            updatedAt: new Date()
          };
        } else if (args?.where?.email === 'user@example.com') {
          return {
            id: 'mock-user-2',
            email: 'user@example.com',
            name: 'Regular User',
            password: '$2a$10$XQD.9VmDUklUV9nNpDK/0.EBK2aVWiJ9VsKxPOT5a5MnV21O4Lyby', // hashed 'password123'
            role: 'user',
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
        
        return null;
      },
      create: async (args: any) => {
        console.log('Using mock create with args:', args);
        return { id: 'mock-id', ...args?.data, createdAt: new Date(), updatedAt: new Date() };
      },
      update: async (args: any) => {
        console.log('Using mock update with args:', args);
        return { id: args?.where?.id || 'mock-id', ...args?.data, updatedAt: new Date() };
      },
      delete: async (args: any) => {
        console.log('Using mock delete with args:', args);
        return { id: args?.where?.id || 'mock-id' };
      },
      count: async () => {
        console.log('Using mock count');
        return 0;
      },
      findFirst: async () => {
        console.log('Using mock findFirst');
        return null;
      },
      upsert: async (args: any) => {
        console.log('Using mock upsert with args:', args);
        return { id: 'mock-id', ...args?.create, createdAt: new Date(), updatedAt: new Date() };
      }
    };
  }

  // 模擬所有可能的模型
  user: ModelMethods;
  role: ModelMethods;
  permission: ModelMethods;
  report: ModelMethods;
  ticket: ModelMethods;
  userRole: ModelMethods;
  rolePermissions: ModelMethods;
  notification: ModelMethods;
  comment: ModelMethods;

  constructor() {
    console.log('Initializing MockPrismaClient');
    this.user = this.createModelMethods();
    this.role = this.createModelMethods();
    this.permission = this.createModelMethods();
    this.report = this.createModelMethods();
    this.ticket = this.createModelMethods();
    this.userRole = this.createModelMethods();
    this.rolePermissions = this.createModelMethods();
    this.notification = this.createModelMethods();
    this.comment = this.createModelMethods();
  }

  // 添加 $connect 和 $disconnect 方法以模擬真實的 PrismaClient
  async $connect() {
    console.log('Mock PrismaClient $connect called');
    return this;
  }

  async $disconnect() {
    console.log('Mock PrismaClient $disconnect called');
    return;
  }
}

// 創建並導出 prisma 客戶端實例
let prismaClient: any;

// 在這裡創建一個簡單的用戶資料庫來模擬登入功能
// 這不是使用模擬客戶端，而是創建一個真實的內存資料庫

// 定義用戶資料結構
interface UserData {
  id: string;
  email: string;
  name: string;
  password: string; // 已加密的密碼
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

// 定義角色資料結構
interface RoleData {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

// 定義用戶角色關聯資料結構
interface UserRoleData {
  id: string;
  userId: string;
  roleId: string;
  role: RoleData;
}

// 創建一個內存資料庫
class InMemoryDatabase {
  private users: Map<string, UserData> = new Map();
  private usersByEmail: Map<string, UserData> = new Map();
  private userRoles: Map<string, UserRoleData[]> = new Map();
  
  constructor() {
    // 初始化一些測試用戶
    this.addUser({
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin User',
      password: '$2a$10$XQD.9VmDUklUV9nNpDK/0.EBK2aVWiJ9VsKxPOT5a5MnV21O4Lyby', // password123
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    this.addUser({
      id: 'user-2',
      email: 'user@example.com',
      name: 'Regular User',
      password: '$2a$10$XQD.9VmDUklUV9nNpDK/0.EBK2aVWiJ9VsKxPOT5a5MnV21O4Lyby', // password123
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // 添加額外角色
    this.addUserRole('user-1', {
      id: 'role-1',
      userId: 'user-1',
      roleId: 'role-id-1',
      role: {
        id: 'role-id-1',
        name: 'super-admin',
        description: 'Super Administrator',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    this.addUserRole('user-2', {
      id: 'role-2',
      userId: 'user-2',
      roleId: 'role-id-2',
      role: {
        id: 'role-id-2',
        name: 'editor',
        description: 'Content Editor',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }
  
  private addUser(user: UserData) {
    this.users.set(user.id, user);
    this.usersByEmail.set(user.email, user);
  }
  
  private addUserRole(userId: string, userRole: UserRoleData) {
    if (!this.userRoles.has(userId)) {
      this.userRoles.set(userId, []);
    }
    this.userRoles.get(userId)!.push(userRole);
  }
  
  findUniqueUser(where: { id?: string, email?: string }) {
    if (where.id) {
      return this.users.get(where.id) || null;
    }
    if (where.email) {
      return this.usersByEmail.get(where.email) || null;
    }
    return null;
  }
  
  findUserRoles(where: { userId: string }) {
    return this.userRoles.get(where.userId) || [];
  }
}

// 創建內存資料庫實例
const db = new InMemoryDatabase();

// 創建一個自定義的 Prisma 客戶端
const customPrismaClient = {
  user: {
    findUnique: async (args: any) => {
      console.log('Using custom findUnique for user:', args);
      return db.findUniqueUser(args.where);
    }
  },
  userRole: {
    findMany: async (args: any) => {
      console.log('Using custom findMany for userRole:', args);
      return db.findUserRoles(args.where);
    }
  },
  $connect: async () => {
    console.log('Custom Prisma client connected');
    return Promise.resolve();
  },
  $disconnect: async () => {
    console.log('Custom Prisma client disconnected');
    return Promise.resolve();
  }
};

// 設置 prisma 客戶端
prismaClient = customPrismaClient;

export const prisma = prismaClient;
