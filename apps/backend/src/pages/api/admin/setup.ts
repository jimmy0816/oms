import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

/**
 * 初始化管理員帳號
 * @param req 請求對象
 * @param res 響應對象
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允許 GET 請求
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: '方法不允許' });
  }

  try {
    // 檢查是否已存在管理員用戶
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@example.com' },
    });

    if (existingAdmin) {
      console.log('管理員用戶已存在，更新密碼...');

      // 更新現有管理員密碼
      const hashedPassword = await hashPassword('admin123');
      const updatedAdmin = await prisma.user.update({
        where: { email: 'admin@example.com' },
        data: { password: hashedPassword },
      });

      const { password: _, ...adminWithoutPassword } = updatedAdmin;
      return res.status(200).json({
        success: true,
        message: '管理員密碼已更新',
        user: adminWithoutPassword,
      });
    } else {
      console.log('創建新管理員用戶...');

      // 創建新管理員用戶
      const hashedPassword = await hashPassword('admin123');
      const admin = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          name: '系統管理員',
          password: hashedPassword,
          role: 'ADMIN',
        },
      });

      const { password: _, ...adminWithoutPassword } = admin;
      return res.status(200).json({
        success: true,
        message: '管理員用戶已創建',
        user: adminWithoutPassword,
      });
    }
  } catch (error) {
    console.error('創建管理員用戶時出錯:', error);
    return res.status(500).json({
      success: false,
      error: '創建管理員用戶時出錯',
    });
  }
}

export default handler;
