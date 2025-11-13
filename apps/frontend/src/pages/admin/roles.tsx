import React, { useState, useEffect, FC } from 'react';
import { Permission } from 'shared-types';
import { PermissionGuard } from '@/components/PermissionGuard';
import { roleService, Role } from '@/services/roleService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  PlusIcon,
  PencilIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

// --- Reusable Modal Component ---
interface ModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: FC<ModalProps> = ({ show, onClose, title, children }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
          >
            &times;
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

// --- Role Form Component ---
interface RoleFormProps {
  role?: Role | null;
  onSave: (roleData: { name: string; description?: string }) => void;
  onCancel: () => void;
  isSaving: boolean;
}

const RoleForm: FC<RoleFormProps> = ({ role, onSave, onCancel, isSaving }) => {
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const { showToast } = useToast();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove any characters that are not English letters or underscores, then convert to uppercase.
    const sanitizedValue = value.replace(/[^A-Z_]/gi, '').toUpperCase();
    setName(sanitizedValue);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nameRegex = /^[A-Z_]+$/;
    if (!name.trim()) {
      showToast('辨識值不能為空。', 'error');
      return;
    }
    if (!nameRegex.test(name)) {
      showToast('辨識值格式不正確，只能包含大寫英文字母和底線。', 'error');
      return;
    }
    onSave({ name, description });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label
          htmlFor="roleName"
          className="block text-sm font-medium text-gray-700"
        >
          辨識值
        </label>
        <input
          type="text"
          id="roleName"
          value={name}
          onChange={handleNameChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          required
          title="只能輸入大寫英文字母和底線，例如 ADMIN_ROLE"
        />
        <p className="mt-1 text-xs text-gray-500">
          只能輸入大寫英文字母和底線，例如 ADMIN_ROLE
        </p>
      </div>
      <div className="mb-4">
        <label
          htmlFor="roleDescription"
          className="block text-sm font-medium text-gray-700"
        >
          角色名稱
        </label>
        <input
          type="text"
          id="roleDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          請輸入角色的中文名稱，例如 系統管理員
        </p>
      </div>
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
        >
          {isSaving ? '儲存中...' : '儲存'}
        </button>
      </div>
    </form>
  );
};

/**
 * 角色權限管理頁面
 */
export default function RolesManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [allPermissions] = useState<Permission[]>(Object.values(Permission));
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPermissionsLoading, setIsPermissionsLoading] =
    useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const fetchedRoles = await roleService.getAllRoles();
      setRoles(fetchedRoles);
      if (fetchedRoles.length > 0 && !selectedRole) {
        setSelectedRole(fetchedRoles[0]);
      } else if (selectedRole) {
        // Reselect the role to get fresh data
        setSelectedRole(
          fetchedRoles.find((r) => r.id === selectedRole.id) || null
        );
      }
    } catch (error) {
      showToast('獲取角色列表失敗', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      fetchRolePermissions(selectedRole);
    } else {
      setRolePermissions([]);
    }
  }, [selectedRole]);

  const fetchRolePermissions = async (role: Role) => {
    try {
      setIsPermissionsLoading(true);
      const permissions = await roleService.getRolePermissions(role.id);
      setRolePermissions(permissions);
    } catch (error) {
      console.error(`Error fetching permissions for role ${role.name}:`, error);
      showToast('獲取角色權限失敗', 'error');
    } finally {
      setIsPermissionsLoading(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setIsSaving(true);
    try {
      await roleService.updateRolePermissions(selectedRole.id, rolePermissions);
      showToast('權限已成功保存', 'success');
    } catch (error) {
      console.error(
        `Error saving permissions for role ${selectedRole.name}:`,
        error
      );
      showToast('保存權限失敗', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePermissionChange = (permission: Permission, checked: boolean) => {
    setRolePermissions((prev) =>
      checked ? [...prev, permission] : prev.filter((p) => p !== permission)
    );
  };

  const handleOpenModal = (role: Role | null = null) => {
    setEditingRole(role);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
  };

  const handleSaveRole = async (roleData: {
    name: string;
    description?: string;
  }) => {
    setIsSaving(true);
    try {
      if (editingRole) {
        await roleService.updateRole(editingRole.id, roleData);
        showToast('角色更新成功', 'success');
      } else {
        await roleService.createRole(roleData.name, roleData.description);
        showToast('角色創建成功', 'success');
      }
      await fetchRoles();
      handleCloseModal();
    } catch (error: any) {
      showToast(error.response?.data?.message || '儲存角色失敗', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const permissionGroups = {
    tickets: allPermissions.filter((p) => p.includes('tickets')),
    reports: allPermissions.filter((p) => p.includes('reports')),
    users: allPermissions.filter((p) => p.includes('users')),
    roles: allPermissions.filter(
      (p) => p.includes('roles') || p.includes('permissions')
    ),
    system: allPermissions.filter((p) => p.startsWith('manage')),
  };

  const groupNames: { [key: string]: string } = {
    tickets: '工單權限',
    reports: '通報權限',
    users: '用戶管理權限',
    roles: '角色管理權限',
    system: '系統設定權限',
  };

  return (
    <PermissionGuard required={Permission.MANAGE_ROLES}>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">角色與權限管理</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* 角色選擇區域 */}
          <div className="bg-white p-2 rounded shadow">
            <div className="px-2 py-1 flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">角色列表</h2>
              <button
                onClick={() => handleOpenModal()}
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center text-sm"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                創建
              </button>
            </div>
            {isLoading ? (
              <p>載入中...</p>
            ) : (
              <div className="space-y-2">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className={`px-2 py-1 rounded cursor-pointer ${
                      selectedRole?.id === role.id
                        ? 'bg-blue-100 font-medium'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedRole(role)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {role.description}
                        </p>
                        <p className="text-xs text-gray-500">{role.name}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(role);
                        }}
                        className="text-gray-500 hover:text-indigo-600"
                        title="編輯角色"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 權限編輯區域 */}
          <div className="bg-white p-4 rounded shadow md:col-span-3">
            {selectedRole ? (
              <>
                <h2 className="text-xl font-semibold mb-4">
                  {selectedRole.description} 的權限設置
                </h2>

                {isPermissionsLoading ? (
                  <p>載入權限中...</p>
                ) : (
                  <>
                    {Object.entries(permissionGroups).map(
                      ([groupKey, groupPermissions]) => (
                        <div key={groupKey} className="mb-6">
                          <h3 className="text-lg font-medium mb-2">
                            {groupNames[groupKey]}
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-2">
                            {groupPermissions.map((permission) => (
                              <div
                                key={permission}
                                className="flex items-center"
                              >
                                <input
                                  type="checkbox"
                                  id={`${selectedRole.id}-${permission}`}
                                  checked={rolePermissions.includes(permission)}
                                  onChange={(e) =>
                                    handlePermissionChange(
                                      permission,
                                      e.target.checked
                                    )
                                  }
                                  className="mr-2"
                                  disabled={
                                    !hasPermission(
                                      Permission.ASSIGN_PERMISSIONS
                                    )
                                  }
                                />
                                <label
                                  htmlFor={`${selectedRole.id}-${permission}`}
                                  className="text-sm text-gray-600"
                                >
                                  {permission.replace(/_/g, ' ')}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </>
                )}

                <PermissionGuard required={Permission.ASSIGN_PERMISSIONS}>
                  <div className="mt-6 flex space-x-4">
                    <button
                      onClick={handleSavePermissions}
                      disabled={isSaving || isPermissionsLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center"
                    >
                      {isSaving ? '保存中...' : '保存權限設置'}
                    </button>
                  </div>
                </PermissionGuard>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  未選擇角色
                </h3>
                <p className="mt-1 text-sm">請從左側選擇一個角色以編輯其權限</p>
              </div>
            )}
          </div>
        </div>

        <Modal
          show={isModalOpen}
          onClose={handleCloseModal}
          title={editingRole ? '編輯角色' : '創建角色'}
        >
          <RoleForm
            role={editingRole}
            onSave={handleSaveRole}
            onCancel={handleCloseModal}
            isSaving={isSaving}
          />
        </Modal>
      </div>
    </PermissionGuard>
  );
}
