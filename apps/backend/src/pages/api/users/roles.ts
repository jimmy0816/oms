import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { UserRole, Permission } from 'shared-types';
import { ROLE_PERMISSIONS } from '../../../utils/permissions';
import { applyCors } from '../../../utils/cors';

// 角色描述
const ROLE_DESCRIPTIONS: Record<string, string> = {
  [UserRole.ADMIN]: '系統管理員，擁有所有權限',
  [UserRole.USER]: '一般用戶，可以瀏覽和提交報告',
  [UserRole.MANAGER]: '管理者，可以管理用戶和查看報表',
  [UserRole.REPORT_PROCESSOR]: '通報處理者，負責處理通報',
  [UserRole.REPORT_REVIEWER]: '通報審核者，負責審核通報',
  [UserRole.CUSTOMER_SERVICE]: '客服人員，負責處理客戶問題',
  [UserRole.MAINTENANCE_WORKER]: '維修工務，負責處理維修工作'
};

/**
 * 用戶角色 API 處理程序
 * 獲取所有可用的用戶角色及其統計信息
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 應用 CORS 中間件
  await applyCors(req, res);
  
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
  
  try {
    // 獲取所有用戶
    const users = await prisma.user.findMany();
    
    // 計算每個角色的用戶數量並添加描述和權限
    const roles = Object.values(UserRole).map(role => {
      const count = users.filter(user => user.role === role).length;
      const permissions = ROLE_PERMISSIONS[role as UserRole] || [];
      return { 
        id: role,
        name: role,
        description: ROLE_DESCRIPTIONS[role] || `${role} 角色`,
        count,
        permissions
      };
    });
    
    return res.status(200).json({ roles });
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return res.status(500).json({ error: 'Failed to fetch user roles' });
  }
}
