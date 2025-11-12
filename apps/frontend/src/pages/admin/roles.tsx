import React, { useState, useEffect, FC } from 'react';
import { Permission } from 'shared-types';
import { PermissionGuard } from '@/components/PermissionGuard';
import { roleService, Role } from '@/services/roleService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { PlusIcon, PencilIcon, TrashIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

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
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, description });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label htmlFor="roleName" className="block text-sm font-medium text-gray-700">Role Name</label>
        <input
          type="text"
          id="roleName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          required
        />
      </div>
      <div className="mb-4">
        <label htmlFor="roleDescription" className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          id="roleDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300">
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
};

// --- Permission Editor Component ---
const PermissionEditor: FC<{ role: Role; onSave: () => void }> = ({ role, onSave }) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [allPermissions] = useState<Permission[]>(Object.values(Permission));
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();
  const { hasPermission } = useAuth();

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const perms = await roleService.getRolePermissions(role.id);
        setPermissions(perms);
      } catch (error) {
        showToast('Failed to fetch permissions', 'error');
      }
    };
    fetchPermissions();
  }, [role, showToast]);

  const handlePermissionChange = (permission: Permission, checked: boolean) => {
    setPermissions(prev => checked ? [...prev, permission] : prev.filter(p => p !== permission));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await roleService.updateRolePermissions(role.id, permissions);
      showToast('Permissions updated successfully', 'success');
      onSave();
    } catch (error) {
      showToast('Failed to save permissions', 'error');
    } finally {
      setIsSaving(false);
    }
  };
  
  const permissionGroups = {
     tickets: allPermissions.filter(p => p.includes('TICKETS')),
     reports: allPermissions.filter(p => p.includes('REPORTS')),
     users: allPermissions.filter(p => p.includes('USERS')),
     roles: allPermissions.filter(p => p.includes('ROLES') || p.includes('PERMISSIONS')),
     system: allPermissions.filter(p => p.startsWith('manage_')),
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Edit Permissions for {role.name}</h3>
      {Object.entries(permissionGroups).map(([groupName, groupPermissions]) => (
        <div key={groupName} className="mb-6">
          <h4 className="text-lg font-medium mb-2 capitalize">{groupName}</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {groupPermissions.map(p => (
              <div key={p} className="flex items-center">
                <input
                  type="checkbox"
                  id={p}
                  checked={permissions.includes(p)}
                  onChange={(e) => handlePermissionChange(p, e.target.checked)}
                  className="mr-2"
                  disabled={!hasPermission(Permission.ASSIGN_PERMISSIONS)}
                />
                <label htmlFor={p} className="text-sm">{p.replace(/_/g, ' ')}</label>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300">
          {isSaving ? 'Saving...' : 'Save Permissions'}
        </button>
      </div>
    </div>
  );
};


/**
 * Role Management Page
 */
export default function RolesManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [managingPermissionsFor, setManagingPermissionsFor] = useState<Role | null>(null);
  const { showToast } = useToast();

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const fetchedRoles = await roleService.getAllRoles();
      setRoles(fetchedRoles);
    } catch (error) {
      showToast('Failed to fetch roles', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleOpenModal = (role: Role | null = null) => {
    setEditingRole(role);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
  };

  const handleSaveRole = async (roleData: { name: string; description?: string }) => {
    setIsSaving(true);
    try {
      if (editingRole) {
        await roleService.updateRole(editingRole.id, roleData);
        showToast('Role updated successfully', 'success');
      } else {
        await roleService.createRole(roleData.name, roleData.description);
        showToast('Role created successfully', 'success');
      }
      fetchRoles();
      handleCloseModal();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to save role', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deletingRole) return;
    try {
      await roleService.deleteRole(deletingRole.id);
      showToast('Role deleted successfully', 'success');
      fetchRoles();
      setDeletingRole(null);
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to delete role', 'error');
    }
  };

  if (managingPermissionsFor) {
    return (
      <div className="container mx-auto px-4 py-8">
        <button onClick={() => setManagingPermissionsFor(null)} className="mb-4 text-blue-600 hover:underline">
          &larr; Back to Roles List
        </button>
        <PermissionEditor role={managingPermissionsFor} onSave={() => setManagingPermissionsFor(null)} />
      </div>
    );
  }

  return (
    <PermissionGuard required={Permission.MANAGE_ROLES}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Role Management</h1>
          <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Role
          </button>
        </div>

        {isLoading ? (
          <p>Loading roles...</p>
        ) : (
          <div className="bg-white shadow rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roles.map((role) => (
                  <tr key={role.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{role.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{role.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{role.userCount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button onClick={() => setManagingPermissionsFor(role)} className="text-green-600 hover:text-green-900" title="Permissions">
                        <ShieldCheckIcon className="h-5 w-5" />
                      </button>
                      <button onClick={() => handleOpenModal(role)} className="text-indigo-600 hover:text-indigo-900" title="Edit">
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button onClick={() => setDeletingRole(role)} className="text-red-600 hover:text-red-900" title="Delete">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Modal show={isModalOpen} onClose={handleCloseModal} title={editingRole ? 'Edit Role' : 'Create Role'}>
          <RoleForm role={editingRole} onSave={handleSaveRole} onCancel={handleCloseModal} isSaving={isSaving} />
        </Modal>

        <Modal show={!!deletingRole} onClose={() => setDeletingRole(null)} title="Confirm Deletion">
          {deletingRole && (
            <div>
              <p>Are you sure you want to delete the role "<strong>{deletingRole.name}</strong>"?</p>
              <p className="text-sm text-red-600 mt-2">This action cannot be undone.</p>
              <div className="flex justify-end space-x-2 mt-4">
                <button onClick={() => setDeletingRole(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                <button onClick={handleDeleteRole} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </PermissionGuard>
  );
}
