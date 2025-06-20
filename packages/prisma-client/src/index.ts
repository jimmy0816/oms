/**
 * prisma-client 包的入口文件
 * 提供一個簡單的 Prisma 客戶端封裝
 */

import { PrismaClient } from '@prisma/client';

/**
 * 模擬 Prisma 客戶端
 * 當無法初始化真正的 Prisma 客戶端時使用
 */
class MockPrismaClient {
  user: any;
  ticket: any;
  report: any;
  role: any;
  userRole: any;
  comment: any;
  notification: any;

  constructor() {
    console.log('Initializing MockPrismaClient');
    this.user = this.createModelMethods();
    this.ticket = this.createModelMethods();
    this.report = this.createModelMethods();
    this.role = this.createModelMethods();
    this.userRole = this.createModelMethods();
    this.comment = this.createModelMethods();
    this.notification = this.createModelMethods();
  }

  private createModelMethods() {
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
        console.log('Using mock create');
        return { id: 'mock-id', ...args?.data };
      },
      update: async (args: any) => {
        console.log('Using mock update');
        return { id: args?.where?.id || 'mock-id', ...args?.data };
      },
      delete: async () => {
        console.log('Using mock delete');
        return { id: 'mock-id' };
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
        console.log('Using mock upsert');
        return { id: 'mock-id', ...args?.create };
      }
    };
  }

  async $connect() {
    console.log('Mock $connect called');
    return Promise.resolve();
  }

  async $disconnect() {
    console.log('Mock $disconnect called');
    return Promise.resolve();
  }
}

// 初始化 Prisma 客戶端
let prismaInstance: PrismaClient | MockPrismaClient;

try {
  // 嘗試初始化真正的 Prisma 客戶端
  prismaInstance = new PrismaClient({
    errorFormat: 'pretty',
    log: ['query', 'info', 'warn', 'error'],
  });
  console.log('Successfully initialized PrismaClient');
} catch (error) {
  console.error('Error initializing PrismaClient:', error);
  console.log('Falling back to MockPrismaClient');
  prismaInstance = new MockPrismaClient();
}

// 導出 Prisma 客戶端
export const prisma = prismaInstance;

// 導出所有 Prisma 類型
export * from '@prisma/client';
