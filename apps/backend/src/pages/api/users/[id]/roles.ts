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
  // 應用 CORS 中間件
  await applyCors(req, res);
  
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
    
    // 由於目前系統使用單一角色欄位，我們將其作為陣列返回
    // 未來若遷移到多對多關聯，可以從 userRoles 關聯表中獲取
    const roles = [user.role];
    
    return res.status(200).json({ roles });
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
    
    // 由於目前系統使用單一角色欄位，我們僅使用第一個角色進行更新
    // 未來若遷移到多對多關聯，可以使用 connect/disconnect 操作更新關聯表
    const primaryRole = roleIds[0];
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: primaryRole },
    });
    
    // 將額外角色作為響應的一部分返回，即使目前沒有實際儲存
    // 這樣前端可以顯示這些角色，直到我們實現完整的多角色支援
    const additionalRoles = roleIds.length > 1 ? roleIds.slice(1) : [];
    
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
