import { prisma } from '@/lib/prisma';
import { UserRole } from 'shared-types';
import { Permission } from '@/utils/permissions';

/**
 * 權限管理服務
 * 使用 Prisma 客戶端操作數據庫中的權限數據
 */
export const permissionService = {
  /**
   * 初始化系統權限
   * 將所有權限添加到數據庫中
   */
  async initializePermissions(): Promise<void> {
    try {
      // 檢查權限表是否已初始化
      const permissionCount = await prisma.permission.count();

      if (permissionCount > 0) {
        console.log('權限已初始化，跳過初始化過程');
        return;
      }

      // 將所有權限添加到數據庫
      const permissions = Object.values(Permission).map((name) => ({
        name,
        description: name.replace(/_/g, ' ').toLowerCase(),
      }));

      await prisma.permission.createMany({
        data: permissions,
        skipDuplicates: true,
      });

      console.log(`成功初始化 ${permissions.length} 個權限`);
    } catch (error) {
      console.error('初始化權限失敗:', error);
      throw error;
    }
  },

  /**
   * 初始化角色默認權限
   * 為每個角色設置默認權限
   */
  async initializeRolePermissions(): Promise<void> {
    try {
      // 獲取所有權限
      const permissions = await prisma.permission.findMany();
      const permissionMap = new Map(permissions.map((p) => [p.name, p.id]));

      // 定義默認角色權限
      const defaultRolePermissions: Record<string, string[]> = {
        [UserRole.ADMIN]: Object.values(Permission),
        [UserRole.MANAGER]: [
          Permission.VIEW_TICKETS,
          Permission.CREATE_TICKETS,
          Permission.EDIT_TICKETS,
          Permission.ASSIGN_TICKETS,
          Permission.VERIFY_TICKETS,
          Permission.VIEW_REPORTS,
          Permission.PROCESS_REPORTS,
          Permission.REVIEW_REPORTS,
          Permission.VIEW_USERS,
        ],
        [UserRole.REPORT_PROCESSOR]: [
          Permission.VIEW_TICKETS,
          Permission.CREATE_TICKETS,
          Permission.EDIT_TICKETS,
          Permission.ASSIGN_TICKETS,
          Permission.VIEW_REPORTS,
          Permission.CREATE_REPORTS,
          Permission.PROCESS_REPORTS,
        ],
        [UserRole.REPORT_REVIEWER]: [
          Permission.VIEW_TICKETS,
          Permission.VIEW_REPORTS,
          Permission.REVIEW_REPORTS,
          Permission.VERIFY_TICKETS,
        ],
        [UserRole.MAINTENANCE_WORKER]: [
          Permission.VIEW_TICKETS,
          Permission.CLAIM_TICKETS,
          Permission.COMPLETE_TICKETS,
        ],
        [UserRole.CUSTOMER_SERVICE]: [
          Permission.VIEW_TICKETS,
          Permission.CREATE_TICKETS,
          Permission.VIEW_REPORTS,
          Permission.CREATE_REPORTS,
        ],
        [UserRole.USER]: [Permission.VIEW_TICKETS, Permission.CREATE_REPORTS],
      };

      // 為每個角色設置默認權限
      for (const [roleName, permissionNames] of Object.entries(
        defaultRolePermissions
      )) {
        // 檢查角色是否存在
        let role = await prisma.role.findUnique({
          where: { name: roleName },
        });

        // 如果角色不存在，創建它
        if (!role) {
          role = await prisma.role.create({
            data: {
              name: roleName,
              description: `${roleName} 角色`,
            },
          });
        }

        // 檢查該角色是否已有權限設置
        const existingPermissions = await prisma.rolePermission.count({
          where: { roleId: role.id },
        });

        // 如果已有權限設置，則跳過
        if (existingPermissions > 0) {
          console.log(`角色 ${roleName} 已有權限設置，跳過初始化`);
          continue;
        }

        // 為角色添加默認權限
        const rolePermissions = permissionNames
          .filter((name) => permissionMap.has(name))
          .map((name) => ({
            roleId: role!.id,
            permissionId: permissionMap.get(name)!,
          }));

        await prisma.rolePermission.createMany({
          data: rolePermissions,
          skipDuplicates: true,
        });

        console.log(
          `成功為角色 ${roleName} 設置了 ${rolePermissions.length} 個默認權限`
        );
      }
    } catch (error) {
      console.error('初始化角色權限失敗:', error);
      throw error;
    }
  },

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
      const defaultRolePermissions: Record<string, string[]> = {
        [UserRole.ADMIN]: Object.values(Permission),
        [UserRole.MANAGER]: [
          Permission.VIEW_TICKETS,
          Permission.CREATE_TICKETS,
          Permission.EDIT_TICKETS,
          Permission.ASSIGN_TICKETS,
          Permission.VERIFY_TICKETS,
          Permission.VIEW_REPORTS,
          Permission.PROCESS_REPORTS,
          Permission.REVIEW_REPORTS,
          Permission.VIEW_USERS,
        ],
        [UserRole.REPORT_PROCESSOR]: [
          Permission.VIEW_TICKETS,
          Permission.CREATE_TICKETS,
          Permission.EDIT_TICKETS,
          Permission.ASSIGN_TICKETS,
          Permission.VIEW_REPORTS,
          Permission.CREATE_REPORTS,
          Permission.PROCESS_REPORTS,
        ],
        [UserRole.REPORT_REVIEWER]: [
          Permission.VIEW_TICKETS,
          Permission.VIEW_REPORTS,
          Permission.REVIEW_REPORTS,
          Permission.VERIFY_TICKETS,
        ],
        [UserRole.MAINTENANCE_WORKER]: [
          Permission.VIEW_TICKETS,
          Permission.CLAIM_TICKETS,
          Permission.COMPLETE_TICKETS,
        ],
        [UserRole.CUSTOMER_SERVICE]: [
          Permission.VIEW_TICKETS,
          Permission.CREATE_TICKETS,
          Permission.VIEW_REPORTS,
          Permission.CREATE_REPORTS,
        ],
        [UserRole.USER]: [Permission.VIEW_TICKETS, Permission.CREATE_REPORTS],
      };

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
