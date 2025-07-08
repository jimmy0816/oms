import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateToken } from '@/lib/auth';

// 預設管理員帳號資訊
const DEFAULT_ADMIN = {
  email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com',
  password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
};

// 輸出環境變數以便調試
console.log('DEFAULT_ADMIN_EMAIL:', process.env.DEFAULT_ADMIN_EMAIL);
console.log('DEFAULT_ADMIN_PASSWORD:', process.env.DEFAULT_ADMIN_PASSWORD);

/**
 * 用戶註冊 API
 * @param req 請求對象
 * @param res 響應對象
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允許 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: '方法不允許' });
  }

  try {
    const { email, name, password } = req.body;
    // 使用 let 而不是 const 以便後續可以修改
    let role = req.body.role || 'USER';

    // 驗證請求數據
    if (!email || !name || !password) {
      return res.status(400).json({
        success: false,
        error: '請提供電子郵件、姓名和密碼',
      });
    }

    // 檢查是否為預設管理員帳號
    const isDefaultAdmin =
      email === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password;

    // 輸出調試信息
    console.log('Registration attempt:', { email, role, isDefaultAdmin });
    console.log('DEFAULT_ADMIN:', DEFAULT_ADMIN);

    // 如果是預設管理員帳號，自動設置為 ADMIN 角色
    if (isDefaultAdmin) {
      console.log('Default admin detected, setting role to ADMIN');
      role = 'ADMIN';
    }

    // 如果嘗試註冊為管理員角色或是預設管理員帳號
    if (role === 'ADMIN' || isDefaultAdmin) {
      // 檢查是否已有管理員帳號
      const adminCount = await prisma.user.count({
        where: {
          OR: [
            { role: 'ADMIN' },
            {
              userRoles: {
                some: {
                  role: {
                    name: 'ADMIN',
                  },
                },
              },
            },
          ],
        },
      });

      // 如果已有管理員帳號，且不是預設管理員帳號，則拒絕註冊
      if (adminCount > 0 && !isDefaultAdmin) {
        return res.status(403).json({
          success: false,
          error: '已有管理員帳號存在，無法創建新的管理員帳號',
        });
      }

      // 如果有管理員帳號，且是預設管理員帳號，也拒絕註冊
      if (adminCount > 0 && isDefaultAdmin) {
        return res.status(403).json({
          success: false,
          error: '已有管理員帳號存在，無法使用預設管理員帳號',
        });
      }
    }

    // 檢查電子郵件是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: '此電子郵件已被註冊',
      });
    }

    // 加密密碼
    const hashedPassword = await hashPassword(password);

    // 創建新用戶
    console.log('Creating new user with role:', role);
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
      },
    });

    console.log('User created successfully:', {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    // 生成 JWT Token
    const { password: _, ...userWithoutPassword } = newUser;
    const token = generateToken(userWithoutPassword);

    // 返回用戶資訊和 Token
    return res.status(201).json({
      success: true,
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error) {
    console.error('註冊失敗:', error);
    // 輸出更詳細的錯誤信息以便調試
    console.error('Error details:', JSON.stringify(error, null, 2));
    return res.status(500).json({
      success: false,
      error: '註冊過程中發生錯誤',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

export default handler;
