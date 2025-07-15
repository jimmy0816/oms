import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { UserRole, Permission } from 'shared-types';

// 角色描述
const ROLE_DESCRIPTIONS: Record<string, string> = {
  [UserRole.ADMIN]: '系統管理員，擁有所有權限',
  [UserRole.USER]: '一般用戶，可以瀏覽和提交報告',
  [UserRole.MANAGER]: '管理者，可以管理用戶和查看報表',
  [UserRole.REPORT_PROCESSOR]: '通報處理者，負責處理通報',
  [UserRole.REPORT_REVIEWER]: '通報審核者，負責審核通報',
  [UserRole.CUSTOMER_SERVICE]: '客服人員，負責處理客戶問題',
  [UserRole.MAINTENANCE_WORKER]: '維修工務，負責處理維修工作',
};

/**
 * 用戶角色 API 處理程序
 * 獲取所有可用的用戶角色及其統計信息
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // 從數據庫獲取所有角色
    const roles = await prisma.role.findMany();

    // 獲取每個角色的用戶數量
    const roleCounts = await prisma.userRole.groupBy({
      by: ['roleId'],
      _count: {
        userId: true,
      },
    });

    // 將計數映射到角色上
    const roleCountMap = roleCounts.reduce(
      (map, item) => {
        map[item.roleId] = item._count.userId;
        return map;
      },
      {} as Record<string, number>
    );

    // 獲取主要角色的計數（從 user 表的 role 字段）
    const primaryRoleCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        id: true,
      },
    });

    // 將主要角色計數映射到角色名稱
    const primaryRoleCountMap = primaryRoleCounts.reduce(
      (map, item) => {
        map[item.role] = item._count.id;
        return map;
      },
      {} as Record<string, number>
    );

    // 合併角色信息和計數
    const rolesWithCounts = await Promise.all(
      roles.map(async (role) => {
        // 獲取該角色的所有權限（這裡假設有一個 rolePermissions 表）
        // 如果沒有實際的權限表，可以根據角色名稱分配預設權限
        let permissions: string[] = [];

        // 根據角色分配預設權限
        switch (role.name) {
          case UserRole.ADMIN:
            permissions = [
              'users.create',
              'users.read',
              'users.update',
              'users.delete',
            ];
            break;
          case UserRole.MANAGER:
            permissions = ['users.read', 'users.update'];
            break;
          case UserRole.STAFF:
          case UserRole.USER:
            permissions = ['users.read'];
            break;
          default:
            permissions = [];
        }

        // 合併 UserRole 表中的計數和 User 表中的主要角色計數
        const userRoleCount = roleCountMap[role.id] || 0;
        const primaryCount = primaryRoleCountMap[role.name] || 0;

        // 返回帶有計數和權限的角色
        return {
          ...role,
          permissions,
          count: userRoleCount + primaryCount,
        };
      })
    );

    return res.status(200).json({ roles: rolesWithCounts });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return res.status(500).json({ error: 'Failed to fetch roles' });
  }
}
