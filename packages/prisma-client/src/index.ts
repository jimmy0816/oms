import { PrismaClient } from '../node_modules/.prisma/client';
// import { PrismaClient } from '@prisma/client';

// Add Prisma Client extensions or middleware here if needed
const prismaClientSingleton = (): PrismaClient => {
  return new PrismaClient();
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma: PrismaClientSingleton =
  globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export * from '@prisma/client';
