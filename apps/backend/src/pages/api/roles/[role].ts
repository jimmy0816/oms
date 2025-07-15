import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { Permission, ROLE_PERMISSIONS } from 'shared-types';
import { withPermission } from '@/middleware/auth';

// 取得角色所有權限
async function getRolePermissions(role: string) {
  const roleRecord = await prisma.role.findUnique({
    where: { name: role },
    select: { id: true },
  });
  if (!roleRecord) return [];
  const rolePermissions = await prisma.rolePermission.findMany({
    where: { roleId: roleRecord.id },
    include: { permission: { select: { name: true } } },
  });
  return rolePermissions.map((rp) => rp.permission.name);
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { role } = req.query;
  if (!role || typeof role !== 'string') {
    return res.status(400).json({ message: 'roles無效的角色' });
  }

  switch (req.method) {
    case 'GET': {
      // 查詢角色權限
      const permissions = await getRolePermissions(role);
      return res.status(200).json({ role, permissions });
    }
    case 'PUT': {
      // 更新角色權限
      const { permissions } = req.body;
      if (!Array.isArray(permissions)) {
        return res.status(400).json({ message: '無效的請求數據' });
      }
      // 先刪除舊的
      const roleRecord = await prisma.role.findUnique({
        where: { name: role },
      });
      if (!roleRecord) return res.status(404).json({ message: '角色不存在' });
      await prisma.rolePermission.deleteMany({
        where: { roleId: roleRecord.id },
      });
      // 新增新的
      for (const permName of permissions) {
        const perm = await prisma.permission.findUnique({
          where: { name: permName },
        });
        if (perm) {
          await prisma.rolePermission.create({
            data: {
              roleId: roleRecord.id,
              permissionId: perm.id,
            },
          });
        }
      }
      const newPermissions = await getRolePermissions(role);
      return res
        .status(200)
        .json({ message: '角色權限已更新', role, permissions: newPermissions });
    }
    case 'POST': {
      // 重置角色權限為預設值
      if (!req.url?.endsWith('/reset')) {
        return res.status(405).json({ message: '方法不允許' });
      }
      const roleRecord = await prisma.role.findUnique({
        where: { name: role },
      });
      if (!roleRecord) return res.status(404).json({ message: '角色不存在' });
      await prisma.rolePermission.deleteMany({
        where: { roleId: roleRecord.id },
      });
      const defaultPermissions = ROLE_PERMISSIONS[role] || [];
      for (const permName of defaultPermissions) {
        const perm = await prisma.permission.findUnique({
          where: { name: permName },
        });
        if (perm) {
          await prisma.rolePermission.create({
            data: {
              roleId: roleRecord.id,
              permissionId: perm.id,
            },
          });
        }
      }
      const resetPermissions = await getRolePermissions(role);
      return res.status(200).json({
        message: '角色權限已重置為預設值',
        role,
        permissions: resetPermissions,
      });
    }
    default:
      return res.status(405).json({ message: '方法不允許' });
  }
}

// 權限驗證：只有 manage_roles 權限可操作
async function wrappedHandler(req: NextApiRequest, res: NextApiResponse) {
  return withPermission(Permission.MANAGE_ROLES)(handler)(req, res);
}

export default wrappedHandler;
