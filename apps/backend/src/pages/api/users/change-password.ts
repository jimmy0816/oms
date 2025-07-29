import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { NextApiResponse } from 'next';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const user = req.user; // Get user from authenticated request

  if (!user || !user.email) {
    return res.status(401).json({ message: '未經授權' });
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: '請提供當前密碼和新密碼' });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: user.email as string },
    });

    if (!existingUser) {
      return res.status(404).json({ message: '找不到用戶' });
    }

    // 驗證當前密碼
    const isValid = await verifyPassword(
      currentPassword,
      existingUser.password
    );
    if (!isValid) {
      return res.status(401).json({ message: '當前密碼不正確' });
    }

    // 加密新密碼
    const hashedNewPassword = await hashPassword(newPassword);

    // 更新密碼
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        password: hashedNewPassword,
      },
    });

    return res.status(200).json({ message: '密碼已成功更改' });
  } catch (error) {
    console.error('更改密碼時發生錯誤:', error);
    return res.status(500).json({ message: '更改密碼失敗' });
  }
};

export default withAuth(handler);
