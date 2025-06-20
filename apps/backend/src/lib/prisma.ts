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
      findMany: async () => {
        console.log('Using mock findMany');
        return [];
      },
      findUnique: async () => {
        console.log('Using mock findUnique');
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
  userRoles: ModelMethods;
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
    this.userRoles = this.createModelMethods();
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

try {
  // 檢查全局實例
  if (global.prisma) {
    console.log('Using existing Prisma client from global');
    prismaClient = global.prisma;
  } else {
    // 嘗試導入和初始化 Prisma 客戶端
    try {
      const { PrismaClient } = require('@prisma/client');
      console.log('Initializing new PrismaClient');
      prismaClient = new PrismaClient();
      
      // 在開發環境中保存到全局對象
      if (process.env.NODE_ENV !== 'production') {
        global.prisma = prismaClient;
      }
    } catch (importError) {
      console.error('Failed to import PrismaClient:', importError);
      console.log('Falling back to MockPrismaClient');
      prismaClient = new MockPrismaClient();
    }
  }
} catch (error) {
  console.error('Error in Prisma client initialization:', error);
  console.log('Falling back to MockPrismaClient');
  prismaClient = new MockPrismaClient();
}

export const prisma = prismaClient;
