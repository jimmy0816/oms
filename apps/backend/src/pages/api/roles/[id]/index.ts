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
      return getRole(req, res, id);
    case 'PUT':
      return updateRole(req, res, id);
    // 刪除功能目前先不實作
    // case 'DELETE':
    //   return deleteRole(req, res, id);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res
        .status(405)
        .json({ message: `Method ${req.method} Not Allowed` });
  }
}

/**
 * Fetches a single role by ID.
 */
async function getRole(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  id: string
) {
  try {
    const role = await prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    return res.status(200).json(role);
  } catch (error) {
    console.error(`Error fetching role ${id}:`, error);
    return res.status(500).json({ message: 'Failed to fetch role' });
  }
}

/**
 * Updates a role's name and/or description.
 */
async function updateRole(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  id: string
) {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Role name is required' });
    }

    // Check if another role with the same name already exists
    const existingRole = await prisma.role.findFirst({
      where: {
        name,
        id: { not: id },
      },
    });

    if (existingRole) {
      return res
        .status(409)
        .json({ message: 'Another role with this name already exists' });
    }

    const updatedRole = await prisma.role.update({
      where: { id },
      data: {
        name,
        description,
      },
    });

    return res.status(200).json(updatedRole);
  } catch (error) {
    console.error(`Error updating role ${id}:`, error);
    return res.status(500).json({ message: 'Failed to update role' });
  }
}

/**
 * Deletes a role.
 * 刪除功能目前先不實作
 */
async function deleteRole(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  id: string
) {
  try {
    // Check if the role is currently assigned to any users
    const userCount = await prisma.userRole.count({
      where: { roleId: id },
    });

    if (userCount > 0) {
      return res.status(409).json({
        message: `Cannot delete role as it is currently assigned to ${userCount} user(s).`,
      });
    }

    await prisma.role.delete({
      where: { id },
    });

    return res.status(204).end(); // No Content
  } catch (error) {
    console.error(`Error deleting role ${id}:`, error);
    return res.status(500).json({ message: 'Failed to delete role' });
  }
}

export default withPermission(Permission.MANAGE_ROLES)(handler);
