import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { Permission } from 'shared-types';
import { withPermission, AuthenticatedRequest } from '@/middleware/auth';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ message: 'Invalid role ID' });
  }

  switch (req.method) {
    case 'GET':
      return getRolePermissions(req, res, id);
    case 'PUT':
      return updateRolePermissions(req, res, id);
    default:
      res.setHeader('Allow', ['GET', 'PUT']);
      return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
}

/**
 * Fetches the permissions for a given role ID.
 */
async function getRolePermissions(req: AuthenticatedRequest, res: NextApiResponse, roleId: string) {
  try {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    const permissions = role.rolePermissions.map((rp) => rp.permission.name);
    return res.status(200).json({ permissions });
  } catch (error) {
    console.error(`Error fetching permissions for role ${roleId}:`, error);
    return res.status(500).json({ message: 'Failed to fetch role permissions' });
  }
}

/**
 * Updates the permissions for a given role ID.
 */
async function updateRolePermissions(req: AuthenticatedRequest, res: NextApiResponse, roleId: string) {
  try {
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Invalid request data: permissions must be an array.' });
    }

    const allPermissions = await prisma.permission.findMany({
      where: {
        name: { in: permissions },
      },
    });

    if (allPermissions.length !== permissions.length) {
      return res.status(400).json({ message: 'Invalid permissions provided.' });
    }

    const permissionIds = allPermissions.map((p) => p.id);

    // Use a transaction to ensure atomicity
    await prisma.$transaction([
      // Delete all existing permissions for the role
      prisma.rolePermission.deleteMany({
        where: { roleId },
      }),
      // Create the new permissions
      prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
      }),
    ]);

    return res.status(200).json({ message: 'Role permissions updated successfully.' });
  } catch (error) {
    console.error(`Error updating permissions for role ${roleId}:`, error);
    return res.status(500).json({ message: 'Failed to update role permissions' });
  }
}

export default withPermission(Permission.MANAGE_ROLES)(handler);
