import { NextApiResponse } from 'next';
import { UserRole } from 'shared-types';
import { Permission, ROLE_PERMISSIONS } from '../../../utils/permissions';
import { withPermission, AuthenticatedRequest } from '../../../middleware/auth';
import { applyCors } from '../../../utils/cors';

// 模擬數據存儲
let customRolePermissions: Record<string, Permission[]> = {};

/**
 * 特定角色權限管理 API
 * GET: 獲取特定角色的權限
 * PUT: 更新特定角色的權限
 * DELETE: 重置特定角色的權限為默認值
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { role } = req.query;
  
  if (!role || !Object.values(UserRole).includes(role as UserRole)) {
    return res.status(400).json({ message: '無效的角色' });
  }
  
  switch (req.method) {
    case 'GET':
      return getRolePermission(req, res, role as UserRole);
    case 'PUT':
      return updateRolePermission(req, res, role as UserRole);
    case 'DELETE':
      return resetRolePermission(req, res, role as UserRole);
    default:
      return res.status(405).json({ message: '方法不允許' });
  }
}

/**
 * 獲取特定角色的權限
 */
async function getRolePermission(req: AuthenticatedRequest, res: NextApiResponse, role: UserRole) {
  try {
    // 在實際應用中，這裡應該從數據庫獲取角色權限數據
    const defaultPermissions = ROLE_PERMISSIONS[role] || [];
    const customPermissions = customRolePermissions[role] || [];
    
    // 合併默認權限和自定義權限
    const uniquePermissions = Array.from(new Set([...defaultPermissions, ...customPermissions]));
    const permissions = uniquePermissions as Permission[];
    
    return res.status(200).json({ 
      role,
      permissions
    });
  } catch (error) {
    console.error(`Error fetching permissions for role ${role}:`, error);
    return res.status(500).json({ message: '獲取角色權限失敗' });
  }
}

/**
 * 更新特定角色的權限
 */
async function updateRolePermission(req: AuthenticatedRequest, res: NextApiResponse, role: UserRole) {
  try {
    const { permissions } = req.body;
    
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: '無效的請求數據' });
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
    console.error(`Error updating permissions for role ${role}:`, error);
    return res.status(500).json({ message: '更新角色權限失敗' });
  }
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

// 先應用 CORS 中間件，再應用權限中間件
export default async function wrappedHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  await applyCors(req, res);
  return withPermission(Permission.MANAGE_ROLES)(handler)(req, res);
}
