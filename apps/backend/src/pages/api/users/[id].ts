import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { permissionService } from '@/services/permissionService';
import { Permission } from 'shared-types';
// import { getUserPermissions, Permission } from '@/utils/permissions';

/**
 * 單個用戶 API 處理程序
 * 處理 GET、PUT 和 DELETE 請求
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  switch (req.method) {
    case 'GET':
      return getUser(req, res, id);
    case 'PUT':
      return updateUser(req, res, id);
    case 'DELETE':
      return deleteUser(req, res, id);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
  }
}

/**
 * 獲取單個用戶
 */
async function getUser(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 查詢用戶的所有角色關聯
    const userRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: true },
    });
    const additionalRoles = userRoles.map((ur) => ur.role.name);

    // 合併主角色與額外角色的權限
    let permissions = new Set(
      await permissionService.getRolePermissions(user.role)
    );
    for (const roleName of additionalRoles) {
      (await permissionService.getRolePermissions(roleName)).forEach((p) =>
        permissions.add(p)
      );
    }
    const permissionsArr = Array.from(permissions).map((p) =>
      typeof p === 'string' ? p : (p as Permission)
    );

    return res.status(200).json({
      ...user,
      additionalRoles,
      permissions: permissionsArr,
    });
  } catch (error) {
    console.error(`Error fetching user with ID ${id}:`, error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
}

/**
 * 更新用戶
 */
async function updateUser(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  try {
    const { email, name, role } = req.body;

    // 檢查用戶是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 如果要更新郵箱，檢查是否與其他用戶衝突
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return res.status(409).json({ error: 'Email already exists' });
      }
    }

    // 更新用戶
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(email && { email }),
        ...(name && { name }),
        ...(role && { role }),
      },
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error(`Error updating user with ID ${id}:`, error);
    return res.status(500).json({ error: 'Failed to update user' });
  }
}

/**
 * 刪除用戶
 */
async function deleteUser(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  try {
    // 檢查用戶是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 刪除用戶
    await prisma.user.delete({
      where: { id },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(`Error deleting user with ID ${id}:`, error);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
}
