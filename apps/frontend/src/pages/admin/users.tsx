import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { 
  PencilIcon, 
  TrashIcon,
  UserPlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { User as BaseUser, UserRole, Permission } from 'shared-types';

// 擴展 User 類型，添加 additionalRoles 屬性
// 这是一个臨時解決方案，直到共享類型包被正確導入
// 在實際項目中，應該在 shared-types 包中更新 User 類型
// 然後重新構建項目

interface User extends BaseUser {
  additionalRoles?: string[];
}
import { userService } from '../../services/userService';
import { PermissionGuard } from '../../components/PermissionGuard';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';

function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentEditUser, setCurrentEditUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  // 表單狀態
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: UserRole.USER,
    password: ''
  });
  
  // 多角色選擇狀態
  const [selectedRoles, setSelectedRoles] = useState<{value: string; label: string}[]>([]);
  
  // 角色選項
  const [roleOptions, setRoleOptions] = useState<{ value: string; label: string; description: string; permissions: string[] }[]>([]);

  // 加載用戶數據
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const allUsers = await userService.getAllUsers();
        setUsers(allUsers);
        setFilteredUsers(allUsers);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);
  
  // 獲取角色選項
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const roles = await userService.getRoleDetails();
        const options = roles.map((roleData) => ({
          value: roleData.id,
          label: `${roleData.name} (${roleData.count})`,
          description: roleData.description,
          permissions: roleData.permissions
        }));
        setRoleOptions(options);
      } catch (error) {
        console.error('Error fetching roles:', error);
        // 使用預設角色
        const defaultOptions = Object.values(UserRole).map((role) => ({
          value: role,
          label: role,
          description: `${role} 角色`,
          permissions: []
        }));
        setRoleOptions(defaultOptions);
      }
    };

    fetchRoles();
  }, []);

  // 處理搜索和過濾
  useEffect(() => {
    let result = [...users];
    
    // 搜索過濾
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(
        user => 
          user.name.toLowerCase().includes(lowerSearchTerm) || 
          user.email.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    // 角色過濾
    if (roleFilter) {
      result = result.filter(user => user.role === roleFilter);
    }
    
    setFilteredUsers(result);
  }, [users, searchTerm, roleFilter]);
  
  // 處理表單輸入變化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // 打開添加用戶模態框
  const openAddModal = () => {
    setCurrentEditUser(null);
    setFormData({
      name: '',
      email: '',
      role: UserRole.USER,
      password: ''
    });
    setSelectedRoles([]);
    setIsModalOpen(true);
  };
  
  // 編輯用戶
  const handleEditUser = async (user: User) => {
    setCurrentEditUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: '' // 不顯示密碼
    });
    
    // 如果用戶有額外角色，載入這些角色
    if (user.additionalRoles && user.additionalRoles.length > 0) {
      // 將額外角色轉換為選項格式
      const additionalRoleOptions = user.additionalRoles.map(roleId => {
        const roleOption = roleOptions.find(option => option.value === roleId);
        return roleOption || { value: roleId, label: getRoleName(roleId as UserRole) };
      });
      
      setSelectedRoles(additionalRoleOptions);
    } else {
      setSelectedRoles([]);
    }
    
    setIsModalOpen(true);
  };
  
  // 打開刪除確認模態框
  const openDeleteModal = (user: User) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };
  
  // 處理表單提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let result;
      
      if (currentEditUser) {
        // 更新用戶
        result = await userService.updateUser(currentEditUser.id, formData);
        
        // 更新用戶角色
        if (selectedRoles && selectedRoles.length > 0) {
          const roleIds = selectedRoles.map(role => role.value);
          await userService.updateUserRoles(currentEditUser.id, roleIds);
        }
      } else {
        // 創建新用戶
        result = await userService.createUser(formData);
        
        // 如果選擇了多個角色，更新用戶角色
        if (selectedRoles && selectedRoles.length > 1) {
          const roleIds = selectedRoles.map(role => role.value);
          await userService.updateUserRoles(result.id, roleIds);
        }
      }
      
      // 重新加載用戶列表
      const updatedUsers = await userService.getAllUsers();
      setUsers(updatedUsers);
      
      // 重置選擇的角色
      setSelectedRoles([]);
      
      // 關閉模態框
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving user:', error);
      alert('保存用戶時出錯');
    }
  };
  
  // 處理刪除用戶
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      await userService.deleteUser(userToDelete.id);
      
      // 重新加載用戶列表
      const updatedUsers = await userService.getAllUsers();
      setUsers(updatedUsers);
      
      // 關閉刪除模態框
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('刪除用戶時出錯');
    }
  };
  
  // 獲取角色顯示名稱
  const getRoleName = (role: UserRole): string => {
    const roleNames: Partial<Record<UserRole, string>> = {
      [UserRole.ADMIN]: '系統管理員',
      [UserRole.MANAGER]: '部門經理',
      [UserRole.REPORT_PROCESSOR]: '通報處理者',
      [UserRole.REPORT_REVIEWER]: '通報審核者',
      [UserRole.CUSTOMER_SERVICE]: '客服人員',
      [UserRole.MAINTENANCE_WORKER]: '維修工務',
      [UserRole.STAFF]: '員工',
      [UserRole.USER]: '一般用戶'
    };
    
    return roleNames[role] || role;
  };

  return (
    <>
      <Head>
        <title>用戶管理 | 通報系統後台</title>
      </Head>

      <PermissionGuard permission={Permission.VIEW_USERS} userRole={user?.role || 'USER'}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">用戶管理</h1>
            
            <PermissionGuard permission={Permission.CREATE_USERS} userRole={user?.role || 'USER'}>
              <button
                onClick={openAddModal}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <UserPlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                新增用戶
              </button>
            </PermissionGuard>
          </div>
          
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                <div className="relative rounded-md shadow-sm w-full sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="text"
                    name="search"
                    id="search"
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                    placeholder="搜索用戶"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <FunnelIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  <select
                    id="role-filter"
                    name="role-filter"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
                  >
                    <option value="">所有角色</option>
                    {Object.values(UserRole).map(role => (
                      <option key={role} value={role}>{getRoleName(role)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredUsers.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      用戶資訊
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      角色
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      創建日期
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      {/* 用戶角色 */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {/* 主要角色 */}
                        <div className="flex flex-wrap gap-1 items-center">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {getRoleName(user.role)}
                          </span>
                          
                          {/* 額外角色 */}
                          {user.additionalRoles && user.additionalRoles.length > 0 && (
                            <div className="flex items-center">
                              <span className="text-xs text-gray-500 mx-1">+</span>
                              <div className="group relative">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 cursor-help">
                                  {user.additionalRoles.length} 個額外角色
                                </span>
                                {/* 角色提示框 */}
                                <div className="absolute left-0 mt-1 w-48 bg-white shadow-lg rounded-md p-2 z-10 hidden group-hover:block">
                                  <p className="text-xs font-medium text-gray-700 mb-1">額外角色：</p>
                                  <ul className="text-xs">
                                    {user.additionalRoles.map((roleId, index) => (
                                      <li key={index} className="mb-1 last:mb-0 flex items-center">
                                        <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                                        {getRoleName(roleId as UserRole)}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString('zh-TW')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <PermissionGuard permission={Permission.EDIT_USERS} userRole={user?.role || 'USER'}>
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              編輯
                            </button>
                          </PermissionGuard>
                          
                          <PermissionGuard permission={Permission.DELETE_USERS} userRole={user?.role || 'USER'}>
                            <button
                              onClick={() => openDeleteModal(user)}
                              className="text-red-600 hover:text-red-900"
                              disabled={user.id === user?.id} // 防止刪除自己
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </PermissionGuard>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500">沒有找到符合條件的用戶</p>
              </div>
            )}
          </div>
        </div>
      </PermissionGuard>
      
      {/* 新增/編輯用戶模態框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {currentEditUser ? '編輯用戶' : '新增用戶'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    姓名
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    電子郵件
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                    主要角色
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    {Object.values(UserRole).map(role => (
                      <option key={role} value={role}>{getRoleName(role)}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">設定用戶的主要角色，將決定用戶的基本權限</p>
                </div>
                
                <div>
                  <label htmlFor="additionalRoles" className="block text-sm font-medium text-gray-700">
                    額外角色
                  </label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {roleOptions.map(role => (
                      <div key={role.value} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`role-${role.value}`}
                          checked={selectedRoles.some(r => r.value === role.value) || formData.role === role.value}
                          disabled={formData.role === role.value}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRoles([...selectedRoles, role]);
                            } else {
                              setSelectedRoles(selectedRoles.filter(r => r.value !== role.value));
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`role-${role.value}`} className="ml-2 text-sm text-gray-700">
                          {role.label.split(' ')[0]} {/* 只顯示角色名稱，不顯示計數 */}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">選擇用戶的額外角色，將提供額外的權限</p>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-2 rounded-b-lg">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* 刪除確認模態框 */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">確認刪除</h3>
            </div>
            
            <div className="px-6 py-4">
              <p className="text-gray-700">
                您確定要刪除用戶 <span className="font-medium">{userToDelete.name}</span> 嗎？此操作無法撤銷。
              </p>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-2 rounded-b-lg">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 使用 ProtectedRoute 包裝 UsersPage 組件，確保只有管理員和經理可以訪問
export default function AdminUsersPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <UsersPage />
    </ProtectedRoute>
  );
}
