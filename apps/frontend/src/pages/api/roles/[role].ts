import { NextApiRequest, NextApiResponse } from 'next';
import { UserRole, Permission, ROLE_PERMISSIONS } from 'shared-types';
import { applyCors } from '../../../utils/cors'; // 路徑依實際情況調整

// 從 localStorage 獲取角色權限，如果不存在則使用默認值
const getRolePermissionsFromStorage = () => {
  try {
    // 在 API 路由中，我們在服務器端執行，沒有 localStorage
    // 這裡我們使用一個模擬的方式來存儲數據
    // 在實際應用中，這應該連接到數據庫
    const { rolePermissions } = global as any;
    
    if (rolePermissions) {
      return rolePermissions;
    }
  } catch (error) {
    console.error('Error reading role permissions from storage:', error);
  }
  
  // 如果沒有存儲的權限或解析失敗，返回默認值
  return { ...ROLE_PERMISSIONS };
};

// 保存角色權限到存儲
const saveRolePermissionsToStorage = (rolePermissions: Record<string, Permission[]>) => {
  try {
    // 在 API 路由中，我們在服務器端執行，沒有 localStorage
    // 這裡我們使用一個模擬的方式來存儲數據
    (global as any).rolePermissions = rolePermissions;
  } catch (error) {
    console.error('Error saving role permissions to storage:', error);
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await applyCors(req, res);
  const { role } = req.query;
  
  // 確保 role 是一個有效的 UserRole
  if (!role || typeof role !== 'string' || !Object.values(UserRole).includes(role as UserRole)) {
    return res.status(400).json({ message: '[role]無效的角色' });
  }

  const userRole = role as UserRole;
  
  // 根據請求方法處理不同操作
  switch (req.method) {
    case 'GET':
      // 獲取特定角色的權限
      try {
        const rolePermissions = getRolePermissionsFromStorage();
        const permissions = rolePermissions[userRole] || [];
        
        return res.status(200).json({ permissions });
      } catch (error) {
        console.error(`Error getting permissions for role ${userRole}:`, error);
        return res.status(500).json({ message: '服務器錯誤' });
      }
      
    case 'PUT':
      // 更新角色權限
      try {
        const { permissions } = req.body;
        
        // 驗證權限列表
        if (!Array.isArray(permissions)) {
          return res.status(400).json({ message: '無效的權限列表' });
        }
        
        // 確保所有權限都是有效的 Permission 枚舉值
        const invalidPermissions = permissions.filter(
          p => !Object.values(Permission).includes(p as Permission)
        );
        
        if (invalidPermissions.length > 0) {
          return res.status(400).json({ 
            message: `無效的權限: ${invalidPermissions.join(', ')}` 
          });
        }
        
        // 獲取當前所有角色權限
        const rolePermissions = getRolePermissionsFromStorage();
        
        // 更新特定角色的權限
        rolePermissions[userRole] = permissions as Permission[];
        
        // 保存更新後的權限
        saveRolePermissionsToStorage(rolePermissions);
        
        return res.status(200).json({ 
          message: `成功更新 ${userRole} 角色的權限`,
          permissions: rolePermissions[userRole]
        });
      } catch (error) {
        console.error(`Error updating permissions for role ${userRole}:`, error);
        return res.status(500).json({ message: '服務器錯誤' });
      }
      
    case 'DELETE':
      // 重置角色權限為默認值
      try {
        // 獲取當前所有角色權限
        const rolePermissions = getRolePermissionsFromStorage();
        
        // 重置為默認值
        rolePermissions[userRole] = [...ROLE_PERMISSIONS[userRole]];
        
        // 保存更新後的權限
        saveRolePermissionsToStorage(rolePermissions);
        
        return res.status(200).json({ 
          message: `成功重置 ${userRole} 角色的權限`,
          permissions: rolePermissions[userRole]
        });
      } catch (error) {
        console.error(`Error resetting permissions for role ${userRole}:`, error);
        return res.status(500).json({ message: '服務器錯誤' });
      }
      
    default:
      return res.status(405).json({ message: '方法不允許' });
  }
}
