import { NextApiRequest, NextApiResponse } from 'next';
import { Permission } from 'shared-types';
import jwt from 'jsonwebtoken';
import { als } from '@/lib/als';
import { permissionService } from '@/services/permissionService';

// Define the extended request type, including user information
export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    email: string;
    name: string;
    primaryRole: any;
    additionalRoles: any[];
    permissions?: string[];
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
        res.status(401).json({ message: '未授權訪問' });
        return;
      }

      // 驗證令牌
      const user = verifyToken(token);
      if (!user) {
        res.status(401).json({ message: '無效的令牌' });
        return;
      }

      // 將用戶信息添加到請求中
      req.user = user;
      await als.run({ actor: user }, async () => {
        await handler(req, res);
      });
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(401).json({ message: '授權失敗' });
    }
  };
};

/**
 * 基於數據庫的權限檢查中間件
 * 檢查用戶是否擁有特定權限
 * @param permission 需要的權限或權限列表
 */
export const withDbPermission = (permission: Permission | Permission[]) => {
  return (handler: NextApiHandler): NextApiHandler => {
    return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: '未授權訪問' });
      }

      const permissions = Array.isArray(permission) ? permission : [permission];
      let hasAccess = false;

      try {
        // 檢查用戶是否擁有所需權限
        for (const perm of permissions) {
          const hasPermission = await permissionService.hasPermission(
            user.id,
            perm
          );
          if (hasPermission) {
            hasAccess = true;
            break;
          }
        }

        if (!hasAccess) {
          return res.status(403).json({ message: '權限不足' });
        }

        return handler(req, res);
      } catch (error) {
        console.error('Permission check error:', error);
        return res.status(500).json({ message: '權限檢查失敗' });
      }
    });
  };
};

/**
 * 獲取用戶所有權限
 * @param userId 用戶ID
 * @returns 權限列表
 */
export const getUserPermissions = async (userId: string): Promise<string[]> => {
  try {
    return await permissionService.getUserPermissions(userId);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
};
