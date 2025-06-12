import React, { useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { 
  ArrowLeftIcon,
  DocumentTextIcon,
  PhotoIcon,
  XMarkIcon,
  FilmIcon
} from '@heroicons/react/24/outline';
import { TicketPriority, TicketStatus } from 'shared-types';

// 定義表單資料型別
interface TicketFormData {
  title: string;
  description: string;
  priority: TicketPriority;
  assigneeId?: string;
}

// 定義上傳檔案類型
interface UploadedFile {
  id: string;
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
}

export default function NewTicket() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 模擬用戶數據
  const users = [
    { id: '1', name: '李小明', role: 'REPORT_PROCESSOR' },
    { id: '2', name: '王大明', role: 'REPORT_REVIEWER' },
    { id: '3', name: '張小芳', role: 'CUSTOMER_SERVICE' },
    { id: '4', name: '陳志明', role: 'MAINTENANCE_WORKER' },
    { id: '5', name: '林小楠', role: 'MAINTENANCE_WORKER' },
  ];
  
  const { register, handleSubmit, formState: { errors } } = useForm<TicketFormData>();
  
  // 處理檔案上傳
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // 處理每個選擇的檔案
    Array.from(files).forEach(file => {
      // 檢查檔案類型
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        alert('只支援圖片和影片檔案');
        return;
      }

      // 建立預覽 URL
      const previewUrl = URL.createObjectURL(file);
      
      // 新增到上傳檔案列表
      setUploadedFiles(prev => [
        ...prev,
        {
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          previewUrl,
          type: isImage ? 'image' : 'video'
        }
      ]);
    });
    
    // 清空 input 值，允許重複上傳相同檔案
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 移除上傳的檔案
  const removeFile = (id: string) => {
    setUploadedFiles(prev => {
      const updatedFiles = prev.filter(file => file.id !== id);
      
      // 釋放已移除檔案的 URL
      const fileToRemove = prev.find(file => file.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      
      return updatedFiles;
    });
  };

  const onSubmit = async (data: TicketFormData) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // 在實際應用中，這裡會呼叫 API 建立工單
      console.log('提交工單資料:', data);
      console.log('上傳檔案:', uploadedFiles);
      
      // 模擬 API 呼叫延遲
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 創建新工單物件
      const now = new Date();
      const timestamp = now.toISOString();
      
      // 處理檔案資訊 (實際環境中會上傳到伺服器)
      const attachments = uploadedFiles.map(file => ({
        id: file.id,
        name: file.file.name,
        type: file.type,
        size: file.file.size,
        url: file.previewUrl // 實際環境中這會是伺服器上的 URL
      }));
      
      // 創建活動記錄
      const createActivityLog = {
        id: `activity-${Date.now()}`,
        type: 'CREATE',
        timestamp,
        user: { id: '1', name: '李小明', role: 'REPORT_PROCESSOR' },
        details: {
          title: data.title,
          priority: data.priority,
          attachmentCount: attachments.length
        }
      };
      
      // 如果有指派人員，增加指派活動記錄
      let assignActivityLog = null;
      if (data.assigneeId) {
        const assignee = users.find(u => u.id === data.assigneeId);
        assignActivityLog = {
          id: `activity-${Date.now() + 1}`,
          type: 'ASSIGN',
          timestamp,
          user: { id: '1', name: '李小明', role: 'REPORT_PROCESSOR' },
          details: {
            assigneeId: data.assigneeId,
            assigneeName: assignee ? assignee.name : '未知用戶',
            assigneeRole: assignee ? assignee.role : ''
          }
        };
      }
      
      const newTicket = {
        id: `ticket-${Date.now()}`,
        title: data.title,
        description: data.description,
        status: TicketStatus.PENDING, // 初始狀態為「待接單」
        priority: data.priority,
        createdAt: timestamp,
        updatedAt: timestamp,
        creatorId: '1', // 假設當前用戶 ID
        creator: { id: '1', name: '李小明', role: 'REPORT_PROCESSOR' },
        assigneeId: data.assigneeId || null,
        assignee: data.assigneeId ? users.find(u => u.id === data.assigneeId) : null,
        comments: [],
        attachments: attachments, // 新增附件資訊
        activityLogs: assignActivityLog ? 
          [createActivityLog, assignActivityLog] : 
          [createActivityLog]
      };
      
      // 從 localStorage 讀取現有工單
      const existingTicketsStr = localStorage.getItem('oms-tickets');
      let existingTickets = [];
      
      if (existingTicketsStr) {
        try {
          const parsed = JSON.parse(existingTicketsStr);
          // 確保是數組
          existingTickets = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          console.error('解析現有工單時出錯:', e);
          // 解析錯誤時使用空數組
          existingTickets = [];
        }
      }
      
      // 將新工單添加到列表中
      const updatedTickets = [newTicket, ...existingTickets];
      
      // 存回 localStorage
      localStorage.setItem('oms-tickets', JSON.stringify(updatedTickets));
      
      // 顯示成功訊息
      alert('工單已成功建立！');
      
      // 導向到工單列表頁面
      router.push('/tickets');
    } catch (err) {
      console.error('建立工單時發生錯誤:', err);
      setError('建立工單時發生錯誤，請稍後再試。');
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
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
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
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  工單標題 <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  {...register('title', { 
                    required: '請輸入工單標題',
                    maxLength: { value: 100, message: '標題不能超過 100 個字元' }
                  })}
                  className="form-input"
                  placeholder="請簡短描述問題"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>
              
              {/* 工單描述 */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  工單描述 <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  rows={5}
                  {...register('description', { 
                    required: '請輸入工單描述',
                    minLength: { value: 10, message: '描述至少需要 10 個字元' }
                  })}
                  className="form-input"
                  placeholder="請詳細描述問題，包括發生時間、影響範圍、重現步驟等"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>
              
              {/* 優先級 */}
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
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
                  <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>
                )}
              </div>
              
              {/* 指派人員 */}
              <div>
                <label htmlFor="assigneeId" className="block text-sm font-medium text-gray-700 mb-1">
                  指派人員
                </label>
                <select
                  id="assigneeId"
                  {...register('assigneeId')}
                  className="form-input"
                >
                  <option value="">未指派</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>
              
              {/* 上傳圖片/影片 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  上傳圖片或影片
                </label>
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                    >
                      <div className="flex items-center">
                        <PhotoIcon className="h-5 w-5 mr-2 text-gray-500" />
                        <span>選擇圖片或影片</span>
                      </div>
                    </label>
                    <p className="ml-3 text-xs text-gray-500">
                      支援 JPG, PNG, GIF, MP4 等格式
                    </p>
                  </div>
                  
                  {/* 預覽上傳的檔案 */}
                  {uploadedFiles.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                      {uploadedFiles.map(file => (
                        <div key={file.id} className="relative group border rounded-md overflow-hidden">
                          {file.type === 'image' ? (
                            <img
                              src={file.previewUrl}
                              alt={file.file.name}
                              className="h-32 w-full object-cover"
                            />
                          ) : (
                            <div className="h-32 w-full bg-gray-100 flex items-center justify-center">
                              <FilmIcon className="h-12 w-12 text-gray-400" />
                              <span className="sr-only">{file.file.name}</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeFile(file.id)}
                            className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-sm opacity-70 hover:opacity-100"
                          >
                            <XMarkIcon className="h-4 w-4 text-gray-700" />
                          </button>
                          <div className="p-1 bg-white text-xs truncate">
                            {file.file.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
