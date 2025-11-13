import { NextApiRequest, NextApiResponse } from 'next';
import { Permission } from 'shared-types';
import { withPermission, AuthenticatedRequest } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';

/**
 * Roles API
 * GET: Fetches all roles.
 * POST: Creates a new role.
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return getRoles(req, res);
    case 'POST':
      return createRole(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res
        .status(405)
        .json({ message: `Method ${req.method} Not Allowed` });
  }
}

/**
 * Fetches all roles from the database.
 */
async function getRoles(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const roles = await prisma.role.findMany({
      include: {
        _count: {
          select: { userRoles: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const rolesWithUserCount = roles.map(({ _count, ...role }) => ({
      ...role,
      userCount: _count.userRoles,
    }));

    return res.status(200).json({ roles: rolesWithUserCount });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return res.status(500).json({ message: 'Failed to fetch roles' });
  }
}

/**
 * Creates a new role.
 */
async function createRole(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Role name is required' });
    }

    const existingRole = await prisma.role.findUnique({ where: { name } });
    if (existingRole) {
      return res
        .status(409)
        .json({ message: 'Role with this name already exists' });
    }

    const newRole = await prisma.role.create({
      data: {
        name,
        description,
      },
    });

    return res.status(201).json(newRole);
  } catch (error) {
    console.error('Error creating role:', error);
    return res.status(500).json({ message: 'Failed to create role' });
  }
}

// todo: 目前權限沒辦法針對不同 function 處理不同的權限，先權限全開，後續補上
export default handler;
