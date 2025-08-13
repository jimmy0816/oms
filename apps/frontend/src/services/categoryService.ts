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

  /**
   * Creates a new category.
   * @param data - The data for the new category.
   * @returns The created category.
   */
  async createCategory(data: { name: string; parentId: string | null }): Promise<Category> {
    try {
      return await apiClient.post<Category>('/api/categories', data);
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  },

  /**
   * Updates an existing category.
   * @param id - The ID of the category to update.
   * @param data - The data to update the category with.
   * @returns The updated category.
   */
  async updateCategory(id: string, data: { name: string }): Promise<Category> {
    try {
      return await apiClient.put<Category>(`/api/categories/${id}`, data);
    } catch (error) {
      console.error(`Error updating category ${id}:`, error);
      throw error;
    }
  },

  /**
   * Deletes a category.
   * @param id - The ID of the category to delete.
   */
  async deleteCategory(id: string): Promise<void> {
    try {
      await apiClient.delete(`/api/categories/${id}`);
    } catch (error) {
      console.error(`Error deleting category ${id}:`, error);
      throw error;
    }
  },

  /**
   * Updates the order and hierarchy of categories.
   * @param updates - An array of category updates.
   */
  async updateCategoryOrder(updates: { id: string; displayOrder: number; parentId: string | null }[]): Promise<void> {
    try {
      await apiClient.put('/api/categories/reorder', { updates });
    } catch (error) {
      console.error('Error updating category order:', error);
      throw error;
    }
  },
};
