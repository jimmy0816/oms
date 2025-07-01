import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from './auth';

/**
 * 身份驗證中間件
 * 檢查請求是否包含有效的 JWT Token
 */
export const authMiddleware = (handler: any) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // 從請求中獲取用戶資訊
      const user = getUserFromRequest(req);

      // 如果沒有用戶資訊，返回未授權錯誤
      if (!user) {
        return res.status(401).json({
          success: false,
          error: '未授權，請先登入',
        });
      }

      // 將用戶資訊添加到請求對象中
      (req as any).user = user;

      // 調用下一個處理程序
      return handler(req, res);
    } catch (error) {
      console.error('身份驗證失敗:', error);
      return res.status(401).json({
        success: false,
        error: '身份驗證失敗',
      });
    }
  };
};
