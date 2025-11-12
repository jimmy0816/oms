import apiClient from '@/lib/apiClient';
import { User } from '@/types/user';

// More specific types for API payloads
export interface CreateUserPayload {
  email: string;
  name: string;
  password?: string;
  primaryRoleId: string;
  additionalRoleIds?: string[];
}

export interface UpdateUserPayload {
  email?: string;
  name?: string;
  primaryRoleId: string;
  additionalRoleIds?: string[];
}


/**
 * User Management Service
 * Communicates with the backend user APIs
 */
export const userService = {
  /**
   * Fetches all users.
   * @returns A promise that resolves to a list of users.
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const users = await apiClient.get<User[]>('/api/users');
      return users.map((user: any) => ({
        ...user,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  /**
   * Fetches a single user by their ID.
   * @param id The user's ID.
   * @returns A promise that resolves to the user object or null if not found.
   */
  async getUserById(id: string): Promise<User | null> {
    try {
      const user = await apiClient.get<User>(`/api/users/${id}`);
      return {
        ...user,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error(`Error fetching user with ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Creates a new user.
   * @param userData The data for the new user.
   * @returns A promise that resolves to the created user object.
   */
  async createUser(userData: CreateUserPayload): Promise<User> {
    try {
      const newUser = await apiClient.post<User>('/api/users', userData);
      return {
        ...newUser,
        createdAt: new Date(newUser.createdAt),
        updatedAt: new Date(newUser.updatedAt),
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  /**
   * Updates a user's information and role assignments.
   * @param id The user's ID.
   * @param userData The data to update.
   * @returns A promise that resolves to the updated user object.
   */
  async updateUser(id: string, userData: UpdateUserPayload): Promise<User> {
    try {
      const updatedUser = await apiClient.put<User>(`/api/users/${id}`, userData);
      return {
        ...updatedUser,
        createdAt: new Date(updatedUser.createdAt),
        updatedAt: new Date(updatedUser.updatedAt),
      };
    } catch (error) {
      console.error(`Error updating user with ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Deletes a user (soft delete).
   * @param id The user's ID.
   */
  async deleteUser(id: string): Promise<void> {
    try {
      await apiClient.delete<void>(`/api/users/${id}`);
    } catch (error) {
      console.error(`Error deleting user with ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Changes the current user's password.
   * @param currentPassword The user's current password.
   * @param newPassword The new password.
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await apiClient.put<void>('/api/users/change-password', { currentPassword, newPassword });
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  },
};

export default userService;
