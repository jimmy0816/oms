import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  ClockIcon,
  UserCircleIcon,
  MapPinIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import FileUploader, { UploadedFile } from '@/components/FileUploader';
import reportService, {
  Report,
  ReportStatus,
  ReportPriority,
} from '@/services/reportService';
import { useAuth } from '@/contexts/AuthContext';

const ReportCategory = {
  FACILITY: 'FACILITY',
  SECURITY: 'SECURITY',
  ENVIRONMENT: 'ENVIRONMENT',
  SERVICE: 'SERVICE',
  OTHER: 'OTHER',
};

export default function ReportDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [processing, setProcessing] = useState(false);
  const { user } = useAuth();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [newCommentContent, setNewCommentContent] = useState('');

  // 根據用戶角色設置權限
  const [userPermissions, setUserPermissions] = useState({
    canProcess: false, // process_reports 權限
    canClose: false, // close_reports 權限
    canReview: false, // review_reports 權限
  });

  // 模擬用戶角色與權限
  useEffect(() => {
    if (!user) return;
    setUserPermissions({
      canProcess: user.permissions?.includes('process_reports'),
      canClose: user.permissions?.includes('process_reports'),
      canReview: user.permissions?.includes('review_reports'),
    });
  }, [user]);

  // 從API獲取通報資料
  useEffect(() => {
    if (id) {
      setLoading(true);
      setError(null);

      reportService
        .getReportById(id as string)
        .then((data) => {
          setReport(data);
        })
        .catch((err) => {
          console.error('Error loading report:', err);
          setError('無法載入通報資料，請稍後再試');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentContent.trim() || !report?.id) return;

    setProcessing(true);
    try {
      await reportService.addCommentToReport(
        report.id,
        newCommentContent,
        user?.id.toString()
      );
      setNewCommentContent('');
      // 重新獲取更新後的通報資料
      const updatedReport = await reportService.getReportById(report.id);
      setReport(updatedReport);
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('新增留言失敗，請稍後再試');
    } finally {
      setProcessing(false);
    }
  };

  // 處理通報狀態更新
  const updateReportStatus = async (newStatus: string, log: string) => {
    if (!report || !id) return;

    setProcessing(true);

    try {
      // 使用reportService更新通報狀態
      await reportService.updateReportStatus(
        id.toString(),
        newStatus as ReportStatus
      );

      if (log) {
        await reportService.addActivityLog(
          id.toString(),
          log,
          user?.id.toString()
        );
      }

      // 重新獲取更新後的通報資料
      const updatedReport = await reportService.getReportById(id.toString());
      setReport(updatedReport);

      // 顯示成功訊息
      alert(`通報狀態已更新為${getStatusName(newStatus)}`);
    } catch (error) {
      console.error('Error updating report status:', error);
      alert('更新通報狀態失敗，請稍後再試');
    } finally {
      setProcessing(false);
    }
  };

  // 格式化日期
  const formatDate = (dateString: Date) => {
    return dateString.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 取得狀態顏色
  const getStatusColor = (status: string) => {
    switch (status) {
      case ReportStatus.PENDING:
        return 'bg-gray-100 text-gray-800';
      case ReportStatus.PROCESSING:
        return 'bg-blue-100 text-blue-800';
      case ReportStatus.RESOLVED:
        return 'bg-green-100 text-green-800';
      case ReportStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 取得優先級顏色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case ReportPriority.LOW:
        return 'bg-green-100 text-green-800';
      case ReportPriority.MEDIUM:
        return 'bg-blue-100 text-blue-800';
      case ReportPriority.HIGH:
        return 'bg-orange-100 text-orange-800';
      case ReportPriority.URGENT:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 取得類別名稱
  const getCategoryName = (category: string) => {
    switch (category) {
      case ReportCategory.FACILITY:
        return '設施設備';
      case ReportCategory.SECURITY:
        return '安全保全';
      case ReportCategory.ENVIRONMENT:
        return '環境清潔';
      case ReportCategory.SERVICE:
        return '服務品質';
      case ReportCategory.OTHER:
        return '其他';
      default:
        return '未分類';
    }
  };

  // 取得狀態名稱
  const getStatusName = (status: string) => {
    switch (status) {
      case ReportStatus.PENDING:
        return '待處理';
      case ReportStatus.PROCESSING:
        return '處理中';
      case ReportStatus.RESOLVED:
        return '已解決';
      case ReportStatus.REJECTED:
        return '已拒絕';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-medium text-gray-900">載入失敗</h2>
        <p className="mt-2 text-gray-600">{error}</p>
        <div className="mt-6 flex justify-center gap-4">
          <button
            className="btn-primary"
            onClick={() => {
              if (id) {
                setLoading(true);
                setError(null);
                reportService
                  .getReportById(id as string)
                  .then((data) => {
                    setReport(data);
                  })
                  .catch((err) => {
                    console.error('Error loading report:', err);
                    setError('無法載入通報資料，請稍後再試');
                  })
                  .finally(() => {
                    setLoading(false);
                  });
              }
            }}
          >
            重新載入
          </button>
          <Link href="/reports" className="btn-secondary">
            返回通報列表
          </Link>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium text-gray-900">找不到通報</h2>
        <p className="mt-2 text-gray-600">找不到 ID 為 {id} 的通報</p>
        <div className="mt-6">
          <Link href="/reports" className="btn-primary">
            返回通報列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{report.title} | 通報詳情 | OMS 原型</title>
      </Head>

      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* 返回按鈕 */}
          <div className="mb-4">
            <Link
              href="/reports"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              返回通報列表
            </Link>
          </div>

          <div className="flex flex-col lg:flex-row lg:space-x-8">
            {/* 左側主內容 */}
            <div className="flex-1 space-y-6">
              {/* 頁面標題 */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 truncate">
                  {report.title}
                </h1>
                <span className="text-sm text-gray-500">通報 #{report.id}</span>
              </div>

              {/* 狀態處理按鈕區塊 - debug 訊息 */}
              {/*
              <div
                className="mb-2 text-xs text-gray-400"
                style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}
              >
                <div>
                  DEBUG: userPermissions = {JSON.stringify(userPermissions)}
                </div>
                <div>
                  DEBUG: user.permissions = {JSON.stringify(user?.permissions)}
                </div>
                <div>DEBUG: report.status = {report.status}</div>
              </div>
              */}
              <div className="flex gap-2">
                {/* PENDING 狀態：處理者可操作 */}
                {userPermissions.canProcess &&
                  report.status === ReportStatus.PENDING && (
                    <>
                      <button
                        className="btn-primary"
                        onClick={() =>
                          updateReportStatus(
                            ReportStatus.PROCESSING,
                            '開始處理通報'
                          )
                        }
                        disabled={processing}
                      >
                        {processing ? '處理中...' : '開始處理'}
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() =>
                          updateReportStatus(
                            ReportStatus.REJECTED,
                            '此通報不處理'
                          )
                        }
                        disabled={processing}
                      >
                        不處理
                      </button>
                    </>
                  )}
                {/* PROCESSING 狀態：處理者可結案，直接進入待審核 */}
                {userPermissions.canClose &&
                  report.status === ReportStatus.PROCESSING && (
                    <button
                      className="btn-primary"
                      onClick={() =>
                        updateReportStatus(
                          ReportStatus.PENDING_REVIEW,
                          '處理完成，送審核'
                        )
                      }
                      disabled={processing}
                    >
                      {processing ? '處理中...' : '結案'}
                    </button>
                  )}
                {/* PENDING_REVIEW 狀態：審核者可通過/退回 */}
                {userPermissions.canReview &&
                  report.status === ReportStatus.PENDING_REVIEW && (
                    <>
                      <button
                        className="btn-primary"
                        onClick={() =>
                          updateReportStatus(ReportStatus.REVIEWED, '審核通過')
                        }
                        disabled={processing}
                      >
                        {processing ? '處理中...' : '通過'}
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() =>
                          updateReportStatus(
                            ReportStatus.PROCESSING,
                            '退回處理'
                          )
                        }
                        disabled={processing}
                      >
                        退回
                      </button>
                    </>
                  )}
              </div>

              {/* 通報詳細資訊 */}
              <div className="mt-6 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">描述</h3>
                  <p className="mt-1 text-gray-900 whitespace-pre-line">
                    {report.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">類別</h3>
                    <p className="mt-1 text-gray-900">
                      {getCategoryName(report.category)}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">地點</h3>
                    <div className="mt-1 flex items-center">
                      <MapPinIcon className="h-5 w-5 text-gray-400 mr-1" />
                      <p className="text-gray-900">{report.location}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      建立者
                    </h3>
                    <div className="mt-1 flex items-center">
                      <UserCircleIcon className="h-5 w-5 text-gray-400 mr-1" />
                      <p className="text-gray-900">
                        {report.creator?.name || '未知'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      建立時間
                    </h3>
                    <div className="mt-1 flex items-center">
                      <ClockIcon className="h-5 w-5 text-gray-400 mr-1" />
                      <p className="text-gray-900">
                        {formatDate(report.createdAt)}
                      </p>
                    </div>
                  </div>

                  {report.assignee && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        處理人員
                      </h3>
                      <div className="mt-1 flex items-center">
                        <UserCircleIcon className="h-5 w-5 text-gray-400 mr-1" />
                        <p className="text-gray-900">{report.assignee.name}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 顯示上傳的圖片和影片（新版，支援 attachments，含 Lightbox） */}
                {report.attachments && report.attachments.length > 0 && (
                  <div className="mt-6 border-t border-gray-100 pt-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">
                      上傳的檔案
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      {report.attachments.map((file: any) => (
                        <div key={file.id} className="w-40">
                          {file.fileType.startsWith('image') ? (
                            <>
                              <img
                                src={file.url}
                                alt={file.filename}
                                className="rounded shadow border w-full h-32 object-cover cursor-pointer transition-transform hover:scale-105"
                                onClick={() => setPreviewImage(file.url)}
                              />
                              <div className="text-xs text-gray-500 mt-1 truncate">{file.filename}</div>
                            </>
                          ) : file.fileType.startsWith('video') ? (
                            <>
                              <video
                                src={file.url}
                                controls
                                className="rounded shadow border w-full h-32 object-cover"
                              />
                              <div className="text-xs text-gray-500 mt-1 truncate">{file.filename}</div>
                            </>
                          ) : (
                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                              {file.filename}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Lightbox 放大預覽 */}
                    {previewImage && (
                      <div
                        className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
                        onClick={() => setPreviewImage(null)}
                      >
                        <img
                          src={previewImage}
                          alt="預覽"
                          className="max-h-[80vh] max-w-[90vw] rounded shadow-lg border-4 border-white"
                          onClick={e => e.stopPropagation()}
                        />
                        <button
                          className="absolute top-8 right-8 text-white text-3xl font-bold"
                          onClick={() => setPreviewImage(null)}
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 通報歷程（明顯區隔卡片） */}
              <div className="p-6 mt-6 bg-white rounded-lg shadow-lg border border-gray-200">
                <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2 text-blue-400" />
                  處理歷程
                </h3>
                <div className="flow-root">
                  <ul className="-mb-8">
                    {report.activityLogs && report.activityLogs.length > 0 ? (
                      report.activityLogs.map(
                        (event: any, eventIdx: number) => (
                          <li key={event.id}>
                            <div className="relative pb-8">
                              {eventIdx !== report.activityLogs.length - 1 ? (
                                <span
                                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                  aria-hidden="true"
                                ></span>
                              ) : null}
                              <div className="relative flex space-x-3">
                                <div>
                                  <span
                                    className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white bg-blue-100 text-blue-800`}
                                  >
                                    <ClockIcon className="h-5 w-5" />
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                  <div>
                                    <p className="text-sm text-gray-700">
                                      <span className="font-semibold text-blue-700">
                                        {event.user?.name || '系統'}
                                      </span>
                                      <span className="mx-2 text-gray-400">
                                        |
                                      </span>
                                      <span className="text-xs text-gray-400">
                                        {formatDate(event.createdAt)}
                                      </span>
                                    </p>
                                    {event.content && (
                                      <div className="mt-1 text-sm text-gray-900 bg-gray-50 rounded px-3 py-2 border border-gray-100">
                                        {event.content}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </li>
                        )
                      )
                    ) : (
                      <li>
                        <div className="text-gray-400 text-sm">
                          尚無處理歷程
                        </div>
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {/* 留言功能區塊 */}
              <div className="p-6 mt-6 bg-white rounded-lg shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  留言討論
                </h3>
                {/* 留言列表 */}
                <div className="space-y-4 mb-4">
                  {report.comments && report.comments.length > 0 ? (
                    report.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="flex items-start space-x-3"
                      >
                        <div className="flex-shrink-0">
                          <UserCircleIcon className="h-8 w-8 text-gray-400" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {comment.user?.name || '未知用戶'}{' '}
                            <span className="text-xs text-gray-400 ml-2">
                              {formatDate(comment.createdAt)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700">
                            {comment.content}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-sm">目前尚無留言</div>
                  )}
                </div>
                {/* 新增留言輸入框 */}
                <form
                  className="flex items-end space-x-2"
                  onSubmit={handleAddComment}
                >
                  <textarea
                    className="flex-1 border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="輸入留言..."
                    value={newCommentContent}
                    onChange={(e) => setNewCommentContent(e.target.value)}
                    disabled={processing}
                  />
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={processing}
                  >
                    {processing ? '發佈中...' : '發佈'}
                  </button>
                </form>
              </div>
            </div>

            {/* 右側相關工單區塊 */}
            <div className="w-full lg:w-80 flex-shrink-0 mt-8 lg:mt-0">
              <div className="p-6 bg-white rounded-lg shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  相關工單
                </h3>
                {report.tickets && report.tickets.length > 0 ? (
                  <ul className="divide-y divide-gray-100 mb-4">
                    {report.tickets.map((reportTicket) => (
                      <li
                        key={reportTicket.ticket.id}
                        className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-blue-700 text-sm break-words">
                            {reportTicket.ticket.title}
                          </p>
                          <p className="text-gray-500 text-xs mt-0.5 break-all">
                            工單 #{reportTicket.ticket.id}
                          </p>
                        </div>
                        <Link
                          href={`/tickets/${reportTicket.ticket.id}`}
                          className="text-blue-600 hover:underline text-sm mt-2 sm:mt-0 sm:ml-4 flex-shrink-0"
                        >
                          查看
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-500 mb-4">目前尚無相關工單</div>
                )}
                <Link
                  href={`/tickets/new?reportId=${report.id}`}
                  className="btn-primary w-full block text-center"
                >
                  新增工單
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
