import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { UserRole } from 'shared-types';
import { withApiHandler } from '@/lib/api-handler';

/**
 * 用戶角色 API 處理程序
 * 獲取所有可用的用戶角色及其統計信息
 */
export default withApiHandler(async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // 獲取所有用戶
    const users = await prisma.user.findMany();

    // 計算每個角色的用戶數量
    const roleCounts = Object.values(UserRole).map((role) => {
      const count = users.filter((user) => user.role === role).length;
      return { role, count };
    });

    return res.status(200).json(roleCounts);
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return res.status(500).json({ error: 'Failed to fetch user roles' });
  }
});
