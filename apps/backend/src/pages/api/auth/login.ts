import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyPassword, generateToken, hashPassword } from '@/lib/auth';
import { withApiHandler } from '@/lib/api-handler';

// 輸出環境變數以便調試
console.log('Login API - DATABASE_URL:', process.env.DATABASE_URL);

// 預設管理員帳號資訊
const DEFAULT_ADMIN = {
  email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com',
  password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
};

console.log('DEFAULT_ADMIN_EMAIL:', process.env.DEFAULT_ADMIN_EMAIL);
console.log('DEFAULT_ADMIN_PASSWORD:', process.env.DEFAULT_ADMIN_PASSWORD);

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
    
    // 輸出調試信息
    console.log('Login attempt:', { email });

    // 驗證請求數據
    if (!email || !password) {
      console.log('Missing email or password');
      res.status(400).json({
        success: false,
        error: '請提供電子郵件和密碼',
      });
      return;
    }

    // 查找用戶
    console.log('Finding user with email:', email);
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // 用戶不存在
    if (!user) {
      console.log('User not found with email:', email);
      
      // 檢查是否為預設管理員帳號
      const isDefaultAdmin = email === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password;
      
      if (isDefaultAdmin) {
        console.log('Default admin login attempt detected');
        
        // 檢查資料庫中是否有任何用戶
        const userCount = await prisma.user.count();
        
        // 如果資料庫中沒有任何用戶，則自動註冊預設管理員帳號
        if (userCount === 0) {
          console.log('No users in database, auto-registering default admin');
          
          // 加密密碼
          const hashedPassword = await hashPassword(password);
          
          // 創建預設管理員帳號
          const newAdmin = await prisma.user.create({
            data: {
              email,
              name: 'Default Admin',
              password: hashedPassword,
              role: 'ADMIN',
            },
          });
          
          console.log('Default admin created:', { id: newAdmin.id, email: newAdmin.email, role: newAdmin.role });
          
          // 生成 JWT Token
          const { password: _, ...adminWithoutPassword } = newAdmin;
          const token = generateToken(adminWithoutPassword);
          
          // 返回用戶資訊和 Token
          res.status(200).json({
            success: true,
            data: {
              user: {
                ...adminWithoutPassword,
                additionalRoles: [],
              },
              token,
            },
          });
          return;
        }
      }
      
      res.status(401).json({
        success: false,
        error: '電子郵件或密碼不正確',
      });
      return;
    }
    
    console.log('User found:', { id: user.id, email: user.email, role: user.role });

    // 驗證密碼
    console.log('Verifying password for user:', user.email);
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      console.log('Password verification failed for user:', user.email);
      res.status(401).json({
        success: false,
        error: '電子郵件或密碼不正確',
      });
      return;
    }
    
    console.log('Password verification successful for user:', user.email);

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
    // 輸出更詳細的錯誤信息以便調試
    console.error('Error details:', JSON.stringify(error, null, 2));
    res.status(500).json({
      success: false,
      error: '登入過程中發生錯誤',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

export default withApiHandler(handler);
