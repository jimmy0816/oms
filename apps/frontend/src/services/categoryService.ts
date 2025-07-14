import { Category } from 'shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const getAuthHeaders = (): HeadersInit => {
  if (typeof window === 'undefined')
    return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token');
  const headeres: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headeres.Authorization = `Bearer ${token}`;
  }
  return headeres;
};

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
      const response = await fetch(`${API_URL}/api/categories`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch categories');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },
};
