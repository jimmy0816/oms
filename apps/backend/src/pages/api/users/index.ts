import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { User, UserRole } from 'shared-types';
import { applyCors } from '../../../utils/cors';

/**
 * 用戶 API 處理程序
 * 處理 GET 和 POST 請求
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 應用 CORS 中間件
  await applyCors(req, res);
  
  switch (req.method) {
    case 'GET':
      return getUsers(req, res);
    case 'POST':
      return createUser(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

/**
 * 獲取用戶列表
 */
async function getUsers(req: NextApiRequest, res: NextApiResponse) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    
    // 模擬額外角色的數據
    // 在實際實現中，這將從 userRoles 關聯表中獲取
    const usersWithRoles = users.map(user => {
      // 隨機模擬一些用戶有額外角色
      const hasAdditionalRoles = Math.random() > 0.5;
      let additionalRoles: string[] = [];
      
      if (hasAdditionalRoles) {
        // 隨機選擇 1-2 個額外角色
        const allRoles = Object.values(UserRole).filter(role => role !== user.role);
        const numAdditionalRoles = Math.floor(Math.random() * 2) + 1;
        additionalRoles = allRoles
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.min(numAdditionalRoles, allRoles.length));
      }
      
      return {
        ...user,
        additionalRoles
      };
    });
    
    return res.status(200).json(usersWithRoles);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

/**
 * 創建新用戶
 */
async function createUser(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { email, name, role = UserRole.USER, password = '' } = req.body;
    
    // 驗證必要字段
    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }
    
    // 檢查郵箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    
    // 創建新用戶
    // 目前只支援儲存主要角色，額外角色將在用戶創建後透過另一個 API 呼叫更新
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        role: role as string,
        // 在實際將來的實現中，應該將密碼加密後儲存
        // 目前只是模擬創建用戶的功能
        password: password || 'default_password'
      }
    });
    
    // 返回包含空額外角色陣列的用戶對象
    // 這樣前端可以一致地處理用戶對象
    const userWithAdditionalRoles = {
      ...newUser,
      additionalRoles: []
    };
    
    return res.status(201).json(userWithAdditionalRoles);
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ error: 'Failed to create user' });
  }
}
