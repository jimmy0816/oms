import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { userService } from '@/services/userService';
import { Role } from '@/services/roleService';

interface UserProfile {
  name: string;
  email: string;
  primaryRole: Role | null;
  additionalRoles: Role[];
  permissions: string[];
}

interface ChangePasswordForm {
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
}

export default function UserProfilePage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordForm>();

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || 'N/A',
        email: user.email || 'N/A',
        primaryRole: user.primaryRole || null,
        additionalRoles: user.additionalRoles || [],
        permissions: user.permissions || [],
      });
    }
  }, [user]);

  const handleChangePassword = async (data: ChangePasswordForm) => {
    setIsSubmittingPassword(true);
    try {
      if (data.newPassword !== data.confirmNewPassword) {
        showToast('新密碼與確認密碼不符', 'error');
        return;
      }
      if (!data.currentPassword || !data.newPassword) {
        showToast('請填寫所有密碼欄位', 'error');
        return;
      }

      await userService.changePassword(data.currentPassword, data.newPassword);
      showToast('密碼更改成功', 'success');
      reset(); // Clear form
    } catch (error: any) {
      console.error('更改密碼失敗:', error);
      showToast(error.message || '更改密碼失敗', 'error');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      showToast('您已成功登出', 'success');
      router.push('/login');
    } catch (error) {
      console.error('登出失敗:', error);
      showToast('登出失敗，請稍後再試', 'error');
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>請先登入</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>個人資訊 | OMS 原型</title>
      </Head>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 rounded-full hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">個人資訊</h1>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg overflow-hidden p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">基本資料</h2>
          {profile && (
            <div className="space-y-2 text-gray-700">
              <p>
                <strong>姓名:</strong> {profile.name}
              </p>
              <p className="flex items-center">
                <strong>電子郵件:</strong> {profile.email}
                {user?.isOidcLinked && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Thehapp.
                  </span>
                )}
              </p>
              <div>
                <strong>角色:</strong>
                <div className="ml-4">
                  {profile.primaryRole && <p>主要角色: {profile.primaryRole.description}</p>}
                  {profile.additionalRoles.length > 0 && (
                    <p>額外角色: {profile.additionalRoles.map(r => r.description).join(', ')}</p>
                  )}
                </div>
              </div>
              <div>
                <strong>權限:</strong>
                <ul className="list-disc list-inside ml-4">
                  {profile.permissions.map((perm, index) => (
                    <li key={index}>{perm}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white shadow-sm rounded-lg overflow-hidden p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">更改密碼</h2>
          <form
            onSubmit={handleSubmit(handleChangePassword)}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                目前密碼
              </label>
              <input
                type="password"
                id="currentPassword"
                {...register('currentPassword', { required: '請輸入目前密碼' })}
                className="form-input"
              />
              {errors.currentPassword && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                新密碼
              </label>
              <input
                type="password"
                id="newPassword"
                {...register('newPassword', {
                  required: '請輸入新密碼',
                  minLength: { value: 6, message: '密碼至少需要 6 個字元' },
                })}
                className="form-input"
              />
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.newPassword.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="confirmNewPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                確認新密碼
              </label>
              <input
                type="password"
                id="confirmNewPassword"
                {...register('confirmNewPassword', {
                  required: '請確認新密碼',
                })}
                className="form-input"
              />
              {errors.confirmNewPassword && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.confirmNewPassword.message}
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="btn-primary flex items-center"
                disabled={isSubmittingPassword}
              >
                {isSubmittingPassword ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    處理中...
                  </>
                ) : (
                  '更改密碼'
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md w-full sm:w-auto"
          >
            登出
          </button>
        </div>
      </div>
    </>
  );
}
