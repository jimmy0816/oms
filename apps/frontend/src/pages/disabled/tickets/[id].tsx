import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { 
  ArrowLeftIcon,
  ChatBubbleLeftIcon,
  PencilSquareIcon,
  UserCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { TicketStatus, TicketPriority, TicketPermission, UserRole, Ticket } from 'shared-types';
import ticketService from '../../services/ticketService';

// 定義活動記錄類型
interface ActivityLog {
  id: string;
  type: 'CREATE' | 'UPDATE_STATUS' | 'COMMENT' | 'ASSIGN' | 'UPDATE' | 'CLAIM_WORK_ORDERS' | 'COMPLETE_OR_FAIL_WORK_ORDERS' | 'VERIFY_ORDERS';
  timestamp: string;
  user: {
    id: string;
    name: string;
    role?: string;
  };
  details: {
    [key: string]: any;
  };
}

export default function TicketDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any>(null);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // 從 API 獲取工單詳情
  useEffect(() => {
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
    
    fetchTicket();
  }, [id]);

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case TicketStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800';
      case TicketStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case TicketStatus.FAILED:
        return 'bg-red-100 text-red-800';
      case TicketStatus.VERIFIED:
        return 'bg-emerald-100 text-emerald-800';
      case TicketStatus.VERIFICATION_FAILED:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.LOW:
        return 'bg-green-100 text-green-800';
      case TicketPriority.MEDIUM:
        return 'bg-blue-100 text-blue-800';
      case TicketPriority.HIGH:
        return 'bg-orange-100 text-orange-800';
      case TicketPriority.URGENT:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  
  // 取得狀態文字說明
  const getStatusText = (status: string) => {
    switch(status) {
      case TicketStatus.PENDING:
        return '待接單';
      case TicketStatus.IN_PROGRESS:
        return '處理中';
      case TicketStatus.COMPLETED:
        return '已完成';
      case TicketStatus.FAILED:
        return '無法完成';
      case TicketStatus.VERIFIED:
        return '驗收通過';
      case TicketStatus.VERIFICATION_FAILED:
        return '驗收不通過';
      default:
        return status;
    }
  };

  const hasPermission = (permission: TicketPermission, userRole: string = 'REPORT_PROCESSOR') => {
    // 假設當前用戶角色為 REPORT_PROCESSOR
    const currentUserRole = userRole as UserRole;
    
    // 管理員有所有權限
    if (currentUserRole === UserRole.ADMIN) return true;
    
    // 根據工單狀態和權限檢查
    switch(permission) {
      case TicketPermission.VIEW_ORDERS:
        return [UserRole.REPORT_PROCESSOR, UserRole.REPORT_REVIEWER, UserRole.MANAGER].includes(currentUserRole);
      case TicketPermission.CREATE_WORK_ORDERS:
        return [UserRole.REPORT_PROCESSOR, UserRole.CUSTOMER_SERVICE, UserRole.MANAGER].includes(currentUserRole);
      case TicketPermission.CLAIM_WORK_ORDERS:
        return [UserRole.MAINTENANCE_WORKER].includes(currentUserRole) && ticket?.status === TicketStatus.PENDING;
      case TicketPermission.COMPLETE_OR_FAIL_WORK_ORDERS:
        return [UserRole.MAINTENANCE_WORKER].includes(currentUserRole) && ticket?.status === TicketStatus.IN_PROGRESS;
      case TicketPermission.VERIFY_ORDERS:
        return [UserRole.REPORT_PROCESSOR, UserRole.MANAGER].includes(currentUserRole) && 
               (ticket?.status === TicketStatus.COMPLETED || ticket?.status === TicketStatus.FAILED);
      default:
        return false;
    }
  };

  const handleStatusChange = (newStatus: TicketStatus, actionType: string) => {
    if (!ticket) return;

    // 創建活動記錄
    const activityLog = {
      id: `activity-${Date.now()}`,
      type: actionType,
      timestamp: new Date().toISOString(),
      user: { id: '3', name: '系統管理員', role: 'REPORT_PROCESSOR' },
      details: { previousStatus: ticket.status, newStatus }
    };
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    // 確保 newComment 存在並且不為空
    if (!newComment?.trim() || !ticket) return;
    
    setSubmittingComment(true);
    
    try {
      // 調用 API 添加評論
      // 在實際應用中，userId 應該從用戶會話中獲取
      const userId = '1'; // 模擬當前用戶 ID
      
      await ticketService.addCommentToTicket(ticket.id, newComment, userId);
      
      // 重新獲取工單詳情以獲取最新的評論
      const updatedTicket = await ticketService.getTicketById(ticket.id);
      setTicket(updatedTicket);
      setNewComment('');
    } catch (error) {
      console.error('添加評論時出錯:', error);
    } finally {
      setSubmittingComment(false);
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
        <h2 className="text-xl font-medium text-gray-900">找不到工單</h2>
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
      
      <div className="space-y-6">
        {/* 頁面標題與返回按鈕 */}
        <div className="flex items-center">
          <Link href="/tickets" className="mr-4 p-2 rounded-full hover:bg-gray-100">
            <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 truncate">{ticket.title}</h1>
        </div>
        
        {/* 工單詳情卡片 */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {/* 工單頭部資訊 */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                  {ticket.status === TicketStatus.PENDING && '待接單'}
                  {ticket.status === TicketStatus.IN_PROGRESS && '處理中'}
                  {ticket.status === TicketStatus.COMPLETED && '已完成'}
                  {ticket.status === TicketStatus.FAILED && '無法完成'}
                  {ticket.status === TicketStatus.VERIFIED && '驗收通過'}
                  {ticket.status === TicketStatus.VERIFICATION_FAILED && '驗收不通過'}
                </span>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority}
                </span>
                <span className="text-sm text-gray-500">
                  工單 #{ticket.id}
                </span>
              </div>
              
              <div className="flex gap-2">
                
                <div className="mt-4 space-y-2">
              <h3 className="text-lg font-medium">工單操作</h3>
              <div className="flex flex-wrap gap-2">
                {/* 待接單狀態可以認領 */}
                {ticket.status === TicketStatus.PENDING && hasPermission(TicketPermission.CLAIM_WORK_ORDERS, 'MAINTENANCE_WORKER') && (
                  <button
                    onClick={() => handleStatusChange(TicketStatus.IN_PROGRESS, 'CLAIM_WORK_ORDERS')}
                    className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  >
                    認領工單
                  </button>
                )}
                
                {/* 處理中狀態可以標記完成或無法完成 */}
                {ticket.status === TicketStatus.IN_PROGRESS && hasPermission(TicketPermission.COMPLETE_OR_FAIL_WORK_ORDERS, 'MAINTENANCE_WORKER') && (
                  <>
                    <button
                      onClick={() => handleStatusChange(TicketStatus.COMPLETED, 'COMPLETE_OR_FAIL_WORK_ORDERS')}
                      className="px-4 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700"
                    >
                      標記完成
                    </button>
                    <button
                      onClick={() => handleStatusChange(TicketStatus.FAILED, 'COMPLETE_OR_FAIL_WORK_ORDERS')}
                      className="px-4 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700"
                    >
                      無法完成
                    </button>
                  </>
                )}
                
                {/* 只有已完成狀態可以驗收 */}
                {ticket.status === TicketStatus.COMPLETED && 
                 hasPermission(TicketPermission.VERIFY_ORDERS, 'REPORT_PROCESSOR') && (
                  <>
                    <button
                      onClick={() => handleStatusChange(TicketStatus.VERIFIED, 'VERIFY_ORDERS')}
                      className="px-4 py-2 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      驗收通過
                    </button>
                    <button
                      onClick={() => handleStatusChange(TicketStatus.VERIFICATION_FAILED, 'VERIFY_ORDERS')}
                      className="px-4 py-2 text-sm font-medium rounded-md bg-orange-600 text-white hover:bg-orange-700"
                    >
                      驗收不通過
                    </button>
                  </>
                )}
                
                {/* 顯示當前狀態 */}
                <div className="px-4 py-2 text-sm font-medium rounded-md bg-gray-100">
                  當前狀態: {
                    ticket.status === TicketStatus.PENDING ? '待接單' :
                    ticket.status === TicketStatus.IN_PROGRESS ? '處理中' :
                    ticket.status === TicketStatus.COMPLETED ? '已完成' :
                    ticket.status === TicketStatus.FAILED ? '無法完成' :
                    ticket.status === TicketStatus.VERIFIED ? '驗收通過' :
                    ticket.status === TicketStatus.VERIFICATION_FAILED ? '驗收不通過' :
                    ticket.status
                  }
                </div>
              </div>
            </div>
              </div>
            </div>
            
            {/* 工單詳細資訊 */}
            <div className="mt-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">描述</h3>
                <p className="mt-1 text-gray-900 whitespace-pre-line">{ticket.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">建立者</h3>
                  <div className="flex items-center space-x-2">
                  <div className="flex-shrink-0">
                    <UserCircleIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">{ticket.creator?.name || '未知用戶'}</p>
                </div>
                <div className="flex items-center">
                  {ticket.assignee ? (
                    <span className="text-sm text-gray-500">
                      處理人: {ticket.assignee?.name || '未知用戶'}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500">未指派</span>
                  )}
                </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">建立時間</h3>
                  <div className="mt-1 flex items-center">
                    <div className="flex items-center space-x-2">
                  <ClockIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {new Date(ticket.createdAt as string).toLocaleDateString('zh-TW', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">最後更新</h3>
                  <div className="mt-1 flex items-center">
                    <div className="flex-shrink-0">
                      <ClockIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <p className="ml-2 text-sm text-gray-900">{formatDate(ticket.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 附件區塊 */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 mb-4">附件 ({ticket.attachments.length})</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {ticket.attachments.map((attachment: any) => (
                  <div key={attachment.id} className="relative group border rounded-md overflow-hidden">
                    {attachment.type === 'image' ? (
                      <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="h-32 w-full object-cover"
                        />
                      </a>
                    ) : (
                      <div className="h-32 w-full bg-gray-100 flex items-center justify-center">
                        <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span className="sr-only">{attachment.name}</span>
                        </a>
                      </div>
                    )}
                    <div className="p-1 bg-white text-xs truncate">
                      {attachment.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 活動記錄區塊 */}
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-medium text-gray-900 mb-4">活動記錄</h3>
            
            <div className="space-y-4">
              {ticket.activityLogs && ticket.activityLogs.length > 0 ? (
                <div className="relative">
                  <div className="absolute top-0 bottom-0 left-2.5 w-0.5 bg-gray-200"></div>
                  <ul className="space-y-6">
                    {ticket.activityLogs.map((activity: ActivityLog) => (
                      <li key={activity.id} className="relative pl-10">
                        <div className="absolute left-0 top-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-blue-100">
                          {activity.type === 'CREATE' && (
                            <DocumentTextIcon className="h-3 w-3 text-blue-600" />
                          )}
                          {(activity.type === 'UPDATE_STATUS' || activity.type === 'CLAIM_WORK_ORDERS' || 
                            activity.type === 'COMPLETE_OR_FAIL_WORK_ORDERS' || activity.type === 'VERIFY_ORDERS') && (
                            <CheckCircleIcon className="h-3 w-3 text-blue-600" />
                          )}
                          {activity.type === 'COMMENT' && (
                            <ChatBubbleLeftIcon className="h-3 w-3 text-blue-600" />
                          )}
                          {activity.type === 'ASSIGN' && (
                            <UserCircleIcon className="h-3 w-3 text-blue-600" />
                          )}
                          {activity.type === 'UPDATE' && (
                            <PencilSquareIcon className="h-3 w-3 text-blue-600" />
                          )}
                        </div>
                        
                        <div className="flex justify-between items-baseline">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {activity.user.name}
                              {activity.type === 'CREATE' && ' 建立了工單'}
                              {activity.type === 'UPDATE_STATUS' && ` 將狀態從 ${getStatusText(activity.details.previousStatus)} 更改為 ${getStatusText(activity.details.newStatus)}`}
                              {activity.type === 'CLAIM_WORK_ORDERS' && ' 認領了工單'}
                              {activity.type === 'COMPLETE_OR_FAIL_WORK_ORDERS' && 
                                (activity.details.newStatus === TicketStatus.COMPLETED ? ' 標記工單為已完成' : ' 標記工單為無法完成')}
                              {activity.type === 'VERIFY_ORDERS' && 
                                (activity.details.newStatus === TicketStatus.VERIFIED ? ' 驗收通過工單' : ' 驗收不通過工單')}
                              {activity.type === 'COMMENT' && ' 新增了留言'}
                              {activity.type === 'ASSIGN' && ` 將工單指派給 ${activity.details.assigneeName}`}
                              {activity.type === 'UPDATE' && ' 更新了工單'}
                            </p>
                            {activity.type === 'COMMENT' && (
                              <p className="mt-1 text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
                                {activity.details.content}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">{formatDate(activity.timestamp)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">尚無活動記錄</p>
              )}
            </div>
          </div>
          
          {/* 留言區塊 */}
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">留言 ({ticket.comments ? ticket.comments.length : 0})</h3>
            
            {/* 留言列表 */}
            <div className="space-y-4 mb-6">
              {ticket.comments.map((comment: any) => (
                <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <UserCircleIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <p className="ml-2 text-sm font-medium text-gray-900">{comment.user.name}</p>
                    </div>
                    <p className="text-xs text-gray-500">{formatDate(comment.createdAt)}</p>
                  </div>
                  <div className="mt-2 text-sm text-gray-700 whitespace-pre-line">
                    {comment.content}
                  </div>
                </div>
              ))}
              
              {ticket.comments.length === 0 && (
                <p className="text-center text-gray-500 py-4">尚無留言</p>
              )}
            </div>
            
            {/* 新增留言表單 */}
            <form onSubmit={handleSubmitComment}>
              <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="新增留言..."
                  rows={3}
                  className="block w-full border-0 resize-none focus:ring-0 sm:text-sm p-3"
                />
                <div className="bg-gray-50 px-3 py-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={!newComment.trim() || submittingComment}
                    className="btn-primary flex items-center text-sm"
                  >
                    {submittingComment ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        處理中...
                      </>
                    ) : (
                      <>
                        <ChatBubbleLeftIcon className="h-4 w-4 mr-2" />
                        送出留言
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
