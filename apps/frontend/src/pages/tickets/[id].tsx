import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  ticketService,
  getStatusText,
  getPriorityText,
  getStatusColor,
  getPriorityColor,
} from '@/services/ticketService';
import { uploadService } from '@/services/uploadService';
import { TicketStatus, Permission, FileInfo } from 'shared-types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import TicketReviewForm from '@/components/TicketReviewForm';
import TicketReviewDetailModal from '@/components/TicketReviewDetailModal';
import PermissionGuard from '@/components/PermissionGuard';

export default function TicketDetail() {
  const router = useRouter();
  const { id, returnUrl } = router.query;
  const backPath = (returnUrl as string) || '/tickets';
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any>(null);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { user, hasPermission } = useAuth();
  const { showToast } = useToast();
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [reviewType, setReviewType] = useState<'COMPLETED' | 'FAILED'>(
    'COMPLETED'
  );
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [showAllActivityLogs, setShowAllActivityLogs] = useState(false);

  const fetchTicket = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const ticketData = await ticketService.getTicketById(id as string);
      setTicket(ticketData);
    } catch (error) {
      console.error('獲取工單詳情時出錯:', error);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchTicket();
    }
  }, [id]);

  useEffect(() => {
    if (isReviewFormOpen || selectedReview) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isReviewFormOpen, selectedReview]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentContent.trim() || !ticket?.id || !user?.id) return;

    try {
      await ticketService.addCommentToTicket(
        ticket.id,
        newCommentContent,
        user.id
      );
      setNewCommentContent('');
      await fetchTicket();
      showToast('留言已成功新增！', 'success');
    } catch (error) {
      console.error('Error adding comment:', error);
      showToast('新增留言失敗，請稍後再試', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleClaim = async () => {
    if (!ticket?.id || !user?.id) return;

    try {
      await ticketService.claimTicket(ticket.id, user.id);
      await fetchTicket();
      showToast('認領成功！', 'success');
    } catch (error) {
      console.error('Error claiming ticket:', error);
      showToast('認領失敗，請稍後再試', 'error');
    }
  };

  const handleAbandon = async () => {
    if (!ticket?.id || !user?.id) return;

    try {
      await ticketService.abandonTicket(ticket.id, user.id);
      await fetchTicket();
      showToast('放棄成功！', 'success');
    } catch (error) {
      console.error('Error abandoning ticket:', error);
      showToast('放棄失敗，請稍後再試', 'error');
    }
  };

  const handleDelete = async (ticketId: string, ticketTitle: string) => {
    if (
      window.confirm(`您確定要刪除工單「${ticketTitle}」嗎？此操作無法復原。`)
    ) {
      try {
        await ticketService.deleteTicket(ticketId);
        showToast('工單已成功刪除！', 'success');
        router.push(backPath);
      } catch (error) {
        console.error('刪除工單失敗:', error);
        showToast('刪除工單失敗，請稍後再試。', 'error');
      }
    }
  };

  const updateTicketStatus = async (newStatus: TicketStatus, log: string) => {
    if (!ticket?.id || !user?.id) return;

    try {
      await ticketService.updateTicketStatus(ticket.id, newStatus);
      if (log) {
        await ticketService.addActivityLog(ticket.id, log, user.id);
      }
      await fetchTicket();
      showToast(`工單狀態已更新為 ${getStatusText(newStatus)}`, 'success');
    } catch (error) {
      console.error('Error updating ticket status:', error);
      showToast('更新工單狀態失敗，請稍後再試', 'error');
    }
  };

  const ticketReviewUploadFunction = async (file: File): Promise<FileInfo> => {
    const { signedUrl, fileUrl, fileId } = await uploadService.getUploadUrl(
      file.name,
      file.type,
      'ticket-reviews'
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
      filename: file.name,
      url: fileUrl,
      fileType: file.type,
      fileSize: file.size,
    };
  };

  const handleReviewSubmit = async (
    content: string,
    attachments: FileInfo[]
  ) => {
    if (!ticket?.id) return;
    setIsSubmittingReview(true);
    try {
      await ticketService.submitTicketReview(
        ticket.id,
        content,
        attachments,
        reviewType
      );
      setIsReviewFormOpen(false);
      await fetchTicket();
      showToast('審核已成功送出', 'success');
    } catch (error) {
      console.error('Error submitting review:', error);
      showToast('提交審核失敗，請稍後再試', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">工單不存在</h2>
        <p className="mt-2 text-gray-600">找不到 ID 為 {id} 的工單</p>
        <div className="mt-6">
          <Link href="/tickets" className="btn-primary">
            返回工單列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{ticket.title} | 工單詳情 | OMS 原型</title>
      </Head>

      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.back()}
            className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="返回"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 truncate">
            {ticket.title}
          </h1>
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-hidden relative">
          <div className="absolute top-4 right-4 flex items-center space-x-2">
            <PermissionGuard required={Permission.EDIT_TICKETS}>
              <Link
                href={`/tickets/${ticket.id}/edit`}
                className="text-blue-600 hover:text-blue-900 p-2 bg-white rounded-full shadow-md"
                title="編輯"
              >
                <PencilIcon className="h-6 w-6" />
              </Link>
            </PermissionGuard>
            <PermissionGuard required={Permission.DELETE_TICKETS}>
              <button
                onClick={() => handleDelete(ticket.id, ticket.title)}
                className="text-red-600 hover:text-red-900 p-2 bg-white rounded-full shadow-md"
                title="刪除"
              >
                <TrashIcon className="h-6 w-6" />
              </button>
            </PermissionGuard>
          </div>
          <div className="p-6 border-b border-gray-200">
            <div className="text-sm text-gray-600 flex flex-wrap items-center justify-between gap-4 mb-4">
              #{ticket.id}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(
                    ticket.status
                  )}`}
                >
                  {getStatusText(ticket.status)}
                </span>
                <span
                  className={`px-3 py-1 text-sm font-semibold rounded-full ${getPriorityColor(
                    ticket.priority
                  )}`}
                >
                  {getPriorityText(ticket.priority)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-8 text-sm">
              <div>
                <h3 className="font-medium text-gray-500">處理人</h3>
                <p className="mt-1 text-gray-800">
                  {ticket.assignee?.name || '尚未指派'}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-500">創建時間</h3>
                <p className="mt-1 text-gray-800">
                  {formatDate(ticket.createdAt)}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-500">更新時間</h3>
                <p className="mt-1 text-gray-800">
                  {formatDate(ticket.updatedAt)}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-500">指派角色</h3>
                <p className="mt-1 text-gray-800">
                  {ticket.role?.description || '未指定'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {(ticket.assigneeId == null || ticket.assigneeId === user.id) &&
                ticket.status === TicketStatus.PENDING &&
                hasPermission(Permission.CLAIM_TICKETS) &&
                (user.primaryRole?.id === ticket.role?.id ||
                  (user.additionalRoles &&
                    user.additionalRoles.some(
                      (r) => r.id === ticket.role?.id
                    ))) && (
                  <button className="btn-primary" onClick={handleClaim}>
                    認領工單
                  </button>
                )}
              {(ticket.status === TicketStatus.IN_PROGRESS ||
                ticket.status === TicketStatus.VERIFICATION_FAILED) &&
                hasPermission(Permission.COMPLETE_TICKETS) &&
                user.id === ticket.assigneeId && (
                  <>
                    <button
                      className="btn-primary"
                      onClick={() => {
                        setReviewType('COMPLETED');
                        setIsReviewFormOpen(true);
                      }}
                      disabled={isSubmittingReview}
                    >
                      {isSubmittingReview ? '提交中...' : '送出審核'}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setReviewType('FAILED');
                        setIsReviewFormOpen(true);
                      }}
                    >
                      無法完成
                    </button>
                    <button className="btn-danger" onClick={handleAbandon}>
                      放棄接單
                    </button>
                  </>
                )}
              {ticket.status === TicketStatus.COMPLETED &&
                hasPermission(Permission.VERIFY_TICKETS) && (
                  <>
                    <button
                      className="btn-primary"
                      onClick={() =>
                        updateTicketStatus(
                          TicketStatus.VERIFIED,
                          '工單驗收通過'
                        )
                      }
                    >
                      驗收通過
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() =>
                        updateTicketStatus(
                          TicketStatus.VERIFICATION_FAILED,
                          '工單驗收失敗'
                        )
                      }
                    >
                      驗收失敗
                    </button>
                  </>
                )}
            </div>
          </div>

          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              工單內容
            </h3>
            <div className="max-w-none whitespace-pre-line text-gray-800 leading-relaxed">
              <p>{ticket.description}</p>
            </div>
          </div>

          <PermissionGuard required={Permission.VIEW_REPORTS}>
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                相關通報
              </h3>
              {ticket.reports && ticket.reports.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {ticket.reports.map((ticketReport: any) => (
                    <li
                      key={ticketReport.report.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-blue-700 text-base break-words">
                          {ticketReport.report.title}
                        </p>
                        <p className="text-gray-600 text-sm mt-0.5 break-all">
                          通報 #{ticketReport.report.id}
                        </p>
                        <p className="text-gray-600 text-sm mt-0.5 break-all">
                          地區: {ticketReport.report.location?.name || 'N/A'}
                        </p>
                      </div>
                      <Link
                        href={`/reports/${ticketReport.report.id}`}
                        className="text-blue-600 hover:underline text-sm mt-2 sm:mt-0 sm:ml-4 flex-shrink-0"
                      >
                        查看
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-gray-600 text-sm">目前尚無相關通報</div>
              )}
            </div>
          </PermissionGuard>

          {ticket.attachments && ticket.attachments.length > 0 && (
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                上傳的檔案
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {ticket.attachments.map((file: any) => (
                  <div key={file.id} className="w-full">
                    {file.fileType.startsWith('image') ? (
                      <>
                        <img
                          src={file.url}
                          alt={file.filename}
                          className="rounded-md shadow-sm border border-gray-200 w-full h-32 object-cover cursor-pointer transition-transform hover:scale-105"
                          onClick={() => setPreviewImage(file.url)}
                        />
                        <div className="text-xs text-gray-600 mt-1 truncate">
                          {file.filename}
                        </div>
                      </>
                    ) : file.fileType.startsWith('video') ? (
                      <>
                        <video
                          src={file.url}
                          controls
                          className="rounded-md shadow-sm border border-gray-200 w-full h-32 object-cover"
                        />
                        <div className="text-xs text-gray-600 mt-1 truncate">
                          {file.filename}
                        </div>
                      </>
                    ) : (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {file.filename}
                      </a>
                    )}
                  </div>
                ))}
              </div>
              {previewImage && (
                <div
                  className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
                  onClick={() => setPreviewImage(null)}
                >
                  <img
                    src={previewImage}
                    alt="預覽"
                    className="max-h-[80vh] max-w-[90vw] rounded-lg shadow-lg border-4 border-white"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    className="absolute top-4 right-4 text-white text-4xl font-bold"
                    onClick={() => setPreviewImage(null)}
                  >
                    &times;
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              處理歷程
            </h3>
            {ticket.activityLogs && ticket.activityLogs.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {(showAllActivityLogs
                  ? ticket.activityLogs
                  : ticket.activityLogs.slice(0, 5)
                ).map((log: any) => (
                  <li key={log.id} className="py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 break-words">
                        <span className="font-medium">
                          {log.user?.name || '系統'}
                        </span>
                        {log.content}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {formatDate(log.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-500 text-sm">沒有歷程記錄</div>
            )}
            {ticket.activityLogs && ticket.activityLogs.length > 5 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAllActivityLogs(!showAllActivityLogs)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {showAllActivityLogs ? '收合' : '顯示更多'}
                </button>
              </div>
            )}
          </div>

          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              審核記錄
            </h3>
            {ticket.ticketReviews && ticket.ticketReviews.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {ticket.ticketReviews.map((review: any) => (
                  <li
                    key={review.id}
                    className="py-3 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-sm text-gray-800">
                        <span className="font-medium">
                          {review.creator.name}
                        </span>{' '}
                        提交了審核
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {formatDate(review.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedReview(review)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                    >
                      查看詳情
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                        />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-500 text-sm">沒有審核記錄</div>
            )}
          </div>

          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              留言 ({ticket.comments ? ticket.comments.length : 0})
            </h3>

            <div className="space-y-4 mb-6">
              {ticket.comments && ticket.comments.length > 0 ? (
                ticket.comments.map((comment: any) => (
                  <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium text-gray-900">
                        {comment.user?.name || '未知用戶'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(comment.createdAt)}
                      </p>
                    </div>
                    <div className="mt-2 text-sm text-gray-700 whitespace-pre-line">
                      {comment.content}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-600 text-sm py-4">
                  尚無留言
                </p>
              )}
            </div>

            <form
              onSubmit={handleAddComment}
              className="flex items-end space-x-2"
            >
              <textarea
                className="flex-1 border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                rows={2}
                placeholder="輸入留言..."
                value={newCommentContent}
                onChange={(e) => setNewCommentContent(e.target.value)}
              />
              <button type="submit" className="btn-primary">
                發佈
              </button>
            </form>
          </div>
        </div>
      </div>

      {isReviewFormOpen && (
        <TicketReviewForm
          onSubmit={handleReviewSubmit}
          onCancel={() => setIsReviewFormOpen(false)}
          uploadFunction={ticketReviewUploadFunction}
        />
      )}

      {selectedReview && (
        <TicketReviewDetailModal
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
        />
      )}
    </>
  );
}
