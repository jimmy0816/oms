import { prisma } from '@/lib/prisma';
import { Category } from 'shared-types';

const buildCategoryTree = (categories: Category[], parentId: string | null = null): Category[] => {
  return categories
    .filter(category => category.parentId === parentId)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    .map(category => ({
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

  async createCategory(data: { name: string; parentId: string | null }): Promise<Category> {
    const { name, parentId } = data;

    let level = 1;
    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
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
      return await prisma.category.create({
        data: { name, parentId, level, displayOrder },
      }) as any;
    } catch (error: any) {
      if (error.code === 'P2002') { // Prisma unique constraint violation
        throw new Error('同層級下已有相同名稱的分類。');
      }
      throw error;
    }
  },

  async updateCategory(id: string, data: { name: string }): Promise<Category> {
    try {
      return await prisma.category.update({
        where: { id },
        data,
      }) as any;
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

  async reorderCategories(updates: { id: string; displayOrder: number; parentId: string | null }[]): Promise<void> {
    const transactions = updates.map(update => 
      prisma.category.update({
        where: { id: update.id },
        data: {
          displayOrder: update.displayOrder,
          parentId: update.parentId,
        },
      })
    );

    await prisma.$transaction(transactions);
  },
};

export default categoryService;
