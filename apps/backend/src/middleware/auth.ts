import { NextApiRequest, NextApiResponse } from 'next';
import { UserRole } from 'shared-types';
import { Permission } from '../utils/permissions';
import { hasPermission } from '../utils/permissions';
import jwt from 'jsonwebtoken';
import { als } from '@/lib/als';

// 定義擴展的請求類型，包含用戶信息
export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
}

type NextApiHandler = (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => Promise<void> | void;

/**
 * JWT 令牌驗證函數
 * @param token JWT令牌
 * @returns 解析後的用戶數據或null
 */
export const verifyToken = (token: string): any => {
  try {
    // 在實際應用中，應該從環境變量獲取密鑰
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    return jwt.verify(token, secret);
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

/**
 * 身份驗證中間件
 * 驗證請求中的JWT令牌並將用戶信息添加到請求對象中
 */
export const withAuth = (handler: NextApiHandler): NextApiHandler => {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      // 從請求頭中獲取授權令牌
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: '未授權訪問' });
      }

      // 驗證令牌
      const user = verifyToken(token);
      if (!user) {
        return res.status(401).json({ message: '無效的令牌' });
      }

      // 將用戶信息添加到請求中
      req.user = user;
      return await als.run({ actor: user }, () => {
        return handler(req, res);
      });
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(401).json({ message: '授權失敗' });
    }
  };
};

/**
 * 權限檢查中間件
 * 檢查用戶是否擁有特定權限
 * @param permission 需要的權限或權限列表
 */
export const withPermission = (permission: Permission | Permission[]) => {
  return (handler: NextApiHandler): NextApiHandler => {
    return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: '未授權訪問' });
      }

      const permissions = Array.isArray(permission) ? permission : [permission];

      // 檢查用戶是否擁有所需權限
      const hasAccess = permissions.some((p) => hasPermission(user.role, p));

      if (!hasAccess) {
        return res.status(403).json({ message: '權限不足' });
      }

      return handler(req, res);
    });
  };
};
