import { NextApiRequest, NextApiResponse } from 'next';
import { UserRole } from 'shared-types';
import { Permission } from '@/utils/permissions';
import { withPermission, AuthenticatedRequest } from '@/middleware/auth';
import { withApiHandler } from '@/lib/api-handler';
import { permissionService } from '@/services/permissionService';
import { applyCors } from '@/utils/cors';

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
async function resetRolePermission(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  role: UserRole
) {
  try {
    // 從數據庫重置角色權限為默認值
    await permissionService.resetRolePermissions(role);

    // 獲取重置後的權限
    const permissions = await permissionService.getRolePermissions(role);

    return res.status(200).json({
      message: '角色權限已重置為默認值',
      role,
      permissions,
    });
  } catch (error) {
    console.error(`Error resetting permissions for role ${role}:`, error);
    return res.status(500).json({ message: '重置角色權限失敗' });
  }
}

// 使用權限中間件保護 API
// todo: 這邊因為 withApiHandler 會包裝 req, res，所以會導致 withPermission 不能正常工作
// export default withApiHandler(withPermission(Permission.MANAGE_ROLES)(handler));
async function wrappedHandler(req: NextApiRequest, res: NextApiResponse) {
  await applyCors(req, res);
  return withPermission(Permission.MANAGE_ROLES)(handler)(req, res);
}
