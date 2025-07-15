import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export const seedAdmin = async () => {
  const defaultAdmin = {
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    name: '系統管理員',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  };

  const hashedPassword = await hashPassword(defaultAdmin.password);

  try {
    const defaultUser = await prisma.$transaction(async (tx) => {
      // 1. 創建或更新用戶
      const user = await tx.user.upsert({
        where: { email: defaultAdmin.email },
        update: { password: hashedPassword },
        create: {
          email: defaultAdmin.email,
          name: defaultAdmin.name,
          password: hashedPassword,
          role: 'ADMIN',
        },
      });

      // 2. 創建或更新用戶角色關聯
      const userRole = await tx.role.findUnique({
        where: { name: 'ADMIN' },
      });

      if (!userRole) {
        throw new Error('找不到 ADMIN 角色');
      }

      await tx.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: userRole.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: userRole.id,
        },
      });

      return user;
    });

    const { password: _, ...adminWithoutPassword } = defaultUser;

    console.log('管理員用戶已創建或更新', adminWithoutPassword);
  } catch (error) {
    console.error('創建管理員用戶時出錯:', error);
  }
};
