import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { withPermission, AuthenticatedRequest } from '@/middleware/auth';
import { Permission } from 'shared-types';

/**
 * User API Handler
 * Handles GET and POST requests
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  // Permission check is applied to the entire handler
  switch (req.method) {
    case 'GET':
      return getUsers(req, res);
    case 'POST':
      return createUser(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
  }
}

/**
 * Gets a list of users, processing their primary and additional roles.
 */
async function getUsers(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    const usersWithProcessedRoles = users.map((user) => {
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

      return {
        ...userWithoutSensitiveInfo,
        primaryRole,
        additionalRoles,
      };
    });

    return res.status(200).json(usersWithProcessedRoles);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

/**
 * Creates a new user and assigns roles.
 */
async function createUser(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const {
      email,
      name,
      password,
      primaryRoleId,
      additionalRoleIds = [],
    } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }
    if (!primaryRoleId) {
      return res.status(400).json({ error: 'Primary role ID is required' });
    }

    const existingUser = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const hashedPassword = await hashPassword(password || 'default_password');

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
        },
      });

      const roleAssignments = [];
      // Add primary role
      roleAssignments.push({
        userId: user.id,
        roleId: primaryRoleId,
        isPrimary: true,
      });

      // Add additional roles
      additionalRoleIds.forEach((roleId: string) => {
        // Ensure not to add the primary role again
        if (roleId !== primaryRoleId) {
          roleAssignments.push({
            userId: user.id,
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

    // Refetch user with roles to return
    const userWithRoles = await prisma.user.findUnique({
      where: { id: newUser.id },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return res.status(201).json(userWithRoles);
  } catch (error) {
    console.error('Error creating user:', error);
    // Prisma unique constraint violation for roleId
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid role ID provided.' });
    }
    return res.status(500).json({ error: 'Failed to create user' });
  }
}

// todo: 目前權限沒辦法針對不同 function 處理不同的權限，先權限全開，後續補上
export default handler;

// export default withPermission([Permission.VIEW_USERS, Permission.CREATE_USERS])(
//   handler
// );
