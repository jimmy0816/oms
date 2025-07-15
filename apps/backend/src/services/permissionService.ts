import { prisma } from '@/lib/prisma';
import { UserRole, Permission, ROLE_PERMISSIONS } from 'shared-types';

/**
 * 權限管理服務
 * 使用 Prisma 客戶端操作數據庫中的權限數據
 */
export const permissionService = {
  /**
   * 獲取所有權限
   * @returns 權限列表
   */
  async getAllPermissions(): Promise<any[]> {
    try {
      return await prisma.permission.findMany({
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      console.error('獲取所有權限失敗:', error);
      throw error;
    }
  },

  /**
   * 獲取所有角色及其權限
   * @returns 角色權限映射
   */
  async getAllRolePermissions(): Promise<Record<string, string[]>> {
    try {
      // 獲取所有角色及其權限關係
      const roles = await prisma.role.findMany({
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      // 構建角色權限映射
      const rolePermissionsMap: Record<string, string[]> = {};

      roles.forEach((role) => {
        rolePermissionsMap[role.name] = role.rolePermissions.map(
          (rp) => rp.permission.name
        );
      });

      return rolePermissionsMap;
    } catch (error) {
      console.error('獲取所有角色權限失敗:', error);
      throw error;
    }
  },

  /**
   * 獲取特定角色的權限
   * @param roleName 角色名稱
   * @returns 權限列表
   */
  async getRolePermissions(roleName: string): Promise<string[]> {
    try {
      // 獲取角色及其權限
      const role = await prisma.role.findUnique({
        where: { name: roleName },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      if (!role) {
        throw new Error(`角色 ${roleName} 不存在`);
      }

      // 返回權限名稱列表
      return role.rolePermissions.map((rp) => rp.permission.name);
    } catch (error) {
      console.error(`獲取角色 ${roleName} 的權限失敗:`, error);
      throw error;
    }
  },

  /**
   * 更新角色權限
   * @param roleName 角色名稱
   * @param permissionNames 權限名稱列表
   * @returns 更新結果
   */
  async updateRolePermissions(
    roleName: string,
    permissionNames: string[]
  ): Promise<void> {
    try {
      // 獲取角色
      const role = await prisma.role.findUnique({
        where: { name: roleName },
      });

      if (!role) {
        throw new Error(`角色 ${roleName} 不存在`);
      }

      // 獲取權限 ID
      const permissions = await prisma.permission.findMany({
        where: {
          name: {
            in: permissionNames,
          },
        },
      });

      const permissionIds = permissions.map((p) => p.id);

      // 使用事務確保原子性操作
      await prisma.$transaction(async (tx) => {
        // 刪除現有的角色權限
        await tx.rolePermission.deleteMany({
          where: { roleId: role.id },
        });

        // 創建新的角色權限
        await Promise.all(
          permissionIds.map((permissionId) =>
            tx.rolePermission.create({
              data: {
                roleId: role.id,
                permissionId,
              },
            })
          )
        );
      });
    } catch (error) {
      console.error(`更新角色 ${roleName} 的權限失敗:`, error);
      throw error;
    }
  },

  /**
   * 重置角色權限為默認值
   * @param roleName 角色名稱
   * @returns 重置結果
   */
  async resetRolePermissions(roleName: string): Promise<void> {
    try {
      // 定義默認角色權限
      const defaultRolePermissions: Record<string, string[]> = ROLE_PERMISSIONS;

      // 獲取默認權限
      const defaultPermissions = defaultRolePermissions[roleName] || [];

      // 更新角色權限
      await this.updateRolePermissions(roleName, defaultPermissions);
    } catch (error) {
      console.error(`重置角色 ${roleName} 的權限失敗:`, error);
      throw error;
    }
  },

  /**
   * 檢查用戶是否具有特定權限
   * @param userId 用戶 ID
   * @param permissionName 權限名稱
   * @returns 是否具有權限
   */
  async hasPermission(
    userId: string,
    permissionName: string
  ): Promise<boolean> {
    try {
      // 獲取用戶角色
      const userRoles = await prisma.userRole.findMany({
        where: { userId },
        include: {
          role: true,
        },
      });

      if (userRoles.length === 0) {
        return false;
      }

      // 獲取權限 ID
      const permission = await prisma.permission.findUnique({
        where: { name: permissionName },
      });

      if (!permission) {
        return false;
      }

      // 檢查用戶角色是否具有該權限
      const roleIds = userRoles.map((ur) => ur.roleId);

      const rolePermission = await prisma.rolePermission.findFirst({
        where: {
          roleId: { in: roleIds },
          permissionId: permission.id,
        },
      });

      return !!rolePermission;
    } catch (error) {
      console.error(`檢查用戶 ${userId} 的權限 ${permissionName} 失敗:`, error);
      return false;
    }
  },

  /**
   * 獲取用戶的所有權限
   * @param userId 用戶 ID
   * @returns 權限列表
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    try {
      // 獲取用戶角色及其權限
      const userRoles = await prisma.userRole.findMany({
        where: { userId },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      // 收集所有權限
      const permissions = new Set<string>();

      userRoles.forEach((userRole) => {
        userRole.role.rolePermissions.forEach((rolePermission) => {
          permissions.add(rolePermission.permission.name);
        });
      });

      return Array.from(permissions);
    } catch (error) {
      console.error(`獲取用戶 ${userId} 的權限失敗:`, error);
      return [];
    }
  },
};
