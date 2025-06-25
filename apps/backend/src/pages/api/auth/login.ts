import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyPassword, generateToken } from '@/lib/auth';
import { withApiHandler } from '@/lib/api-handler';

/**
 * 用戶登入 API
 * @param req 請求對象
 * @param res 響應對象
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允許 POST 請求
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: '方法不允許' });
    return;
  }

  try {
    const { email, password } = req.body;

    // 驗證請求數據
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: '請提供電子郵件和密碼',
      });
      return;
    }

    // 查找用戶
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // 用戶不存在
    if (!user) {
      res.status(401).json({
        success: false,
        error: '電子郵件或密碼不正確',
      });
      return;
    }

    // 驗證密碼
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: '電子郵件或密碼不正確',
      });
      return;
    }

    // 查詢用戶的額外角色
    const userRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: true },
    });

    const additionalRoles = userRoles.map(ur => ur.role.name);

    // 生成 JWT Token
    const { password: _, ...userWithoutPassword } = user;
    const token = generateToken(userWithoutPassword);

    // 返回用戶資訊和 Token
    res.status(200).json({
      success: true,
      data: {
        user: {
          ...userWithoutPassword,
          additionalRoles,
        },
        token,
      },
    });
  } catch (error) {
    console.error('登入失敗:', error);
    res.status(500).json({
      success: false,
      error: '登入過程中發生錯誤',
    });
  }
}

export default withApiHandler(handler);
