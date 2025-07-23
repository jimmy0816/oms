import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { reportService, Report } from '@/services/reportService';
import { useAuth } from '@/contexts/AuthContext';
import CategorySelector from '@/components/CategorySelector';
import LocationSelector from '@/components/LocationSelector';
import FileUploader from '@/components/FileUploader';
import { Attachment, ReportPriority, FileInfo } from 'shared-types';
import { uploadService } from '@/services/uploadService';

export default function EditReport() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [categoryPath, setCategoryPath] = useState<string>('');
  const [priority, setPriority] = useState<ReportPriority>(
    ReportPriority.MEDIUM
  );
  const [locationId, setLocationId] = useState<number | undefined>(undefined);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<FileInfo[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reportUploadFunction = async (file: File): Promise<FileInfo> => {
    const { signedUrl, fileUrl, fileId } = await uploadService.getUploadUrl(
      file.name,
      file.type,
      'reports'
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

  // Fetch existing report data
  const fetchReport = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await reportService.getReportById(id as string);
      setTitle(data.title);
      setDescription(data.description);
      setCategoryId(data.categoryId);
      setPriority(data.priority as ReportPriority);
      setLocationId(data.location?.id);
      setAttachments(data.attachments || []);
      setUploadedFiles(data.attachments || []);
    } catch (err) {
      setError('無法載入通報資料');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleCategorySelect = (selectedId: string, categoryPath: string) => {
    setCategoryId(selectedId);
    setCategoryPath(categoryPath);
    if (categoryPath) {
      const mainCategory = categoryPath.split(' > ')[0];
      setTitle(mainCategory);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSaving(true);
    try {
      await reportService.updateReport(id as string, {
        title,
        description,
        categoryId,
        priority,
        locationId,
        attachments: uploadedFiles,
      });
      router.push(`/reports/${id}`);
    } catch (err) {
      setError('儲存失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">載入中...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-medium text-gray-900">發生錯誤</h2>
        <p className="mt-2 text-gray-600">{error}</p>
        <div className="mt-6">
          <Link href={`/reports/${id}`} className="btn-secondary">
            返回詳情頁
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>編輯通報 | OMS 原型</title>
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
            <h1 className="text-2xl font-bold text-gray-900">編輯通報 - #{id} {title}</h1>
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

        {/* 通報表單 */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <CategorySelector
                  selectedCategoryId={categoryId}
                  onCategorySelect={handleCategorySelect}
                />
              </div>
              <div>
                <label
                  htmlFor="priority"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  優先級 <span className="text-red-500">*</span>
                </label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as ReportPriority)
                  }
                  className="form-input"
                >
                  <option value={ReportPriority.LOW}>低</option>
                  <option value={ReportPriority.MEDIUM}>中</option>
                  <option value={ReportPriority.HIGH}>高</option>
                  <option value={ReportPriority.URGENT}>緊急</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  問題地點 <span className="text-red-500">*</span>
                </label>
                <LocationSelector value={locationId} onChange={setLocationId} />
              </div>
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  通報描述
                </label>
                <textarea
                  id="description"
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-input"
                  placeholder="請詳細描述問題，包括發生時間、影響範圍、重現步驟等"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  上傳檔案（選填）
                </label>
                <FileUploader
                  onFilesChange={setUploadedFiles}
                  uploadFunction={reportUploadFunction}
                  initialFiles={attachments}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="btn-secondary mr-4"
                  disabled={saving}
                >
                  取消
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? (
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
                      儲存中...
                    </>
                  ) : (
                    '儲存變更'
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
