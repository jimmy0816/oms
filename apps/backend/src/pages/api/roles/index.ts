import { NextApiRequest, NextApiResponse } from 'next';
import { UserRole } from 'shared-types';
import { Permission } from '../../../utils/permissions';
import { withPermission, AuthenticatedRequest } from '../../../middleware/auth';

// 模擬數據存儲
let customRolePermissions: Record<string, Permission[]> = {};

/**
 * 角色權限管理 API
 * GET: 獲取所有角色及其權限
 * POST: 更新角色權限
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return getRolePermissions(req, res);
    case 'POST':
      return updateRolePermissions(req, res);
    default:
      return res.status(405).json({ message: '方法不允許' });
  }
}

/**
 * 獲取所有角色及其權限
 */
async function getRolePermissions(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    // 在實際應用中，這裡應該從數據庫獲取角色權限數據
    const rolePermissions: Record<string, Permission[]> = {};
    
    // 合併默認權限和自定義權限
    Object.values(UserRole).forEach(role => {
      rolePermissions[role] = customRolePermissions[role] || [];
    });
    
    return res.status(200).json({ rolePermissions });
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    return res.status(500).json({ message: '獲取角色權限失敗' });
  }
}

/**
 * 更新角色權限
 */
async function updateRolePermissions(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { role, permissions } = req.body;
    
    if (!role || !Array.isArray(permissions)) {
      return res.status(400).json({ message: '無效的請求數據' });
    }
    
    if (!Object.values(UserRole).includes(role as UserRole)) {
      return res.status(400).json({ message: '無效的角色' });
    }
    
    // 驗證所有權限是否有效
    const validPermissions = permissions.every(p => 
      Object.values(Permission).includes(p as Permission)
    );
    
    if (!validPermissions) {
      return res.status(400).json({ message: '包含無效的權限' });
    }
    
    // 在實際應用中，這裡應該將更新保存到數據庫
    customRolePermissions[role] = permissions as Permission[];
    
    return res.status(200).json({ 
      message: '角色權限已更新',
      role,
      permissions: customRolePermissions[role]
    });
  } catch (error) {
    console.error('Error updating role permissions:', error);
    return res.status(500).json({ message: '更新角色權限失敗' });
  }
}

// 使用權限中間件保護 API
export default withPermission(Permission.MANAGE_ROLES)(handler);
