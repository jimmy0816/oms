import { Permission } from 'shared-types';
import apiClient from '@/lib/apiClient';

// Define a type for the Role object, which will now be fetched from the backend
export interface Role {
  id: string;
  name: string;
  description?: string;
  userCount?: number;
  createdAt: string;
  updatedAt: string;
}

export const roleService = {
  /**
   * Fetches all roles from the backend.
   * @returns A promise that resolves to an array of Role objects.
   */
  async getAllRoles(): Promise<Role[]> {
    try {
      const { roles } = await apiClient.get<{ roles: Role[] }>('/api/roles');
      return roles || [];
    } catch (error) {
      console.error('Error fetching roles:', error);
      throw error;
    }
  },

  /**
   * Creates a new role.
   * @param name The name of the new role.
   * @param description The description of the new role.
   * @returns A promise that resolves to the newly created Role object.
   */
  async createRole(name: string, description?: string): Promise<Role> {
    try {
      const newRole = await apiClient.post<Role>('/api/roles', { name, description });
      return newRole;
    } catch (error) {
      console.error('Error creating role:', error);
      throw error;
    }
  },

  /**
   * Updates an existing role.
   * @param id The ID of the role to update.
   * @param data The data to update (name, description).
   * @returns A promise that resolves to the updated Role object.
   */
  async updateRole(id: string, data: { name: string; description?: string }): Promise<Role> {
    try {
      const updatedRole = await apiClient.put<Role>(`/api/roles/${id}`, data);
      return updatedRole;
    } catch (error) {
      console.error(`Error updating role ${id}:`, error);
      throw error;
    }
  },

  /**
   * Deletes a role.
   * @param id The ID of the role to delete.
   */
  async deleteRole(id: string): Promise<void> {
    try {
      await apiClient.delete(`/api/roles/${id}`);
    } catch (error) {
      console.error(`Error deleting role ${id}:`, error);
      throw error;
    }
  },

  /**
   * Fetches the permissions for a specific role.
   * @param id The ID of the role.
   * @returns A promise that resolves to an array of permission strings.
   */
  async getRolePermissions(id: string): Promise<Permission[]> {
    try {
      const { permissions } = await apiClient.get<{ permissions: Permission[] }>(`/api/roles/${id}/permissions`);
      return permissions || [];
    } catch (error) {
      console.error(`Error fetching permissions for role ${id}:`, error);
      throw error;
    }
  },

  /**
   * Updates the permissions for a specific role.
   * @param id The ID of the role.
   * @param permissions An array of permission strings.
   */
  async updateRolePermissions(id: string, permissions: Permission[]): Promise<void> {
    try {
      await apiClient.put(`/api/roles/${id}/permissions`, { permissions });
    } catch (error) {
      console.error(`Error updating permissions for role ${id}:`, error);
      throw error;
    }
  },
};
