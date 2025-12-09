import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  ClockIcon,
  UserCircleIcon,
  MapPinIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';
import {
  reportService,
  Report,
  getStatusName,
  getStatusColor,
  getStatusIcon,
  getPriorityText,
  getPriorityColor,
} from '@/services/reportService';
import {
  getStatusText as getTicketStatusText,
  getPriorityText as getTicketPriorityText,
  getStatusColor as getTicketStatusColor,
  getPriorityColor as getTicketPriorityColor,
} from '@/services/ticketService';
import {
  ReportStatus,
  ReportPriority,
  Category,
  Permission,
} from 'shared-types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { categoryService, getCategoryPath } from '@/services/categoryService';
import PermissionGuard from '@/components/PermissionGuard';
import DatePicker from 'react-datepicker';
import { zhTW } from 'date-fns/locale';
import HeicImage from '@/components/HeicImage';

export default function ReportDetail() {
  const router = useRouter();
  const { id, returnUrl } = router.query;
  const backPath = (returnUrl as string) || '/reports';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [processing, setProcessing] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [trackingDate, setTrackingDate] = useState<Date | null>(null);
  const { user, hasPermission } = useAuth();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const { showToast } = useToast();
  const [currentPath, setCurrentPath] = useState('');

  // 從API獲取通報資料
  const fetchReport = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await reportService.getReportById(id as string);
      setReport(data);
    } catch (err) {
      console.error('Error loading report:', err);
      setError('無法載入通報資料，請稍後再試');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const fetchedCategories = await categoryService.getAllCategories();
        setCategories(fetchedCategories);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchReport();
    if (typeof window !== 'undefined') {
      setCurrentPath(window.location.pathname + window.location.search);
    }
  }, [fetchReport]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      const url = window.location.origin + window.location.pathname;
      navigator.clipboard.writeText(url);
      showToast('連結已複製到剪貼簿', 'success');
    }
  };

  const handleDelete = async () => {
    if (!report) return;

    if (
      window.confirm(`您確定要刪除通報 "${report.title}" 嗎？此操作無法復原。`)
    ) {
      setProcessing(true);

      try {
        await reportService.deleteReport(report.id);
        showToast('通報已刪除成功', 'success');
        router.push(backPath);
      } catch (error) {
        console.error('Error deleting report:', error);
        showToast('刪除失敗，請稍後再試', 'error');
        setProcessing(false);
      }
    }
  };

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
      fetchReport(); // Re-fetch report to update comments
      showToast('留言已成功新增！', 'success');
    } catch (error) {
      console.error('Error adding comment:', error);
      showToast('新增留言失敗，請稍後再試', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // 處理通報狀態更新
  const updateReportStatus = async (
    log: string,
    updateData: Partial<Report>
  ) => {
    if (!report || !id) return;

    setProcessing(true);

    try {
      const finalUpdateData = { ...updateData };
      if (finalUpdateData.assigneeId) {
        finalUpdateData.assigneeId = finalUpdateData.assigneeId.toString();
      }

      if (finalUpdateData.trackingDate) {
        const date = new Date(finalUpdateData.trackingDate);
        const offset = date.getTimezoneOffset() * 60000;
        (finalUpdateData.trackingDate as any) = new Date(
          date.getTime() - offset
        );
      }

      await reportService.updateReport(id.toString(), finalUpdateData);

      if (log) {
        await reportService.addActivityLog(
          id.toString(),
          log,
          user?.id.toString()
        );
      }

      fetchReport(); // Re-fetch report to update status and logs

      if (updateData.status) {
        showToast(
          `通報狀態已更新為 ${getStatusName(updateData.status as string)}`,
          'success'
        );
      } else {
        showToast('通報已更新', 'success');
      }
    } catch (error) {
      console.error('Error updating report status:', error);
      showToast('更新通報狀態失敗，請稍後再試', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // 格式化日期
  const formatDate = (date: Date | string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateOnly = (date: Date | string) => {
    if (!date) return '-';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 取得狀態顏色和圖標
  const getStatusInfo = (status: string) => {
    const IconComponent = getStatusIcon(status);
    return {
      color: getStatusColor(status),
      icon: <IconComponent className="h-3 w-3 mr-1" />,
    };
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
          <Link href={backPath} className="btn-secondary">
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
          <Link href={backPath} className="btn-primary">
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
              href={backPath}
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
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <h1 className="text-2xl font-bold text-gray-900 truncate">
                    {report.title}
                  </h1>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleShare}
                      className="btn-icon text-gray-600 hover:text-gray-900"
                      title="分享連結"
                    >
                      <ShareIcon className="h-5 w-5" />
                    </button>
                    {hasPermission(Permission.EDIT_REPORTS) && (
                      <Link
                        href={`/reports/${report.id}/edit`}
                        className="btn-icon text-blue-600 hover:text-blue-900"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </Link>
                    )}
                    {hasPermission(Permission.DELETE_REPORTS) && (
                      <button
                        onClick={handleDelete}
                        className="btn-icon-danger text-red-600 hover:text-red-900"
                        disabled={processing}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-gray-300 ${
                      getStatusInfo(report.status).color
                    }`}
                  >
                    {getStatusInfo(report.status).icon}
                    {getStatusName(report.status)}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-gray-300 ${getPriorityColor(
                      report.priority
                    )}`}
                  >
                    {getPriorityText(report.priority as ReportPriority)}
                  </span>
                </div>
                <span className="text-sm text-gray-500 mt-1 inline-block">
                  通報 #{report.id}
                </span>
              </div>

              {/* 狀態處理按鈕區塊 */}
              {hasPermission(Permission.PROCESS_REPORTS) &&
                report.status === ReportStatus.UNCONFIRMED && (
                  <div className="flex gap-2">
                    <button
                      className="btn-primary"
                      onClick={() => {
                        setIsDatePickerOpen(true);
                        setTrackingDate(new Date());
                      }}
                      disabled={processing}
                    >
                      {processing ? '處理中...' : '開始處理'}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() =>
                        updateReportStatus('此通報不處理', {
                          status: ReportStatus.REJECTED,
                        })
                      }
                      disabled={processing}
                    >
                      不處理
                    </button>
                  </div>
                )}
              {hasPermission(Permission.PROCESS_REPORTS) &&
                (report.status === ReportStatus.PROCESSING ||
                  report.status === ReportStatus.RETURNED) && (
                  <div className="flex gap-2">
                    <button
                      className="btn-primary"
                      onClick={() =>
                        updateReportStatus('處理完成，送審核', {
                          status: ReportStatus.PENDING_REVIEW,
                        })
                      }
                      disabled={processing}
                    >
                      {processing ? '處理中...' : '處理完成'}
                    </button>
                  </div>
                )}
              {hasPermission(Permission.REVIEW_REPORTS) &&
                report.status === ReportStatus.PENDING_REVIEW && (
                  <div className="flex gap-2">
                    <button
                      className="btn-primary"
                      onClick={() =>
                        updateReportStatus('審核通過', {
                          status: ReportStatus.REVIEWED,
                        })
                      }
                      disabled={processing}
                    >
                      {processing ? '處理中...' : '通過'}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() =>
                        updateReportStatus('退回處理', {
                          status: ReportStatus.RETURNED,
                        })
                      }
                      disabled={processing}
                    >
                      退回
                    </button>
                  </div>
                )}
              {hasPermission(Permission.REVIEW_REPORTS) &&
                report.status === ReportStatus.REJECTED && (
                  <div className="flex gap-2">
                    <button
                      className="btn-primary"
                      onClick={() =>
                        updateReportStatus('重新開啟通報 (設為待確認)', {
                          status: ReportStatus.UNCONFIRMED,
                        })
                      }
                      disabled={processing}
                    >
                      {processing ? '處理中...' : '重新確認'}
                    </button>
                  </div>
                )}

              {/* 通報詳細資訊 */}
              <div className="mt-6 space-y-4">
                {report.description && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">描述</h3>
                    <p className="mt-1 text-gray-900 whitespace-pre-line">
                      {report.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-gray-500">類別</h3>
                    <div className="flex items-center mt-1">
                      <p className="text-gray-900">
                        {getCategoryPath(report.categoryId, categories)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">地點</h3>
                    <div className="mt-1 flex items-center">
                      <MapPinIcon className="h-5 w-5 text-gray-400 mr-1" />
                      <p className="text-gray-900">{report.location?.name}</p>
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

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      追蹤日期
                    </h3>
                    <div className="mt-1 flex items-center">
                      <ClockIcon className="h-5 w-5 text-gray-400 mr-1" />
                      <p className="text-gray-900">
                        {report.trackingDate
                          ? formatDateOnly(report.trackingDate)
                          : '-'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      處理人員
                    </h3>
                    <div className="mt-1 flex items-center">
                      <UserCircleIcon className="h-5 w-5 text-gray-400 mr-1" />
                      <p className="text-gray-900">
                        {report?.assignee?.name ? report.assignee.name : '-'}
                      </p>
                    </div>
                  </div>
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
                              <HeicImage
                                src={file.url}
                                alt={file.filename}
                                className="rounded shadow border w-full h-32 object-cover cursor-pointer transition-transform hover:scale-105"
                                onClick={() => setPreviewImage(file.url)}
                              />
                              <div className="text-xs text-gray-500 mt-1 truncate">
                                {file.filename}
                              </div>
                            </>
                          ) : file.fileType.startsWith('video') ? (
                            <>
                              <video
                                src={file.url}
                                controls
                                className="rounded shadow border w-full h-32 object-cover"
                              />
                              <div className="text-xs text-gray-500 mt-1 truncate">
                                {file.filename}
                              </div>
                            </>
                          ) : (
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline"
                            >
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
                        <HeicImage
                          src={previewImage}
                          alt="預覽"
                          className="max-h-[80vh] max-w-[90vw] rounded shadow-lg border-4 border-white"
                          onClick={(e) => e.stopPropagation()}
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

              {/* 相關工單（主內容區） */}
              <PermissionGuard required={Permission.VIEW_TICKETS}>
                <div className="p-6 mt-6 bg-white rounded-lg shadow-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 items-center">
                    相關工單
                  </h3>
                  {report.tickets && report.tickets.length > 0 ? (
                    <ul className="space-y-3">
                      {report.tickets.map((reportTicket) => (
                        <li
                          key={reportTicket.ticket.id}
                          className="bg-white border rounded-lg shadow-sm"
                        >
                          <div
                            className="flex flex-wrap items-center justify-between gap-y-2 gap-x-4 p-4 cursor-pointer"
                            onClick={() =>
                              setOpenTicketId(
                                openTicketId === reportTicket.ticket.id
                                  ? null
                                  : reportTicket.ticket.id
                              )
                            }
                          >
                            <div>
                              <Link
                                href={`/tickets/${reportTicket.ticket.id}`}
                                className="text-blue-600 hover:underline font-semibold text-lg"
                              >
                                {reportTicket.ticket.title}
                              </Link>
                              <p className="text-gray-500 text-sm">
                                工單 #{reportTicket.ticket.id}
                              </p>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${getTicketStatusColor(
                                  reportTicket.ticket.status
                                )}`}
                              >
                                {getTicketStatusText(
                                  reportTicket.ticket.status
                                )}
                              </span>
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${getTicketPriorityColor(
                                  reportTicket.ticket.priority
                                )}`}
                              >
                                {getTicketPriorityText(
                                  reportTicket.ticket.priority
                                )}
                              </span>
                              <ChevronDownIcon
                                className={`h-6 w-6 text-gray-400 transition-transform ${
                                  openTicketId === reportTicket.ticket.id
                                    ? 'transform rotate-180'
                                    : ''
                                }`}
                              />
                            </div>
                          </div>
                          {openTicketId === reportTicket.ticket.id && (
                            <div className="p-4 border-t border-gray-200">
                              <div className="flow-root">
                                <p className="text-sm font-medium text-gray-700 mb-2">
                                  工單歷程:
                                </p>
                                <ul className="-mb-8">
                                  {reportTicket.ticket.activityLogs &&
                                  reportTicket.ticket.activityLogs.length >
                                    0 ? (
                                    reportTicket.ticket.activityLogs.map(
                                      (log: any, logIdx: number) => (
                                        <li key={log.id}>
                                          <div className="relative pb-8">
                                            {logIdx !==
                                            reportTicket.ticket.activityLogs
                                              .length -
                                              1 ? (
                                              <span
                                                className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                                aria-hidden="true"
                                              ></span>
                                            ) : null}
                                            <div className="relative flex space-x-3">
                                              <div>
                                                <span
                                                  className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white bg-gray-100 text-gray-800`}
                                                >
                                                  <ClockIcon className="h-5 w-5" />
                                                </span>
                                              </div>
                                              <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                                <div>
                                                  <p className="text-sm text-gray-700">
                                                    <span className="font-semibold text-gray-700">
                                                      {log.user?.name || '系統'}
                                                    </span>
                                                    <span className="mx-2 text-gray-400">
                                                      |
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                      {formatDate(
                                                        log.createdAt
                                                      )}
                                                    </span>
                                                  </p>
                                                  {log.content && (
                                                    <div className="mt-1 text-sm text-gray-900 bg-gray-50 rounded px-3 py-2 border border-gray-100">
                                                      {log.content}
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
                                        尚無工單歷程
                                      </div>
                                    </li>
                                  )}
                                </ul>
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-gray-500 mb-4">目前尚無相關工單</div>
                  )}
                  <Link
                    href={`/tickets/new?reportId=${
                      report.id
                    }&returnUrl=${encodeURIComponent(currentPath)}`}
                    className="btn-primary w-full block text-center mt-6"
                  >
                    新增工單
                  </Link>
                </div>
              </PermissionGuard>

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
            <div className="w-full lg:w-80 flex-shrink-0 mt-8 lg:mt-0">
              <div className="p-6 bg-white rounded-lg shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
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
                                <div className="min-w-0 flex-1 pt-1.5">
                                  <div className="flex flex-col">
                                    <p className="text-sm text-gray-700 font-semibold">
                                      {event.user?.name || '系統'}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      {formatDate(event.createdAt)}
                                    </p>
                                  </div>
                                  {event.content && (
                                    <div className="mt-1 text-sm text-gray-900 bg-gray-50 rounded px-3 py-2 border border-gray-100">
                                      {event.content}
                                    </div>
                                  )}
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
            </div>
          </div>
        </div>
      </div>

      {isDatePickerOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              請選擇追蹤日期
            </h3>
            <DatePicker
              selected={trackingDate}
              onChange={(date: Date) => setTrackingDate(date)}
              dateFormat="yyyy/MM/dd"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              locale={zhTW}
              wrapperClassName="w-full"
              placeholderText="YYYY/MM/DD"
            />
            <div className="mt-4 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(false)}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  if (trackingDate && user) {
                    updateReportStatus('開始處理通報', {
                      status: ReportStatus.PROCESSING,
                      trackingDate: trackingDate,
                      assigneeId: user.id,
                    });
                    setIsDatePickerOpen(false);
                  }
                }}
                className="btn-primary"
                disabled={!trackingDate}
              >
                確認
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
