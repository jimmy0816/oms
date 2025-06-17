import { NextApiResponse } from 'next';
import { UserRole } from 'shared-types';
import { Permission, ROLE_PERMISSIONS } from '../../../../utils/permissions';
import { withPermission, AuthenticatedRequest } from '../../../../middleware/auth';

// 模擬數據存儲 (實際應用中應該使用數據庫)
// 這裡我們需要從 [role].ts 共享數據，但為了簡化，我們重新定義
let customRolePermissions: Record<string, Permission[]> = {};

/**
 * 重置角色權限 API
 * POST: 重置特定角色的權限為默認值
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { role } = req.query;
  
  if (!role || !Object.values(UserRole).includes(role as UserRole)) {
    return res.status(400).json({ message: '無效的角色' });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '方法不允許' });
  }
  
  return resetRolePermission(req, res, role as UserRole);
}

/**
 * 重置特定角色的權限為默認值
 */
async function resetRolePermission(req: AuthenticatedRequest, res: NextApiResponse, role: UserRole) {
  try {
    // 在實際應用中，這裡應該從數據庫刪除自定義權限
    if (customRolePermissions[role]) {
      delete customRolePermissions[role];
    }
    
    return res.status(200).json({ 
      message: '角色權限已重置為默認值',
      role,
      permissions: ROLE_PERMISSIONS[role] || []
    });
  } catch (error) {
    console.error(`Error resetting permissions for role ${role}:`, error);
    return res.status(500).json({ message: '重置角色權限失敗' });
  }
}

// 使用權限中間件保護 API
export default withPermission(Permission.MANAGE_ROLES)(handler);
