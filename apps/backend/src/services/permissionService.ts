import { prisma } from '@/lib/prisma';

/**
 * Permission Management Service
 * Handles database operations for permissions and role-permission assignments.
 */
export const permissionService = {
  /**
   * Gets all available permissions.
   * @returns A list of all permissions.
   */
  async getAllPermissions(): Promise<any[]> {
    try {
      return await prisma.permission.findMany({
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      console.error('Failed to get all permissions:', error);
      throw error;
    }
  },

  /**
   * Gets all roles and their assigned permissions.
   * @returns A map of role names to their permission lists.
   */
  async getAllRolePermissions(): Promise<Record<string, string[]>> {
    try {
      const roles = await prisma.role.findMany({
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      const rolePermissionsMap: Record<string, string[]> = {};
      roles.forEach((role) => {
        rolePermissionsMap[role.name] = role.rolePermissions.map(
          (rp) => rp.permission.name
        );
      });

      return rolePermissionsMap;
    } catch (error) {
      console.error('Failed to get all role permissions:', error);
      throw error;
    }
  },

  /**
   * Gets the permissions for a specific role by its ID.
   * @param roleId The ID of the role.
   * @returns A list of permission names.
   */
  async getRolePermissions(roleId: string): Promise<string[]> {
    try {
      const role = await prisma.role.findUnique({
        where: { id: roleId },
        include: {
          rolePermissions: {
            select: {
              permission: {
                select: { name: true },
              },
            },
          },
        },
      });

      if (!role) {
        throw new Error(`Role with ID ${roleId} not found`);
      }

      return role.rolePermissions.map((rp) => rp.permission.name);
    } catch (error) {
      console.error(`Failed to get permissions for role ${roleId}:`, error);
      throw error;
    }
  },

  /**
   * Updates the permissions for a role.
   * @param roleId The ID of the role to update.
   * @param permissionNames The new list of permission names for the role.
   */
  async updateRolePermissions(
    roleId: string,
    permissionNames: string[]
  ): Promise<void> {
    try {
      const permissions = await prisma.permission.findMany({
        where: { name: { in: permissionNames } },
        select: { id: true },
      });

      if (permissions.length !== permissionNames.length) {
        throw new Error('One or more permission names are invalid.');
      }

      const permissionIds = permissions.map((p) => p.id);

      await prisma.$transaction([
        prisma.rolePermission.deleteMany({
          where: { roleId: roleId },
        }),
        prisma.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: roleId,
            permissionId,
          })),
        }),
      ]);
    } catch (error) {
      console.error(`Failed to update permissions for role ${roleId}:`, error);
      throw error;
    }
  },

  /**
   * Checks if a user has a specific permission.
   * @param userId The user's ID.
   * @param permissionName The name of the permission to check.
   * @returns True if the user has the permission, false otherwise.
   */
  async hasPermission(
    userId: string,
    permissionName: string
  ): Promise<boolean> {
    try {
      const userRoles = await prisma.userRole.findMany({
        where: { userId },
        select: { roleId: true },
      });

      if (userRoles.length === 0) {
        return false;
      }

      const permission = await prisma.permission.findUnique({
        where: { name: permissionName },
        select: { id: true },
      });

      if (!permission) {
        return false;
      }

      const roleIds = userRoles.map((ur) => ur.roleId);

      const rolePermissionCount = await prisma.rolePermission.count({
        where: {
          roleId: { in: roleIds },
          permissionId: permission.id,
        },
      });

      return rolePermissionCount > 0;
    } catch (error) {
      console.error(`Failed to check permission ${permissionName} for user ${userId}:`, error);
      return false;
    }
  },

  /**
   * Gets all permissions for a specific user.
   * @param userId The user's ID.
   * @returns A list of all unique permission names for the user.
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    try {
      const userRoles = await prisma.userRole.findMany({
        where: { userId },
        include: {
          role: {
            include: {
              rolePermissions: {
                select: {
                  permission: {
                    select: { name: true },
                  },
                },
              },
            },
          },
        },
      });

      const permissions = new Set<string>();
      userRoles.forEach((userRole) => {
        userRole.role.rolePermissions.forEach((rp) => {
          permissions.add(rp.permission.name);
        });
      });

      return Array.from(permissions);
    } catch (error) {
      console.error(`Failed to get permissions for user ${userId}:`, error);
      return [];
    }
  },
};
