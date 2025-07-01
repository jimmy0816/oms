import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/auth';

async function createAdminUser() {
  try {
    // 檢查是否已存在管理員用戶
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@example.com' }
    });

    if (existingAdmin) {
      console.log('管理員用戶已存在，更新密碼...');
      
      // 更新現有管理員密碼
      const hashedPassword = await hashPassword('admin123');
      await prisma.user.update({
        where: { email: 'admin@example.com' },
        data: { password: hashedPassword }
      });
      
      console.log('管理員密碼已更新');
    } else {
      console.log('創建新管理員用戶...');
      
      // 創建新管理員用戶
      const hashedPassword = await hashPassword('admin123');
      const admin = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          name: '系統管理員',
          password: hashedPassword,
          role: 'ADMIN'
        }
      });
      
      console.log('管理員用戶已創建:', admin.id);
    }
    
    console.log('完成！');
  } catch (error) {
    console.error('創建管理員用戶時出錯:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
