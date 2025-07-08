import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { Permission } from 'shared-types';
import { hasPermission } from '../../../../utils/permissions';
import { applyCors } from '../../../../utils/cors';

/**
 * 用戶角色 API 處理程序
 * 用於獲取和更新特定用戶的角色
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  
  
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  
  try {
    // 檢查用戶是否存在
    const user = await prisma.user.findUnique({
      where: { id },
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // 根據請求方法處理不同操作
    switch (req.method) {
      case 'GET':
        return getUserRoles(req, res, id);
      case 'PUT':
        return updateUserRoles(req, res, id);
      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error(`Error handling user roles for user ${id}:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * 獲取用戶角色
 */
async function getUserRoles(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    // 查詢用戶的主要角色
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
      },
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // 查詢用戶的所有角色關聯
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: { role: true }
    });
    
    // 將所有角色名稱收集到一個數組中
    const roleNames = userRoles.map(ur => ur.role.name);
    
    // 確保主要角色也包含在列表中
    if (!roleNames.includes(user.role)) {
      roleNames.push(user.role);
    }
    
    return res.status(200).json({ roles: roleNames });
  } catch (error) {
    console.error(`Error fetching roles for user ${userId}:`, error);
    return res.status(500).json({ error: 'Failed to fetch user roles' });
  }
}

/**
 * 更新用戶角色
 */
async function updateUserRoles(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const { roleIds } = req.body;
    
    if (!roleIds || !Array.isArray(roleIds) || roleIds.length === 0) {
      return res.status(400).json({ error: 'Invalid role IDs' });
    }
    
    // 使用第一個角色名稱作為主要角色
    const primaryRoleName = roleIds[0];
    
    // 開始一個事務以確保數據一致性
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. 更新用戶的主要角色
      const user = await tx.user.update({
        where: { id: userId },
        data: { role: primaryRoleName },
      });
      
      // 2. 刪除用戶現有的所有角色關聯
      await tx.userRole.deleteMany({
        where: { userId }
      });
      
      // 3. 為每個角色名稱找到或創建角色記錄，然後創建關聯
      for (const roleName of roleIds) {
        // 根據角色名稱查找角色
        let role = await tx.role.findUnique({
          where: { name: roleName }
        });
        
        // 如果角色不存在，則創建新角色
        if (!role) {
          role = await tx.role.create({
            data: {
              name: roleName,
              description: `${roleName} role`
            }
          });
        }
        
        // 創建用戶與角色的關聯
        await tx.userRole.create({
          data: {
            userId,
            roleId: role.id
          }
        });
      }
      
      return user;
    });
    
    // 獲取用戶的所有角色關聯
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: { role: true }
    });
    
    // 提取角色名稱列表作為額外角色
    const additionalRoles = userRoles.map(ur => ur.role.name);
    
    // 返回擴展的用戶對象，包含額外角色
    const userWithAdditionalRoles = {
      ...updatedUser,
      additionalRoles
    };
    
    return res.status(200).json(userWithAdditionalRoles);
  } catch (error) {
    console.error(`Error updating roles for user ${userId}:`, error);
    return res.status(500).json({ error: 'Failed to update user roles' });
  }
}
