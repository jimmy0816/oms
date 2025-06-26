// Use the correct path to the generated Prisma client
import { PrismaClient } from '.prisma/client';

// Add Prisma Client extensions or middleware here if needed
const prismaClientSingleton = (): PrismaClient => {
  return new PrismaClient({
    log: ['query', 'info', 'warn', 'error']
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma: PrismaClientSingleton =
  globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export * from '.prisma/client';
