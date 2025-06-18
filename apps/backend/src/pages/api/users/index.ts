import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { User, UserRole } from 'shared-types';

/**
 * 用戶 API 處理程序
 * 處理 GET 和 POST 請求
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
 * 支持按角色過濾
 */
async function getUsers(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { role } = req.query;
    
    // 構建查詢條件
    const where = role ? { role: role as string } : {};
    
    // 查詢用戶
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    
    return res.status(200).json(users);
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
    const { email, name, role = UserRole.USER } = req.body;
    
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
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        role: role as string
      }
    });
    
    return res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ error: 'Failed to create user' });
  }
}
