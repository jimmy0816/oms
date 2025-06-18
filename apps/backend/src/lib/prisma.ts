import { PrismaClient } from '@prisma/client';

// PrismaClient 是一個可以被附加到全局對象的類
// NextJS 在開發模式下會快速重新加載，這可能會導致多個 PrismaClient 實例
// 為了防止這種情況，我們將 PrismaClient 實例保存在全局對象中
// 這樣在開發模式下，我們只會創建一個 PrismaClient 實例

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
