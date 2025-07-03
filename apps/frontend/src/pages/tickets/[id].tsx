import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { TicketStatus, TicketPriority } from 'shared-types';
import ticketService from '../../services/ticketService';

export default function TicketDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any>(null);
  const [newCommentContent, setNewCommentContent] = useState('');
  
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

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentContent.trim() || !ticket?.id) return;

    try {
      await ticketService.addCommentToTicket(
        ticket.id,
        newCommentContent
      );
      setNewCommentContent('');
      // 重新獲取更新後的工單資料
      const updatedTicket = await ticketService.getTicketById(ticket.id);
      setTicket(updatedTicket);
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('新增留言失敗，請稍後再試');
    }
  };

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
                  {getStatusText(ticket.status)}
                </span>
                <span className="text-sm text-gray-500">
                  #{ticket.id.substring(0, 8)}
                </span>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">報告人</h3>
                <p className="mt-1">{ticket.reporter?.name || '未指定'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">處理人</h3>
                <p className="mt-1">{ticket.assignee?.name || '未指定'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">創建時間</h3>
                <p className="mt-1">{formatDate(ticket.createdAt)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">更新時間</h3>
                <p className="mt-1">{formatDate(ticket.updatedAt)}</p>
              </div>
            </div>
          </div>
          
          {/* 工單內容 */}
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-medium text-gray-900 mb-4">工單內容</h3>
            <div className="prose max-w-none">
              <p>{ticket.description}</p>
            </div>
          </div>

          {/* 相關通報區塊 */}
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-medium text-gray-900 mb-4">相關通報</h3>
            {ticket.reports && ticket.reports.length > 0 ? (
              <ul className="divide-y divide-gray-100 mb-4">
                {ticket.reports.map((ticketReport) => (
                  <li key={ticketReport.report.id} className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-blue-700 text-sm break-words">{ticketReport.report.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5 break-all">通報 #{ticketReport.report.id}</p>
                    </div>
                    <Link href={`/reports/${ticketReport.report.id}`} className="text-blue-600 hover:underline text-sm mt-2 sm:mt-0 sm:ml-4 flex-shrink-0">查看</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-500 mb-4">目前尚無相關通報</div>
            )}
            </div>
          
          {/* 留言區塊 */}
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">留言 ({ticket.comments ? ticket.comments.length : 0})</h3>
            
            {/* 留言列表 */}
            <div className="space-y-4 mb-6">
              {ticket.comments && ticket.comments.length > 0 ? (
                ticket.comments.map((comment: any) => (
                  <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium text-gray-900">{comment.user?.name || '未知用戶'}</p>
                      <p className="text-xs text-gray-500">{formatDate(comment.createdAt)}</p>
                    </div>
                    <div className="mt-2 text-sm text-gray-700 whitespace-pre-line">
                      {comment.content}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">尚無留言</p>
              )}
            </div>

            {/* 新增留言輸入框 */}
            <form onSubmit={handleAddComment} className="flex items-end space-x-2">
              <textarea
                className="flex-1 border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
    </>
  );
}
