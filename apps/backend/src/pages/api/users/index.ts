import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { User, UserRole } from 'shared-types';
import { hashPassword } from '@/lib/auth';

/**
 * 用戶 API 處理程序
 * 處理 GET 和 POST 請求
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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
 * 獲取用戶列表
 */
async function getUsers(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { role } = req.query;

    // 構建查詢條件
    const where: any = role ? { role: role as string } : {};
    where.deletedAt = null;

    // 查詢用戶
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // 獲取所有用戶的角色關聯
    const userIds = users.map((user) => user.id);
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId: { in: userIds },
      },
      include: {
        role: true,
      },
    });

    // 將用戶角色關聯按用戶ID分組
    const userRoleMap: Record<string, string[]> = {};

    // 將用戶角色關聯按用戶ID分組，但存儲角色名稱而不是ID
    userRoles.forEach((userRole) => {
      if (!userRoleMap[userRole.userId]) {
        userRoleMap[userRole.userId] = [];
      }
      userRoleMap[userRole.userId].push(userRole.role.name);
    });

    // 將額外角色添加到用戶对象中
    const usersWithRoles = users.map((user) => {
      const additionalRoles = userRoleMap[user.id] || [];
      // 如果主要角色在額外角色中，則移除它
      const filteredRoles = additionalRoles.filter(
        (roleName) => roleName !== user.role
      );

      // 删除密码字段，不返回给前端
      // @ts-ignore - 忽略密碼字段可能不存在的警告
      const { password: pwd, ...userWithoutPassword } = user;

      return {
        ...userWithoutPassword,
        additionalRoles: filteredRoles,
      };
    });

    return res.status(200).json(usersWithRoles);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

/**
 * 創建新用戶
 */
async function createUser(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { email, name, role = UserRole.USER, password = '' } = req.body;

    // 驗證必要字段
    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    // 檢查郵箱是否已存在
    const existingUser = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // 加密密碼
    const defaultPassword = 'default_password';
    const passwordToHash = password || defaultPassword;
    const hashedPassword = await hashPassword(passwordToHash);

    console.log(
      `Creating user with email: ${email}, role: ${role}, password is hashed: ${!!hashedPassword}`
    );

    // 創建新用戶和角色關聯
    const newUser = await prisma.$transaction(async (tx) => {
      // 1. 創建用戶
      const user = await tx.user.create({
        data: {
          email,
          name,
          role: role as string,
          // 使用加密後的密碼
          password: hashedPassword,
        },
      });

      // 2. 先檢查角色是否存在，如果不存在則創建
      let roleRecord = await tx.role.findUnique({
        where: { name: role as string },
      });

      if (!roleRecord) {
        // 如果角色不存在，創建一個新角色
        roleRecord = await tx.role.create({
          data: {
            name: role as string,
            description: `${role} role`,
          },
        });
      }

      // 3. 創建用戶角色關聯
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: roleRecord.id, // 使用角色記錄的 ID
        },
      });

      return user;
    });

    // 獲取用戶的所有角色關聯
    const userRoles = await prisma.userRole.findMany({
      where: { userId: newUser.id },
      include: { role: true },
    });

    // 返回包含角色的用戶对象
    const userWithAdditionalRoles = {
      ...newUser,
      additionalRoles: userRoles.map((ur) => ur.role.name),
    };

    // 刪除密碼字段，不返回給前端
    // @ts-ignore - 忽略密碼字段可能不存在的警告
    const { password: pwd, ...userWithoutPassword } = userWithAdditionalRoles;

    return res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ error: 'Failed to create user' });
  }
}
