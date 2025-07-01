import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from './auth';

/**
 * 角色權限定義
 */
export const Permissions = {
  // 工單相關權限
  CREATE_TICKET: ['ADMIN', 'MANAGER', 'STAFF', 'USER'],
  UPDATE_TICKET: ['ADMIN', 'MANAGER', 'STAFF'],
  DELETE_TICKET: ['ADMIN', 'MANAGER'],
  ASSIGN_TICKET: ['ADMIN', 'MANAGER'],
  
  // 通報相關權限
  CREATE_REPORT: ['ADMIN', 'MANAGER', 'STAFF', 'USER'],
  UPDATE_REPORT: ['ADMIN', 'MANAGER', 'STAFF'],
  DELETE_REPORT: ['ADMIN', 'MANAGER'],
  ASSIGN_REPORT: ['ADMIN', 'MANAGER'],
  
  // 用戶相關權限
  CREATE_USER: ['ADMIN'],
  UPDATE_USER: ['ADMIN'],
  DELETE_USER: ['ADMIN'],
  
  // 系統設置權限
  SYSTEM_SETTINGS: ['ADMIN'],
};

/**
 * 檢查用戶是否具有特定權限
 * @param req 請求對象
 * @param permission 權限名稱
 * @returns 是否具有權限
 */
export const hasPermission = async (
  req: NextApiRequest,
  permission: keyof typeof Permissions
): Promise<boolean> => {
  // 從請求中獲取用戶信息
  const user = await getUserFromRequest(req);
  
  // 如果沒有用戶信息，則沒有權限
  if (!user) {
    return false;
  }
  
  // 檢查用戶角色是否在權限列表中
  const allowedRoles = Permissions[permission];
  return allowedRoles.includes(user.role);
};

/**
 * 權限中間件
 * @param handler API 處理函數
 * @param permission 所需權限
 * @returns 包裝後的處理函數
 */
export function withPermission(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  permission: keyof typeof Permissions
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // 檢查用戶是否具有權限
    const hasAccess = await hasPermission(req, permission);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: '權限不足：您沒有執行此操作的權限',
      });
    }
    
    // 有權限，繼續執行處理函數
    return handler(req, res);
  };
}
