import React, { useState, useEffect, FC, useMemo } from 'react';
import Head from 'next/head';
import {
  TrashIcon,
  UserPlusIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { User } from '@/types/user';
import {
  userService,
  CreateUserPayload,
  UpdateUserPayload,
} from '@/services/userService';
import { roleService, Role } from '@/services/roleService';
import { PermissionGuard } from '@/components/PermissionGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Permission } from 'shared-types';

// --- Modal Component ---
interface ModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}
const Modal: FC<ModalProps> = ({ show, onClose, title, children }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        </div>
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="p-6">{children}</div>
        </form>
      </div>
    </div>
  );
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // State for operations
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [fetchedUsers, fetchedRoles] = await Promise.all([
          userService.getAllUsers(),
          roleService.getAllRoles(),
        ]);
        setUsers(fetchedUsers);
        setRoles(fetchedRoles);
      } catch (error) {
        showToast('Failed to fetch data', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [showToast]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchMatch =
        searchTerm === '' ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      const roleMatch =
        roleFilter === '' ||
        user.primaryRole?.id === roleFilter ||
        user.additionalRoles?.some((role) => role.id === roleFilter);

      return searchMatch && roleMatch;
    });
  }, [users, searchTerm, roleFilter]);

  const openModal = (user: User | null = null) => {
    setEditingUser(user);
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        primaryRoleId: user.primaryRole?.id || '',
        additionalRoleIds: user.additionalRoles?.map((r) => r.id) || [],
      });
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        primaryRoleId: '',
        additionalRoleIds: [],
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({});
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMultiSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(
      e.target.selectedOptions,
      (option) => option.value
    );
    setFormData((prev) => ({ ...prev, additionalRoleIds: values }));
  };

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        const payload: UpdateUserPayload = {
          name: formData.name,
          email: formData.email,
          primaryRoleId: formData.primaryRoleId,
          additionalRoleIds: formData.additionalRoleIds,
        };
        await userService.updateUser(editingUser.id, payload);
        showToast('User updated successfully', 'success');
      } else {
        const payload: CreateUserPayload = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          primaryRoleId: formData.primaryRoleId,
          additionalRoleIds: formData.additionalRoleIds,
        };
        await userService.createUser(payload);
        showToast('User created successfully', 'success');
      }
      const updatedUsers = await userService.getAllUsers();
      setUsers(updatedUsers);
      closeModal();
    } catch (error: any) {
      showToast(
        error.response?.data?.message || 'Failed to save user',
        'error'
      );
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      await userService.deleteUser(deletingUser.id);
      setUsers(users.filter((u) => u.id !== deletingUser.id));
      showToast('User deleted successfully', 'success');
      setIsDeleteModalOpen(false);
      setDeletingUser(null);
    } catch (error: any) {
      showToast(
        error.response?.data?.message || 'Failed to delete user',
        'error'
      );
    }
  };

  return (
    <>
      <Head>
        <title>用戶管理 | 通報系統後台</title>
      </Head>
      <PermissionGuard required={Permission.VIEW_USERS}>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">用戶管理</h1>

            <PermissionGuard required={Permission.CREATE_USERS}>
              <button
                onClick={() => openModal()}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <UserPlusIcon
                  className="-ml-1 mr-2 h-5 w-5"
                  aria-hidden="true"
                />
                新增用戶
              </button>
            </PermissionGuard>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                <div className="relative rounded-md shadow-sm w-full sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
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
                  <FunnelIcon
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                  <select
                    id="role-filter"
                    name="role-filter"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="">所有角色</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <p className="text-center py-10">Loading...</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      用戶資訊
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      角色
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      創建日期
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex flex-wrap gap-1 items-center">
                          {user.primaryRole && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {user.primaryRole.description}
                            </span>
                          )}
                          {user.additionalRoles &&
                            user.additionalRoles.length > 0 && (
                              <div className="flex items-center">
                                <span className="text-xs text-gray-500 mx-1">
                                  +
                                </span>
                                <div className="group relative">
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 cursor-help">
                                    {user.additionalRoles.length} 個額外角色
                                  </span>
                                  <div className="absolute left-0 mt-1 w-48 bg-white shadow-lg rounded-md p-2 z-10 hidden group-hover:block">
                                    <p className="text-xs font-medium text-gray-700 mb-1">
                                      額外角色：
                                    </p>
                                    <ul className="text-xs">
                                      {user.additionalRoles.map((role) => (
                                        <li
                                          key={role.id}
                                          className="mb-1 last:mb-0 flex items-center"
                                        >
                                          <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                                          {role.description}
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
                        {new Date(user.createdAt!).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <PermissionGuard required={Permission.EDIT_USERS}>
                          <button
                            onClick={() => openModal(user)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                        </PermissionGuard>
                        <PermissionGuard required={Permission.DELETE_USERS}>
                          <button
                            onClick={() => {
                              setDeletingUser(user);
                              setIsDeleteModalOpen(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                            disabled={user.id === currentUser?.id}
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </PermissionGuard>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </PermissionGuard>

      <Modal
        show={isModalOpen}
        onClose={closeModal}
        title={editingUser ? '編輯用戶' : '新增用戶'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              姓名
            </label>
            <input
              type="text"
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              電子郵件
            </label>
            <input
              type="email"
              name="email"
              value={formData.email || ''}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          {!editingUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                密碼
              </label>
              <input
                type="password"
                name="password"
                value={formData.password || ''}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              />
              <p className="mt-1 text-xs text-gray-500">為新用戶設置初始密碼</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              主要角色
            </label>
            <select
              name="primaryRoleId"
              value={formData.primaryRoleId || ''}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm"
            >
              <option value="" disabled>
                請選擇主要角色
              </option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.description}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              設定用戶的主要角色，將決定用戶的基本權限
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              額外角色
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              {roles.map((role) => (
                <div key={role.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`role-${role.id}`}
                    checked={
                      (formData.additionalRoleIds &&
                        formData.additionalRoleIds.includes(role.id)) ||
                      formData.primaryRoleId === role.id
                    }
                    disabled={formData.primaryRoleId === role.id}
                    onChange={(e) => {
                      const currentAdditionalRoles =
                        formData.additionalRoleIds || [];
                      if (e.target.checked) {
                        setFormData((prev: any) => ({
                          ...prev,
                          additionalRoleIds: [
                            ...currentAdditionalRoles,
                            role.id,
                          ],
                        }));
                      } else {
                        setFormData((prev: any) => ({
                          ...prev,
                          additionalRoleIds: currentAdditionalRoles.filter(
                            (id: string) => id !== role.id
                          ),
                        }));
                      }
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor={`role-${role.id}`}
                    className="ml-2 text-sm text-gray-700"
                  >
                    {role.description}
                  </label>
                </div>
              ))}
              <p className="mt-1 text-xs text-gray-500">
                選擇用戶的額外角色，將提供額外的權限
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-2">
          <button
            type="button"
            onClick={closeModal}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </Modal>

      <Modal
        show={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
      >
        {deletingUser && (
          <div>
            <p>
              Are you sure you want to delete user "
              <strong>{deletingUser.name}</strong>"?
            </p>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
