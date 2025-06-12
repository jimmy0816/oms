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
import { User, UserRole, Permission } from 'shared-types';
import { userService } from '@/services/userService';
import { PermissionGuard } from '@/components/PermissionGuard';

// 模擬當前用戶
const currentUser = {
  id: '1',
  name: '系統管理員',
  role: UserRole.ADMIN
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentEditUser, setCurrentEditUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  // 表單數據
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: UserRole.USER
  });
  
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
  
  // 打開新增用戶模態框
  const openAddModal = () => {
    setCurrentEditUser(null);
    setFormData({
      name: '',
      email: '',
      role: UserRole.USER
    });
    setIsModalOpen(true);
  };
  
  // 打開編輯用戶模態框
  const openEditModal = (user: User) => {
    setCurrentEditUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role
    });
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
      if (currentEditUser) {
        // 更新用戶
        await userService.updateUser(currentEditUser.id, formData);
      } else {
        // 創建新用戶
        await userService.createUser(formData);
      }
      
      // 重新加載用戶列表
      const updatedUsers = await userService.getAllUsers();
      setUsers(updatedUsers);
      
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
    const roleNames: Record<UserRole, string> = {
      [UserRole.ADMIN]: '系統管理員',
      [UserRole.MANAGER]: '部門經理',
      [UserRole.REPORT_PROCESSOR]: '通報處理者',
      [UserRole.REPORT_REVIEWER]: '通報審核者',
      [UserRole.CUSTOMER_SERVICE]: '客服人員',
      [UserRole.MAINTENANCE_WORKER]: '維修工務',
      [UserRole.USER]: '一般用戶'
    };
    
    return roleNames[role] || role;
  };
  
  return (
    <>
      <Head>
        <title>用戶管理 | OMS 原型</title>
      </Head>
      
      <PermissionGuard 
        permission={Permission.VIEW_USERS} 
        userRole={currentUser.role}
        fallback={<div className="p-4 text-red-500">您沒有權限訪問此頁面</div>}
      >
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">用戶管理</h1>
            
            <PermissionGuard permission={Permission.CREATE_USERS} userRole={currentUser.role}>
              <button
                onClick={openAddModal}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <UserPlusIcon className="h-5 w-5 mr-2" />
                新增用戶
              </button>
            </PermissionGuard>
          </div>
          
          {/* 搜索和過濾 */}
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="flex-1">
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                    placeholder="搜尋用戶名稱或電子郵件"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="role" className="sr-only">角色</label>
                <select
                  id="role"
                  name="role"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">所有角色</option>
                  {Object.values(UserRole).map(role => (
                    <option key={role} value={role}>{getRoleName(role)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* 用戶列表 */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {getRoleName(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString('zh-TW')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <PermissionGuard permission={Permission.EDIT_USERS} userRole={currentUser.role}>
                            <button
                              onClick={() => openEditModal(user)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                          </PermissionGuard>
                          
                          <PermissionGuard permission={Permission.DELETE_USERS} userRole={currentUser.role}>
                            <button
                              onClick={() => openDeleteModal(user)}
                              className="text-red-600 hover:text-red-900"
                              disabled={user.id === currentUser.id} // 防止刪除自己
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
            )}
            
            {!loading && filteredUsers.length === 0 && (
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
                    角色
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
