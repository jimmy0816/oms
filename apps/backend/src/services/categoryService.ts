import { prisma } from '@/lib/prisma';

interface CategoryNode {
  id: string;
  name: string;
  level: number;
  parentId: string | null;
  displayOrder: number;
  children?: CategoryNode[];
}

export const categoryService = {
  /**
   * Fetches all categories from the database and organizes them into a hierarchical structure.
   * @returns An array of top-level categories with their children.
   */
  async getAllCategories(): Promise<CategoryNode[]> {
    const categories = await prisma.category.findMany({
      orderBy: { displayOrder: 'asc' }, // Order by displayOrder for consistent display
    });

    const categoryMap = new Map<string, CategoryNode>();
    categories.forEach((cat) => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    const rootCategories: CategoryNode[] = [];

    categories.forEach((cat) => {
      const categoryNode = categoryMap.get(cat.id)!;
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children!.push(categoryNode);
        }
      } else {
        rootCategories.push(categoryNode);
      }
    });

    // Sort all levels for consistent output
    rootCategories.sort((a, b) => a.displayOrder - b.displayOrder);
    rootCategories.forEach((root) => {
      root.children?.sort((a, b) => a.displayOrder - b.displayOrder);
      root.children?.forEach((level2) => {
        level2.children?.sort((a, b) => a.displayOrder - b.displayOrder);
      });
    });

    return rootCategories;
  },
};

export default categoryService;
