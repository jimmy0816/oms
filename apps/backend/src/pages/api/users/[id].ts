import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withPermission, AuthenticatedRequest } from '@/middleware/auth';
import { Permission } from 'shared-types';

/**
 * Single User API Handler
 * Handles GET, PUT, and DELETE requests
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  switch (req.method) {
    case 'GET':
      return getUser(req, res, id);
    case 'PUT':
      return updateUser(req, res, id);
    case 'DELETE':
      return deleteUser(req, res, id);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

/**
 * Gets a single user and processes their roles.
 */
async function getUser(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let primaryRole: any = null;
    const additionalRoles: any[] = [];
    user.userRoles.forEach((userRole) => {
      if (userRole.isPrimary) {
        primaryRole = userRole.role;
      } else {
        additionalRoles.push(userRole.role);
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, userRoles, ...userWithoutSensitiveInfo } = user;

    return res.status(200).json({
      ...userWithoutSensitiveInfo,
      primaryRole,
      additionalRoles,
    });
  } catch (error) {
    console.error(`Error fetching user with ID ${id}:`, error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
}

/**
 * Updates a user's details and role assignments.
 */
async function updateUser(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const { email, name, primaryRoleId, additionalRoleIds = [] } = req.body;

    if (!primaryRoleId) {
      return res.status(400).json({ error: 'Primary role ID is required' });
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. Update user's personal info
      const user = await tx.user.update({
        where: { id },
        data: {
          ...(email && { email }),
          ...(name && { name }),
        },
      });

      // 2. Delete all existing role assignments for this user
      await tx.userRole.deleteMany({
        where: { userId: id },
      });

      // 3. Create new role assignments
      const roleAssignments = [];
      roleAssignments.push({
        userId: id,
        roleId: primaryRoleId,
        isPrimary: true,
      });
      additionalRoleIds.forEach((roleId: string) => {
        if (roleId !== primaryRoleId) {
          roleAssignments.push({
            userId: id,
            roleId: roleId,
            isPrimary: false,
          });
        }
      });

      await tx.userRole.createMany({
        data: roleAssignments,
      });

      return user;
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error(`Error updating user with ID ${id}:`, error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid role ID provided.' });
    }
    return res.status(500).json({ error: 'Failed to update user' });
  }
}

/**
 * Soft-deletes a user.
 */
async function deleteUser(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        email: `${existingUser.email}#DELETED_${Date.now()}`,
      },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(`Error deleting user with ID ${id}:`, error);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
}

export default withPermission([
  Permission.VIEW_USERS,
  Permission.EDIT_USERS,
  Permission.DELETE_USERS,
])(handler);
