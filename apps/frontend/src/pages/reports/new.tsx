import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { 
  ArrowLeftIcon,
  DocumentTextIcon,
  PhotoIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import CategorySelector from '../../components/CategorySelector';
// 直接定義報告狀態常量，避免依賴 shared-types 中的枚舉
const ReportPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
};

// 不再使用舊的分類常量，改用 CategorySelector 中的三層級分類

// 定義創建通報請求的接口
interface CreateReportRequest {
  title: string;
  description: string;
  priority: string;
  categoryId: string;
  categoryPath: string;
  location: string;
  images?: string[];
}

export default function NewReport() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [previewImages, setPreviewImages] = useState<{file: File, preview: string}[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedCategoryPath, setSelectedCategoryPath] = useState<string>('');
  
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CreateReportRequest>();
  
  // 確保選擇的類別會更新到表單中
  React.useEffect(() => {
    if (selectedCategoryId) {
      setValue('categoryId', selectedCategoryId);
      setValue('categoryPath', selectedCategoryPath);
    }
  }, [selectedCategoryId, selectedCategoryPath, setValue]);
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const newFiles = Array.from(e.target.files);
    const newPreviews = newFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    
    setPreviewImages([...previewImages, ...newPreviews]);
  };
  
  const removeImage = (index: number) => {
    const newPreviews = [...previewImages];
    URL.revokeObjectURL(newPreviews[index].preview);
    newPreviews.splice(index, 1);
    setPreviewImages(newPreviews);
  };
  
  const onSubmit = async (data: CreateReportRequest) => {
    setIsSubmitting(true);
    setError(null);
    
    // 驗證是否選擇了分類
    if (!selectedCategoryId) {
      setError('請選擇通報類別');
      setIsSubmitting(false);
      return;
    }
    
    try {
      // 在實際應用中，這裡會先上傳圖片，然後將圖片 URL 加入到 data 中
      // 模擬圖片上傳
      const imageUrls = previewImages.map((img, index) => `https://example.com/images/report-${Date.now()}-${index}.jpg`);
      
      // 建立新通報物件
      const now = new Date();
      const newReport = {
        id: `${Date.now()}`, // 使用時間戳作為 ID
        title: data.title,
        description: data.description,
        status: 'UNCONFIRMED', // 新通報預設狀態
        priority: data.priority,
        category: 'OTHER', // 使用舊的類別常量，確保列表頁面能識別
        categoryId: data.categoryId, // 存儲新的分類 ID
        categoryPath: data.categoryPath, // 存儲分類路徑
        location: data.location,
        createdAt: now,
        updatedAt: now,
        creatorId: '1', // 模擬用戶 ID
        creator: { id: '1', name: '管理員', email: 'admin@example.com', role: 'ADMIN' },
        images: imageUrls
      };
      
      console.log('提交通報資料:', newReport);
      
      // 將新通報存入 localStorage
      try {
        // 先讀取現有通報
        const savedReportsStr = localStorage.getItem('oms-reports');
        let savedReports = [];
        
        if (savedReportsStr) {
          savedReports = JSON.parse(savedReportsStr);
        }
        
        // 添加新通報
        savedReports.unshift(newReport); // 添加到最前面
        
        // 存回 localStorage
        localStorage.setItem('oms-reports', JSON.stringify(savedReports));
      } catch (storageErr) {
        console.error('存儲通報失敗:', storageErr);
      }
      
      // 模擬 API 呼叫延遲
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 先導航到通報列表頁面，然後再顯示成功訊息
      // 使用 Next.js 的路由器導航
      await router.push('/reports');
      
      // 導航完成後顯示成功訊息
      setTimeout(() => {
        alert('通報已成功建立！');
      }, 100);
    } catch (err) {
      console.error('建立通報時發生錯誤:', err);
      setError('建立通報時發生錯誤，請稍後再試。');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <>
      <Head>
        <title>建立通報 | OMS 原型</title>
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
            <h1 className="text-2xl font-bold text-gray-900">建立新通報</h1>
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
        
        {/* 通報表單 */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* 通報標題 */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  通報標題 <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  {...register('title', { 
                    required: '請輸入通報標題',
                    maxLength: { value: 100, message: '標題不能超過 100 個字元' }
                  })}
                  className="form-input"
                  placeholder="請簡短描述問題"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>
              
              {/* 通報描述 */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  通報描述 <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  rows={5}
                  {...register('description', { 
                    required: '請輸入通報描述',
                    minLength: { value: 10, message: '描述至少需要 10 個字元' }
                  })}
                  className="form-input"
                  placeholder="請詳細描述問題，包括發生時間、影響範圍、重現步驟等"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>
              
              {/* 通報類別 - 使用三層級分類選擇器 */}
              <div>
                <input
                  type="hidden"
                  id="categoryId"
                  {...register('categoryId', { required: '請選擇通報類別' })}
                />
                <input
                  type="hidden"
                  id="categoryPath"
                  {...register('categoryPath')}
                />
                
                <CategorySelector 
                  onCategorySelect={(categoryId, categoryPath) => {
                    setSelectedCategoryId(categoryId);
                    setSelectedCategoryPath(categoryPath);
                  }}
                  selectedCategoryId={selectedCategoryId}
                />
                
                {errors.categoryId && (
                  <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
                )}
                
                {selectedCategoryId && (
                  <div className="mt-2 text-sm text-gray-700">
                    <span className="font-medium">已選擇：</span> {selectedCategoryPath}
                  </div>
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
                  <option value={ReportPriority.LOW}>低</option>
                  <option value={ReportPriority.MEDIUM}>中</option>
                  <option value={ReportPriority.HIGH}>高</option>
                  <option value={ReportPriority.URGENT}>緊急</option>
                </select>
                {errors.priority && (
                  <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>
                )}
              </div>
              
              {/* 地點 */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  問題地點 <span className="text-red-500">*</span>
                </label>
                <input
                  id="location"
                  type="text"
                  {...register('location', { 
                    required: '請輸入問題地點',
                    maxLength: { value: 100, message: '地點不能超過 100 個字元' }
                  })}
                  className="form-input"
                  placeholder="例如：總部大樓 3F 會議室"
                />
                {errors.location && (
                  <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
                )}
              </div>
              
              {/* 上傳圖片 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  上傳圖片（選填）
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>上傳圖片</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/*" onChange={handleImageUpload} />
                      </label>
                      <p className="pl-1">或拖放圖片至此處</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF 格式，每張不超過 10MB
                    </p>
                  </div>
                </div>
                
                {/* 預覽圖片 */}
                {previewImages.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {previewImages.map((img, index) => (
                      <div key={index} className="relative">
                        <img 
                          src={img.preview} 
                          alt={`Preview ${index}`} 
                          className="h-24 w-24 object-cover rounded-md"
                        />
                        <button
                          type="button"
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          onClick={() => removeImage(index)}
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                      提交通報
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
