import { PrismaClient } from '../node_modules/.prisma/client';

/**
 * Create a singleton instance of PrismaClient with error handling
 */
const prismaClientSingleton = (): PrismaClient => {
  try {
    return new PrismaClient({
      errorFormat: 'pretty',
      log: ['error', 'warn'],
    });
  } catch (error) {
    console.error('Error initializing PrismaClient:', error);
    throw error;
  }
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

// Create and export the prisma client singleton
export const prisma: PrismaClientSingleton =
  globalForPrisma.prisma ?? prismaClientSingleton();

// In development, save the singleton to avoid multiple instances
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Export all types from Prisma client
export * from '@prisma/client';
