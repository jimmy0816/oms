import { PrismaClient } from '@prisma/client';

// Define global type for Prisma client
declare global {
  var prisma: PrismaClient | undefined;
}

/**
 * Create a singleton instance of PrismaClient with error handling
 */
let prismaClient: PrismaClient;

try {
  if (process.env.NODE_ENV === 'production') {
    // In production, create a new instance
    prismaClient = new PrismaClient({
      log: ['error', 'warn'],
    });
  } else {
    // In development, reuse the instance to avoid multiple connections
    if (!global.prisma) {
      global.prisma = new PrismaClient({
        log: ['error', 'warn', 'query'],
      });
    }
    prismaClient = global.prisma;
  }
  console.log('PrismaClient initialized successfully');
} catch (error) {
  console.error('Failed to initialize PrismaClient:', error);
  throw new Error('Database connection failed');
}

// Export the prisma instance with proper type annotation
export const prisma: PrismaClient = prismaClient;

// Re-export types from Prisma
export * from '@prisma/client';
