import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { UserRole, Permission } from 'shared-types';
import { withApiHandler } from '@/lib/api-handler';

// Define ROLE_PERMISSIONS using the correct Permission enum values
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  [UserRole.ADMIN]: [Permission.VIEW_TICKETS, Permission.CREATE_TICKETS, Permission.EDIT_TICKETS, Permission.DELETE_TICKETS, 
                     Permission.ASSIGN_TICKETS, Permission.MANAGE_ROLES, Permission.ASSIGN_PERMISSIONS],
  [UserRole.USER]: [Permission.VIEW_REPORTS, Permission.CREATE_REPORTS],
  [UserRole.MANAGER]: [Permission.VIEW_USERS, Permission.EDIT_USERS, Permission.VIEW_REPORTS, Permission.ASSIGN_TICKETS],
  [UserRole.REPORT_PROCESSOR]: [Permission.VIEW_REPORTS, Permission.PROCESS_REPORTS],
  [UserRole.REPORT_REVIEWER]: [Permission.VIEW_REPORTS, Permission.REVIEW_REPORTS],
  [UserRole.CUSTOMER_SERVICE]: [Permission.VIEW_REPORTS, Permission.VIEW_TICKETS],
  [UserRole.MAINTENANCE_WORKER]: [Permission.VIEW_REPORTS, Permission.CLAIM_TICKETS, Permission.COMPLETE_TICKETS]
};

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
});
