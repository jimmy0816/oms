import { Category } from 'shared-types';
import apiClient from '@/lib/apiClient';



export const getCategoryPath = (
  categoryId?: string | null,
  categories?: Category[]
) => {
  if (!categoryId) return '未分類';

  const findCategoryPathRecursive = (
    cats: Category[],
    currentPath: string[]
  ): string | undefined => {
    for (const cat of cats) {
      const newPath = [...currentPath, cat.name];
      if (cat.id === categoryId) {
        return newPath.join(' > ');
      }
      if (cat.children) {
        const found = findCategoryPathRecursive(cat.children, newPath);
        if (found) return found;
      }
    }
    return undefined;
  };
  const result = findCategoryPathRecursive(categories, []);

  return result || '未分類';
};

export const categoryService = {
  /**
   * Fetches all categories from the backend API.
   * @returns A hierarchical list of categories.
   */
  async getAllCategories(): Promise<Category[]> {
    try {
      return await apiClient.get<Category[]>('/api/categories');
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },
};
