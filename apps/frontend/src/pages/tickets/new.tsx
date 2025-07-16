import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { ArrowLeftIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { TicketPriority, UserRole } from 'shared-types';
import FileUploader from '@/components/FileUploader';
import { ticketService } from '@/services/ticketService';
import userService from '@/services/userService';
import { roleService, getRoleName } from '@/services/roleService';
import { uploadService } from '@/services/uploadService';
import dynamic from 'next/dynamic';

const ReportMultiSelector = dynamic(
  () => import('@/components/ReportMultiSelector'),
  { ssr: false }
);

// 定義表單資料型別
interface TicketFormData {
  title: string;
  description: string;
  priority: TicketPriority;
  roleId?: string;
  attachments?: FileInfo[];
  reportIds?: string[]; // 確保 reportIds 是 string[] 類型，且是可選的
}

// 定義檔案資訊介面
interface FileInfo {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
  size?: number;
}

export default function NewTicket() {
  const router = useRouter();
  const { query } = router;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<FileInfo[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TicketFormData>();

  useEffect(() => {
    userService.getUsersByRole(UserRole.STAFF).then((users) => {
      setUsers(users);
    });

    roleService.getAllRoles().then((roles) => {
      setRoles(roles);
    });

    if (query.reportId && typeof query.reportId === 'string') {
      setSelectedReportIds([query.reportId]);
    }
  }, []);

  // 處理檔案變更
  const handleFilesChange = (files: FileInfo[]) => {
    setUploadedFiles(files);
  };

  const ticketUploadFunction = async (file: File): Promise<FileInfo> => {
    const { signedUrl, fileUrl, fileId } = await uploadService.getUploadUrl(
      file.name,
      file.type,
      'tickets'
    );

    const response = await fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!response.ok) {
      throw new Error('上傳失敗');
    }

    return {
      id: fileId,
      name: file.name,
      url: fileUrl,
      type: file.type.startsWith('image/') ? 'image' : 'video',
      size: file.size,
    };
  };

  const onSubmit = async (data: TicketFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // 準備要發送到後端 API 的數據
      const ticketData = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        roleId: data.roleId || undefined,
        attachments: uploadedFiles,
        reportIds: selectedReportIds,
      };

      // 調用 ticketService 將數據發送到後端 API
      const createdTicket = await ticketService.createTicket(ticketData);

      // 顯示成功訊息
      alert('工單已成功建立！');

      // 導向到工單列表頁面
      router.push('/tickets');
    } catch (err: any) {
      setError(err.message || '建立工單時發生錯誤，請稍後再試。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>建立工單 | OMS 原型</title>
      </Head>

      <div className="space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 rounded-full hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">建立新工單</h1>
          </div>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* 工單表單 */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* 工單標題 */}
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  工單標題 <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  {...register('title', {
                    required: '請輸入工單標題',
                    maxLength: {
                      value: 100,
                      message: '標題不能超過 100 個字元',
                    },
                  })}
                  className="form-input"
                  placeholder="請簡短描述問題"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.title.message}
                  </p>
                )}
              </div>

              {/* 工單描述 */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  工單描述 <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  rows={5}
                  {...register('description', {
                    required: '請輸入工單描述',
                    minLength: { value: 10, message: '描述至少需要 10 個字元' },
                  })}
                  className="form-input"
                  placeholder="請詳細描述問題，包括發生時間、影響範圍、重現步驟等"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.description.message}
                  </p>
                )}
              </div>

              {/* 優先級 */}
              <div>
                <label
                  htmlFor="priority"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  優先級 <span className="text-red-500">*</span>
                </label>
                <select
                  id="priority"
                  {...register('priority', { required: '請選擇優先級' })}
                  className="form-input"
                >
                  <option value="">請選擇優先級</option>
                  <option value={TicketPriority.LOW}>低</option>
                  <option value={TicketPriority.MEDIUM}>中</option>
                  <option value={TicketPriority.HIGH}>高</option>
                  <option value={TicketPriority.URGENT}>緊急</option>
                </select>
                {errors.priority && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.priority.message}
                  </p>
                )}
              </div>

              {/* 指派角色 */}
              <div>
                <label
                  htmlFor="roleId"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  指派角色 <span className="text-red-500">*</span>
                </label>
                <select
                  id="roleId"
                  {...register('roleId', { required: '請選擇指派角色' })}
                  className="form-input"
                >
                  <option value="">請選擇角色</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {getRoleName(role.name)}
                    </option>
                  ))}
                </select>
                {errors.roleId && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.roleId.message}
                  </p>
                )}
              </div>

              {/* 關聯通報 */}
              <div>
                <label
                  htmlFor="reportIds"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  關聯通報
                </label>
                <ReportMultiSelector
                  value={selectedReportIds}
                  onChange={setSelectedReportIds}
                />
              </div>

              {/* 附件 */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  附件
                </label>
                <FileUploader
                  onFilesChange={handleFilesChange}
                  uploadFunction={ticketUploadFunction} // <-- 新增這個 prop，傳入您已定義的上傳函式
                />
              </div>

              {/* 提交按鈕 */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="btn-secondary mr-4"
                  disabled={isSubmitting}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
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
                    <>
                      <DocumentTextIcon className="h-4 w-4 mr-2" />
                      建立工單
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
