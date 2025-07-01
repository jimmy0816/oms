/**
 * 直接從 prisma-client 導入 Prisma 客戶端
 * 這樣可以確保整個應用程序使用同一個 Prisma 實例
 */
import { prisma } from 'prisma-client';

// 導出 prisma 客戶端實例
export { prisma };

// 記錄數據庫連接信息
console.log('Using real Prisma client with database connection');

