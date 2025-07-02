import { PrismaClient } from '@prisma/client';
import { als } from './als';

// 宣告一個全域變數來緩存 Prisma Client
declare global {
  // 使用 `any` 來避免嚴格的型別檢查，這是處理擴充客戶端和熱重載時的常見做法
  var prisma: any | undefined;
}

const createPrismaClient = () => {
  return new PrismaClient().$extends({
    query: {
      $allOperations: async ({ model, operation, args, query }) => {
        const context = als.getStore();
        const actor = context?.actor;

        console.log(
          `[Prisma Middleware] Operation: ${operation}, Model: ${model}, Actor found: ${!!actor}`
        );

        const writeOperations = [
          'create',
          'update',
          'delete',
          'upsert',
          'createMany',
          'updateMany',
          'deleteMany',
        ];
        const isWriteOperation = model && writeOperations.includes(operation);

        if (isWriteOperation && actor) {
          console.log(
            `[Prisma Middleware] Writing to ${model} with operation ${operation}`
          );
          const result = await query(args);

          try {
            let targetId = 'N/A';
            if (operation.includes('Many')) {
              targetId = 'MULTIPLE';
            } else if (result && typeof result === 'object' && 'id' in result) {
              targetId = (result as { id: string }).id;
            } else if (args && typeof args === 'object' && 'where' in args) {
              const where = (args as { where?: { id?: string } }).where;
              if (where?.id) {
                targetId = where.id;
              }
            }

            // 使用一個新的、未經擴充的客戶端實例來寫入日誌，這是最安全避免無限迴圈的方法
            const logPrisma = new PrismaClient();
            await logPrisma.auditLog.create({
              data: {
                actorId: actor.id,
                action: `${operation.toUpperCase()}_${model.toUpperCase()}`,
                targetId: targetId,
                targetType: model,
                details: args,
              },
            });
            await logPrisma.$disconnect(); // 立即斷開連線
          } catch (auditError) {
            console.error('CRITICAL: Failed to record audit log:', auditError);
          }

          return result;
        }

        return query(args);
      },
    },
  });
};

// 這裡的 prisma 變數現在會正確地被推斷為帶有擴充方法的類型
export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
