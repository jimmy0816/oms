import { prisma } from '@/lib/prisma';
import { Category } from 'shared-types';

const buildCategoryTree = (
  categories: Category[],
  parentId: string | null = null,
): Category[] => {
  return categories
    .filter((category) => category.parentId === parentId)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    .map((category) => ({
      ...category,
      children: buildCategoryTree(categories, category.id),
    }));
};

export const categoryService = {
  async getAllCategories(): Promise<Category[]> {
    const allCategories = await prisma.category.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    return buildCategoryTree(allCategories as any);
  },

  async createCategory(data: {
    name: string;
    parentId: string | null;
  }): Promise<Category> {
    const { name, parentId } = data;

    let level = 1;
    if (parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId },
      });
      if (parent) {
        level = parent.level + 1;
      }
    }

    const maxDisplayOrder = await prisma.category.aggregate({
      _max: { displayOrder: true },
      where: { parentId },
    });

    const displayOrder = (maxDisplayOrder._max.displayOrder ?? -1) + 1;

    try {
      return (await prisma.category.create({
        data: { name, parentId, level, displayOrder },
      })) as any;
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Prisma unique constraint violation
        throw new Error('同層級下已有相同名稱的分類。');
      }
      throw error;
    }
  },

  async updateCategory(
    id: string,
    data: { name?: string; parentId?: string | null },
  ): Promise<Category> {
    try {
      const updates: any = { ...data };

      if (data.parentId !== undefined) {
        // Calculate new level
        let newLevel = 1;
        if (data.parentId) {
          const parent = await prisma.category.findUnique({
            where: { id: data.parentId },
          });
          if (parent) {
            newLevel = parent.level + 1;
          }
        }
        updates.level = newLevel;

        // Check if level actually changed to trigger recursive updates
        const currentCategory = await prisma.category.findUnique({
          where: { id },
          select: { level: true },
        });

        if (currentCategory && currentCategory.level !== newLevel) {
          const levelDiff = newLevel - currentCategory.level;

          // We need to update children too.
          // Since updateCategory is not transactional in the same way as reorder (it's a single call),
          // we can use $transaction here or just await sequentially if we accept slight risk,
          // but $transaction is better.
          // However, let's stick to the pattern. We'll perform the main update, then the children.
          // OR do it all in a transaction.

          const updateChildrenOps = async (parentId: string, diff: number) => {
            const ops: any[] = [];
            const children = await prisma.category.findMany({
              where: { parentId },
            });
            for (const child of children) {
              ops.push(
                prisma.category.update({
                  where: { id: child.id },
                  data: { level: child.level + diff },
                }),
              );
              ops.push(...(await updateChildrenOps(child.id, diff)));
            }
            return ops;
          };

          const childOps = await updateChildrenOps(id, levelDiff);

          await prisma.$transaction([
            prisma.category.update({ where: { id }, data: updates }),
            ...childOps,
          ]);

          // Return the updated category
          return (await prisma.category.findUnique({ where: { id } })) as any;
        }
      }

      return (await prisma.category.update({
        where: { id },
        data: updates,
      })) as any;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error('同層級下已有相同名稱的分類。');
      }
      throw error;
    }
  },

  async deleteCategory(id: string): Promise<void> {
    const reportCount = await prisma.report.count({
      where: { categoryId: id },
    });

    if (reportCount > 0) {
      throw new Error('此分類尚有關聯的通報，無法刪除。');
    }

    const childrenCount = await prisma.category.count({
      where: { parentId: id },
    });

    if (childrenCount > 0) {
      throw new Error('此分類尚有子分類，請先刪除子分類。');
    }

    await prisma.category.delete({ where: { id } });
  },

  async reorderCategories(
    updates: { id: string; displayOrder: number; parentId: string | null }[],
  ): Promise<void> {
    const updateOperations = async (update: {
      id: string;
      displayOrder: number;
      parentId: string | null;
    }) => {
      // 1. Calculate the new level based on the new parent
      let newLevel = 1;
      if (update.parentId) {
        const parent = await prisma.category.findUnique({
          where: { id: update.parentId },
        });
        if (parent) {
          newLevel = parent.level + 1;
        }
      }

      // 2. Fetch the current category to check if the level is changing
      const currentCategory = await prisma.category.findUnique({
        where: { id: update.id },
        select: { level: true },
      });

      const ops: any[] = [];

      // Update the category itself
      ops.push(
        prisma.category.update({
          where: { id: update.id },
          data: {
            displayOrder: update.displayOrder,
            parentId: update.parentId,
            level: newLevel,
          },
        }),
      );

      // 3. If level changes, recursively update children
      if (currentCategory && currentCategory.level !== newLevel) {
        const levelDiff = newLevel - currentCategory.level;
        const updateChildren = async (parentId: string, diff: number) => {
          const children = await prisma.category.findMany({
            where: { parentId },
          });
          for (const child of children) {
            ops.push(
              prisma.category.update({
                where: { id: child.id },
                data: { level: child.level + diff },
              }),
            );
            await updateChildren(child.id, diff);
          }
        };
        await updateChildren(update.id, levelDiff);
      }

      return ops;
    };

    const allOps = [];
    for (const update of updates) {
      const ops = await updateOperations(update);
      allOps.push(...ops);
    }

    await prisma.$transaction(allOps);
  },
};

export default categoryService;
