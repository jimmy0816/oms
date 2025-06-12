import { NextApiRequest, NextApiResponse } from 'next';
import { UserRole, Permission, ROLE_PERMISSIONS } from 'shared-types';

// 從 localStorage 獲取角色權限，如果不存在則使用默認值
const getRolePermissionsFromStorage = () => {
  if (typeof window === 'undefined') {
    // 服務器端返回默認值
    return { ...ROLE_PERMISSIONS };
  }
  
  try {
    const storedPermissions = localStorage.getItem('role-permissions');
    if (storedPermissions) {
      return JSON.parse(storedPermissions);
    }
  } catch (error) {
    console.error('Error reading role permissions from localStorage:', error);
  }
  
  // 如果沒有存儲的權限或解析失敗，返回默認值
  return { ...ROLE_PERMISSIONS };
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允許 GET 請求
  if (req.method !== 'GET') {
    return res.status(405).json({ message: '方法不允許' });
  }

  try {
    // 獲取所有角色權限
    const rolePermissions = getRolePermissionsFromStorage();
    
    return res.status(200).json({ rolePermissions });
  } catch (error) {
    console.error('Error in roles API:', error);
    return res.status(500).json({ message: '服務器錯誤' });
  }
}
