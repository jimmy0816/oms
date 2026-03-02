import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { seedBitbucketBotUser } from '@/lib/bot-user';

export const seedBotUser = async () => {
  try {
    const botUser = await seedBitbucketBotUser();
    console.log('✅ Bitbucket Bot 用戶已創建或更新', botUser);
    return botUser;
  } catch (error) {
    console.error('❌ 創建 Bitbucket Bot 用戶時出錯:', error);
    throw error;
  }
};

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
        },
      });

      // 2. 獲取或創建系統管理員角色
      const adminRole = await tx.role.upsert({
        where: { name: 'ADMIN' },
        update: {},
        create: {
          name: 'ADMIN',
          description: '系統管理員',
        },
      });

      // 3. 綁定用戶到系統管理員角色
      await tx.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: adminRole.id,
          },
        },
        update: { isPrimary: true },
        create: {
          userId: user.id,
          roleId: adminRole.id,
          isPrimary: true,
        },
      });

      // 4. 獲取所有權限
      const allPermissions = await tx.permission.findMany();

      console.log(`找到 ${allPermissions.length} 個權限，準備綁定到 ADMIN 角色`);

      // 5. 將所有權限綁定到系統管理員角色
      for (const permission of allPermissions) {
        await tx.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: adminRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        });
      }

      console.log(`已為 ADMIN 角色綁定 ${allPermissions.length} 個權限`);

      return user;
    });

    const { password: _, ...adminWithoutPassword } = defaultUser;

    console.log('✅ 管理員用戶已創建或更新', adminWithoutPassword);
    console.log('✅ 已綁定到系統管理員角色');
    console.log('✅ 系統管理員角色已擁有所有權限');

    await seedBotUser();
  } catch (error) {
    console.error('❌ 創建管理員用戶時出錯:', error);
    throw error;
  }
};
